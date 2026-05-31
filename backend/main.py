"""
FOOD FOR ANY MOOD — FastAPI backend

Local development:
  cd backend
  pip install -r requirements.txt
  cp .env.example .env          # then add your real GEMINI_API_KEY
  uvicorn main:app --reload --host 127.0.0.1 --port 8010

Production (Render):
  uvicorn main:app --host 0.0.0.0 --port $PORT

API keys stay in backend environment variables only — never in the frontend.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import logging
import os
import random
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from ingredient_relevance import (
    MIN_INGREDIENT_MATCH_RATIO,
    build_ingredient_fallback_recipe,
    parse_user_ingredients,
)
from nutrition_coach import (
    NutritionAnalysisRequest,
    NutritionAnalysisResponse,
    analyze_nutrition_with_fallback,
)
from recipe_ideas import (
    MoreRecipeIdeasRequest,
    MoreRecipeIdeasResponse,
    generate_recipe_ideas_with_fallback,
)
from analyze_ingredients_image import (
    AnalyzeIngredientsImageResponse,
    analyze_uploaded_image,
)
from recipe_ingredient_parser import (
    apply_recipe_ingredient_parser,
    is_recipe_acceptable,
)
from recipe_quality import (
    is_invalid_recipe_selection,
    log_quality_rejections,
    log_recipe_validation,
    validateRecipeCategory,
    validateRecipeType,
    validate_gemini_recipe_quality,
)
from pydantic import BaseModel, Field, ValidationError

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini client — key loaded from backend/.env (see .env.example)
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
GEMINI_TIMEOUT_SECONDS = 15

gemini_client: genai.Client | None = None
if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
else:
    logger.warning(
        "GEMINI_API_KEY is missing or still a placeholder — "
        "POST /generate-recipe will use the Hebrew mock fallback."
    )

app = FastAPI(
    title="FOOD FOR ANY MOOD API",
    description="Recipe generation backend powered by Gemini (with mock fallback).",
    version="0.2.0",
)

# ---------------------------------------------------------------------------
# CORS — localhost dev + Vercel production + optional MVP open access
# ---------------------------------------------------------------------------
DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

_extra_origins = os.getenv("CORS_ORIGINS", "")
CORS_ORIGINS = DEFAULT_CORS_ORIGINS + [
    origin.strip() for origin in _extra_origins.split(",") if origin.strip()
]

# Matches Vercel production and preview URLs, e.g. https://my-app.vercel.app
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app")

# MVP public launch: set CORS_ALLOW_ALL=true on Render for easiest access.
# TODO: disable this and restrict CORS_ORIGINS to your Vercel domain before scaling.
CORS_ALLOW_ALL = os.getenv("CORS_ALLOW_ALL", "false").lower() in {"1", "true", "yes"}

if CORS_ALLOW_ALL:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_origin_regex=CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def log_incoming_requests(request, call_next):
    """Print every incoming request for local debugging."""
    origin = request.headers.get("origin", "-")
    print(
        f"[FOOD FOR ANY MOOD] Incoming {request.method} {request.url.path} "
        f"(origin={origin})"
    )

    if request.method == "POST" and request.url.path in {"/generate-recipe", "/recipes/generate"}:
        body_bytes = await request.body()
        print(
            "[FOOD FOR ANY MOOD] Request body:",
            body_bytes.decode("utf-8", errors="replace"),
        )

        async def receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}

        request = Request(request.scope, receive)

    response = await call_next(request)
    print(f"[FOOD FOR ANY MOOD] Response status: {response.status_code}")
    return response


# ---------------------------------------------------------------------------
# Request / response models (match frontend GeneratedRecipe contract)
# ---------------------------------------------------------------------------
Category = Literal["dairy", "meat", "parve"]
MusicPlatform = Literal["spotify", "youtube"]
Mood = Literal["happy", "cozy", "energetic", "relaxed", "adventurous", "comfort"]
ServingsCount = Literal[1, 2, 4, 6, 8]
RecipeType = Literal["meal", "dessert"]


class GenerateRecipeRequest(BaseModel):
    category: Category
    ingredients: str = ""
    cookingTime: int = Field(default=30, ge=5, le=180)
    mood: Mood = "cozy"
    isGlutenFree: bool = False
    musicPlatform: MusicPlatform = "spotify"
    servings: ServingsCount = 4
    recipeType: RecipeType = "meal"


class Nutrition(BaseModel):
    calories: int
    protein: int
    carbs: int
    fat: int
    servings: int


class Playlist(BaseModel):
    id: str
    name: str
    description: str
    energy: str
    energyLabel: str
    platform: MusicPlatform
    url: str
    matchPercent: int


class GeneratedRecipe(BaseModel):
    name: str
    description: str
    ingredients: list[str]
    steps: list[str]
    matchPercentage: int
    spiceLevel: int
    nutrition: Nutrition
    healthScore: int
    tags: list[str]
    playlist: Playlist


class GenerateRecipeResponse(BaseModel):
    recipe: GeneratedRecipe
    source: Literal["gemini", "mock"]
    geminiError: str | None = None


# ---------------------------------------------------------------------------
# Gemini structured JSON schema (exact shape returned by the model)
# ---------------------------------------------------------------------------
class GeminiNutrition(BaseModel):
    calories: int
    protein: int
    carbs: int
    fat: int


class GeminiPlaylistOutput(BaseModel):
    title: str
    description: str
    platform: str
    url: str


class GeminiRecipeOutput(BaseModel):
    name: str
    description: str
    ingredients: list[str]
    steps: list[str]
    matchPercentage: int
    spiceLevel: int
    nutrition: GeminiNutrition
    healthScore: int
    tags: list[str]
    playlist: GeminiPlaylistOutput


# ---------------------------------------------------------------------------
# Mock recipe templates (Hebrew fallback when Gemini is unavailable)
# ---------------------------------------------------------------------------
CATEGORY_RECIPES: dict[Category, dict] = {
    "dairy": {
        "name": "פסטה שמנת פטריות",
        "base_ingredients": ["פסטה", "שמנת מתוקה", "שום", "פטריות", "פרמזן", "חמאה"],
        "steps": [
            "מרתיחים סיר גדול עם מים מומלחים ומבשלים את הפסטה עד אל דנטה.",
            "מקפיצים שום ופטריות בחמאה עד הזהבה.",
            "מוסיפים שמנת ומבשלים בעדינות עד שהרוטב מסמיך.",
            "מערבבים את הפסטה עם הרוטב ופרמזן.",
            "מגישים מיד עם פלפל שחור גרוס.",
        ],
        "calories": 485,
        "protein": 17,
        "carbs": 54,
        "fat": 22,
        "spiceLevel": 0,
        "healthScore": 62,
        "tags": ["comfortFood"],
    },
    "meat": {
        "name": "קציצות בשר ביתיות",
        "base_ingredients": ["בשר בקר טחון", "בצל", "שום", "ביצה", "עגבניות", "שמן זית"],
        "steps": [
            "מערבבים בשר, בצל, שום, ביצה, מלח ופלפל עד תערובת דביקה.",
            "יוצרים קציצות בגודל אחיד.",
            "מחממים שמן במחבת וצורבים את הקציצות מכל הצדדים.",
            "מוסיפים רוטב עגבניות ומבשלים על אש נמוכה.",
            "מגישים חם עם עשבי תיבול טריים.",
        ],
        "calories": 410,
        "protein": 28,
        "carbs": 30,
        "fat": 20,
        "spiceLevel": 1,
        "healthScore": 66,
        "tags": ["highProtein", "comfortFood"],
    },
    "parve": {
        "name": "מוקפץ ירקות מהיר",
        "base_ingredients": ["טופו", "ברוקולי", "פלפל גמבה", "שום", "ג׳ינג׳ר", "רוטב סויה"],
        "steps": [
            "מייבשים וחותכים את הטופו לקוביות.",
            "מחממים מחבת או ווק על אש גבוהה.",
            "מוקפצים ירקות עם שום וג׳ינג׳ר עד שהם עדיין פריכים.",
            "מוסיפים טופו ורוטב סויה, מערבבים עד ציפוי מבריק.",
            "מגישים מיד על אורז מאודה.",
        ],
        "calories": 330,
        "protein": 19,
        "carbs": 24,
        "fat": 18,
        "spiceLevel": 2,
        "healthScore": 84,
        "tags": ["healthy", "quick", "vegetarian"],
    },
}

DESSERT_CATEGORY_RECIPES: dict[Category, dict] = {
    "dairy": {
        "name": "קינוח גבינה",
        "base_ingredients": ["גבינת שמנת", "סוכר", "ביצים", "וניל", "חמאה", "עוגיות"],
        "steps": [
            "טוחנים עוגיות לפירורים ומערבבים עם חמאה מומסת. לוחצים לתחתית תבנית.",
            "מערבבים גבינת שמנת, סוכר, ביצים ווניל עד תערובת חלקה.",
            "יוצקים על בסיס העוגיות ומעבירים למקרר לקירור של לפחות 4 שעות.",
            "מקשטים בפירות יער או רוטב פירות לפני ההגשה.",
            "מגישים קר ומתוק.",
        ],
        "calories": 420,
        "protein": 9,
        "carbs": 38,
        "fat": 26,
        "spiceLevel": 0,
        "healthScore": 58,
        "tags": ["comfortFood"],
    },
    "meat": {
        "name": "תפוחים אפויים בדבש",
        "base_ingredients": ["תפוחים", "דבש", "קינמון", "לימון", "סוכר"],
        "steps": [
            "חותכים תפוחים לחצאים ומסירים גרעינים.",
            "מערבבים דבש, קינמון, מיץ לימון וסוכר.",
            "מסדרים את התפוחים בתבנית ומוזקים את התערובת המתוקה.",
            "אופים בתנור ב-180°C כ-25 דקות עד רכות וקרמל.",
            "מגישים חמים כקינוח פרווה אחרי ארוחת בשר.",
        ],
        "calories": 280,
        "protein": 2,
        "carbs": 52,
        "fat": 8,
        "spiceLevel": 0,
        "healthScore": 70,
        "tags": ["healthy"],
    },
    "parve": {
        "name": "עוגיות מהירות",
        "base_ingredients": ["קמח", "סוכר", "אבקת קקאו", "שמן", "וניל", "אבקת אפייה"],
        "steps": [
            "מערבבים קמח, סוכר, קקאו ואבקת אפייה בקערה.",
            "מוסיפים שמן, וניל ומעט מים — עד לבצק דביק.",
            "יוצרים כדורים קטנים ומגלגלים בקמח נוסף.",
            "אופים בתנור ב-175°C כ-12 דקות.",
            "מקררים מעט ומגישים כקינוח פרווה.",
        ],
        "calories": 190,
        "protein": 3,
        "carbs": 28,
        "fat": 8,
        "spiceLevel": 0,
        "healthScore": 55,
        "tags": ["comfortFood", "vegetarian"],
    },
}

CATEGORY_LABELS: dict[Category, str] = {
    "dairy": "חלבי",
    "meat": "בשרי",
    "parve": "פרווה",
}

MOOD_LABELS: dict[Mood, str] = {
    "happy": "שמח",
    "cozy": "נעים וחמים",
    "energetic": "אנרגטי",
    "relaxed": "רגוע",
    "adventurous": "הרפתקני",
    "comfort": "מנחם",
}

MOOD_DESCRIPTIONS: dict[Mood, str] = {
    "happy": "שמחים ומרוממים",
    "cozy": "חמים ומנחמים",
    "energetic": "נועזים ומלאי אנרגיה",
    "relaxed": "רגועים ומאוזנים",
    "adventurous": "מלאי אופי וגיוון",
    "comfort": "מספקים ומוכרים",
}

RECIPE_TYPE_LABELS: dict[RecipeType, str] = {
    "meal": "ארוחה",
    "dessert": "קינוח",
}

PLAYLIST_PRESETS: dict[MusicPlatform, dict] = {
    "spotify": {
        "id": "soft-jazz-kitchen",
        "name": "ג'אז רך למטבח",
        "description": "צלילים חלקים ונעימים — מושלם לבישול רגוע ואינטימי",
        "query": "soft jazz cooking kitchen playlist",
    },
    "youtube": {
        "id": "morning-sunshine",
        "name": "אור בוקר",
        "description": "POP עליז וקליל — אנרגיה טובה להתחלת יום במטבח",
        "query": "upbeat morning kitchen music",
    },
}



def _build_playlist(platform: MusicPlatform, match_percent: int | None = None) -> Playlist:
    preset = PLAYLIST_PRESETS[platform]
    encoded = preset["query"].replace(" ", "%20")
    if platform == "youtube":
        url = f"https://www.youtube.com/results?search_query={encoded}"
    else:
        url = f"https://open.spotify.com/search/{encoded}"

    return Playlist(
        id=preset["id"],
        name=preset["name"],
        description=preset["description"],
        energy="medium",
        energyLabel="אנרגיה בינונית",
        platform=platform,
        url=url,
        matchPercent=match_percent if match_percent is not None else random.randint(82, 96),
    )


def _build_gemini_prompt(payload: GenerateRecipeRequest, *, strict: bool = False) -> str:
    category_label = CATEGORY_LABELS[payload.category]
    mood_label = MOOD_LABELS[payload.mood]
    gluten_note = "כן — המתכון חייב להיות ללא גלוטן" if payload.isGlutenFree else "לא"
    user_ingredients = parse_user_ingredients(payload.ingredients)
    ingredients_note = payload.ingredients.strip() or "לא צוינו — הציע מרכיבים מתאימים"

    ingredient_rules = ""
    if user_ingredients:
        ingredient_list = ", ".join(user_ingredients)
        threshold = int(MIN_INGREDIENT_MATCH_RATIO * 100)
        strict_note = (
            "\n⚠️ ניסיון קודם לא עמד בדרישות — חובה לעמוד בכל הכללים הבאים ללא חריגים:\n"
            if strict
            else ""
        )
        if strict and payload.recipeType == "dessert":
            strict_note += (
                "⚠️ המתכון הקודם נדחה — סוג מתכון: קינוח בלבד.\n"
                "- שם המנה חייב לכלול מילת קינוח (עוגה, עוגיות, קינוח, מוס, בראוניז, גלידה וכו').\n"
                "- אסור לחלוטין: תבשיל, תבשיל ביתי, מרק, פסטה, סלט, שקשוקה, עוף, בשר, מנה עיקרית.\n"
            )
        elif strict and payload.recipeType == "meal":
            strict_note += (
                "⚠️ המתכון הקודם נדחה — סוג מתכון: ארוחה בלבד.\n"
                "- אסור: עוגה, עוגיות, קינוח, מוס, בראוניז, מאפינים, גלידה, מתוקים.\n"
            )
        ingredient_rules = f"""
{strict_note}כללי מרכיבים (חובה מוחלטת — עדיפות על קטגוריה ומצב רוח):
- המשתמש ציין מרכיבים: {ingredient_list}
- לפחות {threshold}% מהמרכיבים האלה חייבים להופיע ברשימת המרכיבים של המתכון.
- שם המנה חייב לכלול לפחות אחד מהמרכיבים שציין המשתמש (בעברית, כפי שהזין או בניסוח קרוב).
- אל תציע מנה גנרית לפי קטגוריה/מצב רוח בלבד — המרכיבים הם הבסיס למנה.
- אם השילוב לא מתאים לחלוטין, הסבר בקצרה בתיאור והשתמש ברוב המרכיבים האפשריים.
- מרכיבים שלא בשימוש — אל תכלול אותם ברשימה; הסבר בתיאור אם נאלצת לוותר על חלקם.
- כל שמות המרכיבים חייבים להיות בעברית בלבד (למשל "שמן זית" ולא "Olive" או "Olive oil").
- כל מרכיב ברשימה חייב להופיע במפורש באחד משלבי ההכנה.
- הפרד מרכיבים לפריטים נפרדים — אל תמזג כמה מרכיבים לשורה אחת.
"""

    title_rules = """
כללי שם המנה (חובה — שם מנה אמיתית בלבד):
- שם המנה מתאר את האוכל: מרכיבים עיקריים וסגנון בישול.
- מצב רוח משפיע רק על התיאור, התיבול והפלייליסט — לעולם לא על שם המנה.
- דוגמאות טובות: "שקשוקה מהירה", "חביתת עגבניות", "פסטה ברוטב שמנת", "סלט טונה וביצים".
- דוגמאות אסורות: "ארוחת נרות", "ארוחת נוחות", "ערב רומנטי", "וייב חמים", "מנה נעימה".
- אסור: ארוחת, ערב, וייב, נוחות, רומנטי, נעים, אנרגטי, רגוע, מצב רוח — בשם המנה.
"""

    quantity_rules = f"""
כללי כמויות (חובה):
- לכל מרכיב חייבת להיות כמות ריאלית ויחידת מידה: whole item, tsp, tbsp, gram, ml, cup.
- הכמויות חייבות להתאים בדיוק ל-{payload.servings} מנות.
- שלבי ההכנה חייבים להזכיר את אותן כמויות כמו ברשימת המרכיבים.
- דוגמה ל-{payload.servings} מנות: כמויות מוגדלות/מוקטנות בהתאם (למשל 6 מנות — כ-600g פסטה, 6 עגבניות).
"""

    recipe_type_label = RECIPE_TYPE_LABELS[payload.recipeType]
    type_priority = (
        f"סוג המתכון הוא {recipe_type_label} ({payload.recipeType}) — זו דרישה עליונה. "
        f"אסור להחזיר מתכון מסוג אחר."
    )

    meal_rules = ""
    if payload.recipeType == "meal":
        meal_rules = """
כללי ארוחה (חובה — סוג מתכון: ארוחה / מנה עיקרית):
- המתכון חייב להיות ארוחה או מנה עיקרית מלוחה/מנחמת — לא קינוח, לא עוגה, לא מוס, לא סורבה.
- אסור: עוגה, עוגיות, קינוח, מוס, טירמיסו, בראוניז, גלידה, עוגת גבינה, מתוק לקינוח.
- שלבי ההכנה בסגנון בישול: חימום, טיגון, בישול, אפייה מלוחה, הגשה חמה/מנה עיקרית.
- אם המשתמש ציין מרכיבים — בנה מנה עיקרית סביבם, לא קינוח.
- אל תמציא מנה גנרית שלא קשורה למרכיבים, למצב הרוח, לקטגוריה או לזמן.
"""

    dessert_rules = ""
    if payload.recipeType == "dessert":
        dessert_rules = """
כללי קינוח (חובה — סוג מתכון: קינוח):
- המתכון חייב להיות קינוח בלבד — לא מנה עיקרית, לא ארוחה מלוחה, לא שקשוקה, לא סלט, לא מרק.
- אסור: שקשוקה, פסטה מלוחה, עוף בתנור, סלט, מוקפץ, תבשיל עיקרי.
- השתמש במרכיבים מתוקים: סוכר, דבש, שוקולד, פירות, קמח, שמנת, חמאה, וניל, קינמון.
- שלבי ההכנה בסגנון קינוח: ערבוב, אפייה מתוקה, קירור, קישוט, הגשה.
- spiceLevel חייב להיות 0 (קינוחים אינם חריפים).
- שם המנה חייב לשקף קינוח (עוגה, עוגיות, מוס, טרifle, סורבה, פנקייק מתוק וכו').
- אם המשתמש ציין מרכיבים — שלב אותם בהקשר מתוק ומתאים לקינוח.
- אל תמציא קינוח שלא קשור למרכיבים או לדרישות המשתמש.
"""

    kosher_rules = f"""
כללי כשרות (חובה — קטגוריה: {category_label}):
- dairy: אסור בשר, עוף, כבש, הודו, נקניק, קבב, סטייק.
- meat: אסור חלב, גבינה, שמנת, חמאה, יוגורט, קוטג', פרמזן.
- parve: אסור גם בשר/עוף וגם מוצרי חלב — רק פרווה.
- המרכיבים והשלבים חייבים לעמוד בקטגוריה שנבחרה: {payload.category}.
"""

    mood_time_rules = f"""
כללי מצב רוח, זמן ומנות (חובה):
- מצב רוח ({mood_label}): השפיע על תיאור, תיבול ופלייליסט — לא על סוג המנה ({recipe_type_label}).
- זמן הכנה מקסימלי: {payload.cookingTime} דקות — כל שלבי ההכנה חייבים להיות ריאליים בגבולות הזמן הזה.
- מספר מנות: {payload.servings} — כמויות חייבות להתאים בדיוק.
"""

    return f"""אתה שף ישראלי שמייצר מתכונים לאפליקציה FOOD FOR ANY MOOD.
צור מתכון אחד מקורי בעברית בלבד (שם המנה, תיאור, מרכיבים, שלבים, תגיות, פלייליסט).

{type_priority}

העדפות המשתמש:
- קטגוריה: {category_label} ({payload.category})
- סוג מתכון: {recipe_type_label} ({payload.recipeType}) — חובה מוחלטת
- מצב רוח: {mood_label} ({payload.mood})
- זמן הכנה מקסימלי: {payload.cookingTime} דקות
- ללא גלוטן: {gluten_note}
- מרכיבים זמינים (בסיס המנה): {ingredients_note}
- מספר מנות: {payload.servings}
- פלטפורמת מוזיקה לפלייליסט: {payload.musicPlatform}
{ingredient_rules}{title_rules}{quantity_rules}{meal_rules}{dessert_rules}{kosher_rules}{mood_time_rules}
כללי תוכן:
- כל טקסט המתכון חייב להיות בעברית.
- שמות המרכיבים בשלבים וברשימה — בעברית בלבד, ללא מילים באנגלית.
- שם האפליקציה FOOD FOR ANY MOOD נשאר באנגלית — אל תתרגם אותו.
- התאם את המנה לקטגוריה, למצב הרוח ולזמן ההכנה — אך כשיש מרכיבים, הם קודמים לכל השאר.
- matchPercentage: 70–99 לפי התאמה למרכיבים ולהעדפות.
- spiceLevel: 0–3 (0=לא חריף, 3=חריף).
- nutrition: הערכה סבירה ל-{payload.servings} מנות; nutrition.servings חייב להיות {payload.servings}.
- healthScore: 0–100.
- tags: מערך קצר של תגיות (מחרוזות בעברית או מפתחות קצרים באנגלית).
- playlist.title ו-playlist.description בעברית; playlist.platform = "{payload.musicPlatform}";
  playlist.url = קישור חיפוש אמיתי ל-Spotify או YouTube המתאים למצב הרוח.

החזר JSON בלבד לפי הסכימה — ללא markdown וללא טקסט נוסף."""


def _normalize_gemini_recipe(
    gemini_recipe: GeminiRecipeOutput,
    payload: GenerateRecipeRequest,
) -> GeneratedRecipe:
    """Map Gemini JSON (playlist.title) to the frontend recipe contract (playlist.name)."""
    if gemini_recipe.playlist.platform in ("spotify", "youtube"):
        platform: MusicPlatform = gemini_recipe.playlist.platform  # type: ignore[assignment]
    else:
        platform = payload.musicPlatform

    playlist_url = gemini_recipe.playlist.url.strip()
    if not playlist_url.startswith("http"):
        playlist_url = _build_playlist(platform).url

    return GeneratedRecipe(
        name=gemini_recipe.name,
        description=gemini_recipe.description,
        ingredients=gemini_recipe.ingredients,
        steps=gemini_recipe.steps,
        matchPercentage=max(0, min(100, gemini_recipe.matchPercentage)),
        spiceLevel=max(0, min(3, gemini_recipe.spiceLevel)),
        nutrition=Nutrition(
            calories=max(0, gemini_recipe.nutrition.calories),
            protein=max(0, gemini_recipe.nutrition.protein),
            carbs=max(0, gemini_recipe.nutrition.carbs),
            fat=max(0, gemini_recipe.nutrition.fat),
            servings=payload.servings,
        ),
        healthScore=max(0, min(100, gemini_recipe.healthScore)),
        tags=gemini_recipe.tags,
        playlist=Playlist(
            id="gemini-playlist",
            name=gemini_recipe.playlist.title,
            description=gemini_recipe.playlist.description,
            energy="medium",
            energyLabel="אנרגיה בינונית",
            platform=platform,
            url=playlist_url,
            matchPercent=max(0, min(100, gemini_recipe.matchPercentage)),
        ),
    )


def generate_recipe_with_gemini(
    payload: GenerateRecipeRequest,
    *,
    strict: bool = False,
) -> GeneratedRecipe:
    """
    Call Gemini with structured JSON output.

    Requires GEMINI_API_KEY in backend/.env — see .env.example for setup steps.
    """
    if gemini_client is None:
        raise RuntimeError("Gemini client is not configured")

    prompt = _build_gemini_prompt(payload, strict=strict)
    schema = GeminiRecipeOutput.model_json_schema()

    response = gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": schema,
        },
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response")

    gemini_recipe = GeminiRecipeOutput.model_validate_json(response.text)
    return _normalize_gemini_recipe(gemini_recipe, payload)


def _recipe_to_validation_dict(recipe: GeneratedRecipe) -> dict:
    return {
        "name": recipe.name,
        "description": recipe.description,
        "ingredients": recipe.ingredients,
        "steps": recipe.steps,
    }


def _post_process_recipe(
    recipe: GeneratedRecipe,
    payload: GenerateRecipeRequest,
) -> GeneratedRecipe:
    """Hebrewize ingredients, split merged entries, and validate step usage."""
    raw = _recipe_to_validation_dict(recipe)
    raw["matchPercentage"] = recipe.matchPercentage
    processed, validation = apply_recipe_ingredient_parser(
        raw,
        payload.ingredients,
        cooking_time=payload.cookingTime,
        servings=payload.servings,
        recipe_type=payload.recipeType,
        category=payload.category,
    )

    print(
        "[FOOD FOR ANY MOOD] Ingredient parser score:",
        validation["ingredient_relevance_score"],
        "ok=",
        validation["ok"],
    )

    return GeneratedRecipe(
        name=processed["name"],
        description=recipe.description,
        ingredients=processed["ingredients"],
        steps=processed["steps"],
        matchPercentage=processed["matchPercentage"],
        spiceLevel=recipe.spiceLevel,
        nutrition=Nutrition(**processed["nutrition"]),
        healthScore=processed.get("healthScore", recipe.healthScore),
        tags=recipe.tags,
        playlist=recipe.playlist,
    )


def _effective_fallback_type(payload: GenerateRecipeRequest) -> RecipeType:
    """Dessert + meat is invalid — fall back to a meat meal."""
    if is_invalid_recipe_selection(payload.recipeType, payload.category):
        return "meal"
    return payload.recipeType


def _category_fallback_recipe(payload: GenerateRecipeRequest) -> GeneratedRecipe:
    """Return a guaranteed-valid template for the selected type and category."""
    effective_type = _effective_fallback_type(payload)
    if effective_type != payload.recipeType:
        adjusted = payload.model_copy(update={"recipeType": effective_type})
        return generate_mock_recipe(adjusted)

    user_ingredients = parse_user_ingredients(payload.ingredients)
    if user_ingredients:
        return _fallback_recipe_from_ingredients(payload)

    return generate_mock_recipe(payload)


def _fallback_recipe_from_ingredients(payload: GenerateRecipeRequest) -> GeneratedRecipe:
    user_ingredients = parse_user_ingredients(payload.ingredients)
    if not user_ingredients:
        return generate_mock_recipe(payload)

    raw = build_ingredient_fallback_recipe(
        user_ingredients=user_ingredients,
        category=payload.category,
        mood=payload.mood,
        cooking_time=payload.cookingTime,
        is_gluten_free=payload.isGlutenFree,
        music_platform=payload.musicPlatform,
        build_playlist=_build_playlist,
        recipe_type=payload.recipeType,
        servings=payload.servings,
    )
    processed, _ = apply_recipe_ingredient_parser(
        raw,
        payload.ingredients,
        cooking_time=payload.cookingTime,
        servings=payload.servings,
        recipe_type=payload.recipeType,
        category=payload.category,
    )
    return GeneratedRecipe(
        name=processed["name"],
        description=processed["description"],
        ingredients=processed["ingredients"],
        steps=processed["steps"],
        matchPercentage=processed["matchPercentage"],
        spiceLevel=processed["spiceLevel"],
        nutrition=Nutrition(**processed["nutrition"]),
        healthScore=processed.get("healthScore", raw["healthScore"]),
        tags=processed["tags"],
        playlist=processed["playlist"],
    )


def _passes_gemini_quality(recipe: GeneratedRecipe, payload: GenerateRecipeRequest) -> bool:
    user_ingredients = parse_user_ingredients(payload.ingredients)
    recipe_dict = _recipe_to_validation_dict(recipe)
    recipe_dict["tags"] = recipe.tags

    if is_invalid_recipe_selection(payload.recipeType, payload.category):
        log_quality_rejections(["wrong_category"])
        return False

    if not validateRecipeType(payload.recipeType, recipe_dict):
        log_quality_rejections(["wrong_recipe_type"])
        return False

    if not validateRecipeCategory(payload.recipeType, payload.category, recipe_dict):
        log_quality_rejections(["wrong_category"])
        return False

    quality = validate_gemini_recipe_quality(
        recipe_dict,
        recipe_type=payload.recipeType,
        category=payload.category,
        cooking_time=payload.cookingTime,
        user_ingredients=user_ingredients,
    )
    if not quality.ok:
        log_quality_rejections(quality.reasons)
        return False

    if user_ingredients and not is_recipe_acceptable(payload.ingredients, recipe_dict):
        print("[FOOD FOR ANY MOOD] Gemini recipe rejected: parser quality check failed")
        return False

    return True


def _try_gemini_recipe(payload: GenerateRecipeRequest, *, strict: bool) -> GeneratedRecipe | None:
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(generate_recipe_with_gemini, payload, strict=strict)
        raw = future.result(timeout=GEMINI_TIMEOUT_SECONDS)
    return _post_process_recipe(raw, payload)


def generate_recipe_with_ingredient_validation(
    payload: GenerateRecipeRequest,
) -> GeneratedRecipe:
    """Up to 2 Gemini attempts with validation, then category-specific fallback."""
    log_recipe_validation(
        selected_recipe_type=payload.recipeType,
        selected_category=payload.category,
        generated_title="",
        validation_passed=False,
        fallback_used=False,
    )

    for attempt, strict in ((1, False), (2, True)):
        try:
            recipe = _try_gemini_recipe(payload, strict=strict)
            passed = _passes_gemini_quality(recipe, payload)
            log_recipe_validation(
                selected_recipe_type=payload.recipeType,
                selected_category=payload.category,
                generated_title=recipe.name,
                validation_passed=passed,
                fallback_used=False,
            )
            if passed:
                return recipe
            print(f"[FOOD FOR ANY MOOD] Gemini attempt {attempt} failed validation")
        except concurrent.futures.TimeoutError:
            print(f"[FOOD FOR ANY MOOD] Gemini timeout after {GEMINI_TIMEOUT_SECONDS}s (attempt {attempt})")
            break
        except Exception as exc:
            print(f"[FOOD FOR ANY MOOD] Gemini failed (attempt {attempt}): {exc}")
            break

    recipe = _category_fallback_recipe(payload)
    log_recipe_validation(
        selected_recipe_type=payload.recipeType,
        selected_category=payload.category,
        generated_title=recipe.name,
        validation_passed=True,
        fallback_used=True,
    )
    return recipe


def generate_mock_recipe(payload: GenerateRecipeRequest) -> GeneratedRecipe:
    """Hebrew mock fallback when Gemini fails or is not configured."""
    if is_invalid_recipe_selection(payload.recipeType, payload.category):
        payload = payload.model_copy(update={"recipeType": "meal"})

    user_ingredients = parse_user_ingredients(payload.ingredients)

    if user_ingredients:
        return _fallback_recipe_from_ingredients(payload)

    template_source = (
        DESSERT_CATEGORY_RECIPES if payload.recipeType == "dessert" else CATEGORY_RECIPES
    )
    template = template_source[payload.category]

    ingredients = list(template["base_ingredients"])
    if payload.isGlutenFree:
        ingredients = [
            item.replace("פסטה", "פסטה ללא גלוטן")
            .replace("רוטב סויה", "רוטב סויה ללא גלוטן")
            .replace("קמח", "קמח ללא גלוטן")
            .replace("עוגיות", "עוגיות ללא גלוטן")
            for item in ingredients
        ]
        if "ללא גלוטן" not in " ".join(ingredients):
            ingredients.append("מותאם ללא גלוטן")

    if payload.recipeType == "dessert":
        ingredients.extend(["סוכר", "וניל"])
    else:
        ingredients.extend(["מלח", "פלפל שחור", "שמן זית"])

    mood_text = MOOD_DESCRIPTIONS.get(payload.mood, "טעימים")
    if payload.recipeType == "dessert":
        description = (
            f"קינוח מותאם ל{mood_text}, בזמן הכנה של כ-{payload.cookingTime} דקות. "
            f"{template['name']} — מתוק ומפנק."
        )
    else:
        description = (
            f"מנה מותאמת ל{mood_text}, בזמן הכנה של כ-{payload.cookingTime} דקות. "
            f"{template['name']} — ארוחה ביתית מלאת טעם ונוחות."
        )
    if payload.isGlutenFree:
        description += " מותאמת במלואה לתזונה ללא גלוטן."

    match_percentage = random.randint(72, 94)

    tags = list(template["tags"])
    if payload.cookingTime <= 25 and "quick" not in tags:
        tags.append("quick")

    return _post_process_recipe(
        GeneratedRecipe(
            name=template["name"],
            description=description,
            ingredients=ingredients,
            steps=list(template["steps"]),
            matchPercentage=match_percentage,
            spiceLevel=template["spiceLevel"],
            nutrition=Nutrition(
                calories=template["calories"],
                protein=template["protein"],
                carbs=template["carbs"],
                fat=template["fat"],
                servings=payload.servings,
            ),
            healthScore=template["healthScore"],
            tags=tags,
            playlist=_build_playlist(payload.musicPlatform, match_percentage),
        ),
        payload,
    )


async def generate_recipe_with_fallback(
    payload: GenerateRecipeRequest,
) -> tuple[GeneratedRecipe, Literal["gemini", "mock"], str | None]:
    """Try Gemini first; on any failure return a mocked Hebrew recipe."""
    if gemini_client is None:
        error = "Gemini client is not configured (check GEMINI_API_KEY in backend/.env)"
        print(f"[FOOD FOR ANY MOOD] Gemini error: {error}")
        return generate_mock_recipe(payload), "mock", error

    try:
        recipe = await asyncio.to_thread(
            generate_recipe_with_ingredient_validation, payload
        )
        print(f"[FOOD FOR ANY MOOD] Gemini success: {recipe.name}")
        return recipe, "gemini", None
    except (ValidationError, RuntimeError, ValueError) as exc:
        error = str(exc)
        print(f"[FOOD FOR ANY MOOD] Gemini error: {error}")
        logger.exception("Gemini recipe generation failed, using mock fallback: %s", exc)
        return generate_mock_recipe(payload), "mock", error
    except Exception as exc:
        error = str(exc)
        print(f"[FOOD FOR ANY MOOD] Gemini error: {error}")
        logger.exception("Unexpected Gemini error, using mock fallback: %s", exc)
        return generate_mock_recipe(payload), "mock", error


# ---------------------------------------------------------------------------
# Routes — registered on the root app (no prefix)
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    print("[FOOD FOR ANY MOOD] Health endpoint called")
    return {"status": "ok", "service": "food-for-any-mood-api"}


@app.post("/generate-recipe", response_model=GenerateRecipeResponse)
async def generate_recipe(payload: GenerateRecipeRequest):
    """
    Generate a Hebrew recipe via Gemini structured JSON output.

    Falls back to a local Hebrew mock if the API key is missing or Gemini fails.
    """
    print("[FOOD FOR ANY MOOD] Generate recipe endpoint called")
    print(f"[FOOD FOR ANY MOOD] recipeType received: {payload.recipeType}")
    print(
        "[FOOD FOR ANY MOOD] Received request body:",
        {
            "category": payload.category,
            "ingredients": payload.ingredients,
            "cookingTime": payload.cookingTime,
            "mood": payload.mood,
            "isGlutenFree": payload.isGlutenFree,
            "musicPlatform": payload.musicPlatform,
            "servings": payload.servings,
            "recipeType": payload.recipeType,
        },
    )
    recipe, source, gemini_error = await generate_recipe_with_fallback(payload)
    if source == "gemini":
        print(f"[FOOD FOR ANY MOOD] Returning Gemini recipe: {recipe.name}")
    else:
        print(
            "[FOOD FOR ANY MOOD] Returning mock fallback recipe "
            f"(Gemini error: {gemini_error})"
        )
    return GenerateRecipeResponse(recipe=recipe, source=source, geminiError=gemini_error)


@app.post("/recipes/generate", response_model=GenerateRecipeResponse, include_in_schema=True)
async def generate_recipe_alias(payload: GenerateRecipeRequest):
    """Backward-compatible alias for older frontend paths."""
    return await generate_recipe(payload)


@app.post("/analyze-ingredients-image", response_model=AnalyzeIngredientsImageResponse)
async def analyze_ingredients_image(image: UploadFile = File(...)):
    """Detect Hebrew ingredient names from an uploaded food photo via Gemini Vision."""
    print("[FOOD FOR ANY MOOD] Analyze ingredients image endpoint called")
    return await analyze_uploaded_image(
        client=gemini_client,
        model=GEMINI_MODEL,
        filename=image.filename,
        content_type=image.content_type,
        read_bytes=image.read,
    )


@app.post("/more-recipe-ideas", response_model=MoreRecipeIdeasResponse)
async def more_recipe_ideas(payload: MoreRecipeIdeasRequest):
    """Return 3 alternative dish ideas from the same ingredients."""
    print("[FOOD FOR ANY MOOD] More recipe ideas endpoint called")
    ideas, source = await generate_recipe_ideas_with_fallback(
        gemini_client,
        GEMINI_MODEL,
        payload,
    )
    return MoreRecipeIdeasResponse(ideas=ideas, source=source)


@app.post("/nutrition-analysis", response_model=NutritionAnalysisResponse)
async def nutrition_analysis(payload: NutritionAnalysisRequest):
    """Analyze recipe nutrition macros, insights, and health tips."""
    print("[FOOD FOR ANY MOOD] Nutrition analysis endpoint called")
    return await analyze_nutrition_with_fallback(gemini_client, GEMINI_MODEL, payload)


def _print_registered_routes() -> None:
    port = os.getenv("PORT", "8010")
    print("[FOOD FOR ANY MOOD] Registered routes:")
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            methods = ",".join(sorted(route.methods))
            print(f"  {methods:12} {route.path}")
    print("[FOOD FOR ANY MOOD] CORS allow all (MVP):", CORS_ALLOW_ALL)
    if not CORS_ALLOW_ALL:
        print("[FOOD FOR ANY MOOD] CORS origins:", CORS_ORIGINS)
        print("[FOOD FOR ANY MOOD] CORS origin regex:", CORS_ORIGIN_REGEX)
    print("[FOOD FOR ANY MOOD] Render start command:")
    print("  uvicorn main:app --host 0.0.0.0 --port $PORT")
    print(f"[FOOD FOR ANY MOOD] Listening on port {port}")


@app.on_event("startup")
async def on_startup() -> None:
    _print_registered_routes()
