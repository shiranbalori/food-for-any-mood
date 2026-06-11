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
import time
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from ingredient_safety_validation import assess_ingredient_safety
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
from themed_meals import (
    GenerateThemedMealRequest,
    GenerateThemedMealResponse,
    UpgradeThemedMealRequest,
    UpgradeThemedMealResponse,
    generate_themed_meal_with_fallback,
    upgrade_themed_meal_with_fallback,
)
from recipe_upgrade import (
    UpgradeRecipeRequest,
    UpgradeRecipeResponse,
    upgrade_recipe_with_fallback,
)
from analyze_ingredients_image import (
    AnalyzeIngredientsImageResponse,
    analyze_uploaded_image,
)
from recipe_ingredient_parser import (
    apply_recipe_ingredient_parser,
    is_recipe_acceptable,
)
from hebrew_display_text import normalize_hebrew_recipe_content
from recipe_pre_return_validation import (
    assess_ingredient_feasibility,
    build_validation_failure_message,
    validate_recipe_before_return,
)
from recipe_tags import apply_derived_recipe_tags
from recipe_diversity import build_regeneration_prompt_section, validate_recipe_diversity
from kosher_category_definitions import build_kosher_rules_en, build_kosher_rules_he
from recipe_category_fit import _ingredient_profile, _suggest_category
from recipe_quality import (
    infer_recipe_category,
    is_invalid_recipe_selection,
    log_quality_rejections,
    log_recipe_validation,
    resolve_kosher_category,
    validateRecipeCategory,
    validateRecipeType,
    validate_gemini_recipe_quality,
    violates_kosher_category,
)
from chef_prompt_rules import get_chef_rules_en, get_chef_rules_he
from recipe_dish_patterns import build_real_world_prompt_section, validate_real_world_dish
from dessert_debug_flow import (
    build_cinnamon_emergency_generated_recipe,
    describe_cinnamon_detection,
    is_cinnamon_dessert_debug_flow,
    log_all_validation_results,
    log_final_response,
    log_matched_pattern,
    log_parsed_ingredients,
    log_recipe_snapshot,
)
from chef_intro import build_chef_intro
from regenerate_recipe_steps import (
    GeminiStepsOutput,
    build_regenerate_steps_prompt,
    finalize_regenerated_steps,
)
from recipe_category_fit import assess_category_fit
from nutrition_score import calculate_health_score_from_recipe
from recipe_copy import get_recipe_copy
from recipe_templates import get_category_templates, get_playlist_presets
from pydantic import BaseModel, Field, ValidationError

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini client — key loaded from backend/.env (see .env.example)
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
GEMINI_TIMEOUT_SECONDS = 15


class _StageTimer:
    def __init__(self, label: str) -> None:
        self.label = label
        self._started = time.perf_counter()
        self._last = self._started
        self.rows: list[dict[str, str | int]] = []

    def mark(self, stage: str, status: str = "Success", detail: str = "") -> int:
        now = time.perf_counter()
        duration_ms = int((now - self._last) * 1000)
        self.rows.append(
            {
                "Stage": stage,
                "Duration (ms)": duration_ms,
                "Status": status,
                "Detail": detail,
            }
        )
        self._last = now
        print(
            f"[FOOD FOR ANY MOOD][timing] {stage} | {duration_ms}ms | {status}"
            + (f" | {detail}" if detail else "")
        )
        return duration_ms

    def print_table(self) -> None:
        total_ms = int((time.perf_counter() - self._started) * 1000)
        print(f"[FOOD FOR ANY MOOD][timing] {self.label} TOTAL | {total_ms}ms")
        for row in self.rows:
            print(
                "[FOOD FOR ANY MOOD][timing] "
                f"{row['Stage']} | {row['Duration (ms)']}ms | {row['Status']} | {row['Detail']}"
            )


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
KosherCategory = Literal["dairy", "meat", "parve"]
Category = Literal["dairy", "meat", "parve", "vegan", "any"]
MusicPlatform = Literal["spotify", "youtube"]
Mood = Literal["happy", "cozy", "energetic", "relaxed", "adventurous", "comfort"]
ServingsCount = Literal[1, 2, 4, 6, 8]
RecipeType = Literal["meal", "dessert", "soup_stew"]
Language = Literal["he", "en"]


class GenerateRecipeRequest(BaseModel):
    category: Category
    ingredients: str = ""
    cookingTime: int = Field(default=30, ge=5, le=180)
    mood: Mood = "cozy"
    isGlutenFree: bool = False
    musicPlatform: MusicPlatform = "spotify"
    servings: ServingsCount = 4
    recipeType: RecipeType = "meal"
    language: Language = "he"
    excludeTitles: list[str] = Field(default_factory=list)
    excludeCookingMethods: list[str] = Field(default_factory=list)
    excludeDessertCategories: list[str] = Field(default_factory=list)


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


class OptionalUpgrade(BaseModel):
    ingredient: str
    reason: str


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
    optionalUpgrades: list[OptionalUpgrade] = Field(default_factory=list)
    generatedFromPreferences: bool = False
    categoryNote: str | None = None


class GenerateRecipeResponse(BaseModel):
    recipe: GeneratedRecipe | None = None
    recipePossible: bool = True
    impossibleReason: str | None = None
    missingIngredients: list[str] = Field(default_factory=list)
    source: Literal["gemini", "mock", "none"] = "gemini"
    fallbackUsed: bool = False
    geminiError: str | None = None
    resolvedCategory: KosherCategory | None = None


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
    optionalUpgrades: list[OptionalUpgrade] = Field(default_factory=list)


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
    "vegan": "טבעוני",
    "any": "ללא העדפה",
}


def _template_category(payload: GenerateRecipeRequest) -> KosherCategory:
    """Map user selection to a kosher template key (dairy/meat/parve)."""
    if payload.category == "vegan":
        return "parve"
    if payload.category != "any":
        return payload.category  # type: ignore[return-value]
    user_ingredients = parse_user_ingredients(payload.ingredients)
    if not user_ingredients:
        return "parve"
    profile = _ingredient_profile(user_ingredients)
    return _suggest_category(profile)  # type: ignore[return-value]


def _resolved_category(payload: GenerateRecipeRequest, recipe_dict: dict) -> KosherCategory | None:
    if payload.category != "any":
        return None
    return infer_recipe_category(recipe_dict)

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
    "soup_stew": "מרק/תבשיל",
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



def _build_playlist(
    platform: MusicPlatform,
    match_percent: int | None = None,
    *,
    language: Language = "he",
) -> Playlist:
    preset = get_playlist_presets(language)[platform]
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
        energyLabel=preset["energyLabel"],
        platform=platform,
        url=url,
        matchPercent=match_percent if match_percent is not None else random.randint(82, 96),
    )


def _build_gemini_prompt(payload: GenerateRecipeRequest, *, strict: bool = False) -> str:
    language = payload.language or "he"
    if language == "en":
        return _build_gemini_prompt_en(payload, strict=strict)
    return _build_gemini_prompt_he(payload, strict=strict)


def _build_gemini_prompt_he(payload: GenerateRecipeRequest, *, strict: bool = False) -> str:
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
        if strict:
            strict_note += (
                "⚠️ המתכון הקודם נדחה — כלול רק מרכיבי משתמש + מצרכי מזוון: מים, מלח, פלפל שחור, שמן, אבקת אפייה.\n"
                "- אסור (אלא אם המשתמש הזין): פירות, עוגיות, שוקולד, אגוזים, גבינת שמנת, יוגורט, חלב, חמאה.\n"
                "⚠️ שם המנה חייב להישמע כמו מנה מוכרת מהעולם האמיתי (שקשוקה, פסטה בשמנת, סלט טונה).\n"
                "- Base the recipe on familiar real-world dishes. Do not invent unrealistic recipes.\n"
            )
        ingredient_rules = f"""
{strict_note}כללי מרכיבים (חובה מוחלטת — עדיפות על קטגוריה ומצב רוח):
- המשתמש ציין מרכיבים: {ingredient_list}
- לפחות {threshold}% מהמרכיבים האלה חייבים להופיע ברשימת המרכיבים של המתכון.
- השתמש אך ורק במרכיבים שהמשתמש הזין, ובמצרכי מזוון בסיסיים בלבד: מים, מלח, פלפל, שמן, תבלינים בסיסיים, אבקת אפייה; תמצית וניל רק אם המשתמש ציין וניל.
- חובה לכלול את כל המרכיבים העיקריים שהמשתמש הזין.
- אסור בהחלט (אלא אם המשתמש הזין): פירות/berries, עוגיות, שוקולד, אגוזים, גבינת שמנת, יוגורט, חלב, חמאה.
- שם המנה חייב לכלול לפחות אחד מהמרכיבים שציין המשתמש (בעברית, כפי שהזין או בניסוח קרוב).
- אל תציע מנה גנרית לפי קטגוריה/מצב רוח בלבד — המרכיבים הם הבסיס למנה.
- אם השילוב לא מתאים לחלוטין, הסבר בקצרה בתיאור והשתמש ברוב המרכיבים האפשריים.
- מרכיבים שלא בשימוש — אל תכלול אותם ברשימה; הסבר בתיאור אם נאלצת לוותר על חלקם.
- כל שמות המרכיבים חייבים להיות בעברית בלבד (למשל "שמן זית" ולא "Olive" או "Olive oil").
- כל מרכיב ברשימה חייב להופיע במפורש באחד משלבי ההכנה.
- הפרד מרכיבים לפריטים נפרדים — אל תמזג כמה מרכיבים לשורה אחת.
"""
    else:
        ingredient_rules = """
כללי יצירה לפי העדפות (המשתמש לא ציין מרכיבים):
- צור מתכון מלא המתאים לקטגוריה, סוג המתכון, מצב הרוח, זמן ההכנה, מספר המנות והעדפת הגלוטן.
- בתיאור ציין בבירור: «הצעה כללית כי לא הוזנו מרכיבים».
- אתה רשאי לכלול את כל המרכיבים הנדרשים למנה — בסיסי מטבח (מלח, שמן, תבלינים) מותרים.
- optionalUpgrades: מערך ריק [] — אין שדרוגים במצב זה.
- matchPercentage: 0 — לא רלוונטי (נוצר לפי העדפות).
"""

    title_rules = """
כללי שם המנה (חובה — פשוט וקשור למרכיבים):
- שם המנה חייב לשקף את המרכיבים בפועל (למשל: חביתה עם עגבניות, סלט עגבניות וביצה).
- מקסימום 5 מילים, שפה ביתית וברורה.
- אסור: וניל (אלא אם המשתמש הזין), "מנה ביתית", "קסם במחבת", "מהמטבח", שמות גנריים בלי מרכיבים.
- אסור: ארוחת, ערב, וייב, נוחות, רומנטי, מצב רוח — בשם המנה.
- מצב רוח משפיע רק על התיאור והפלייליסט — לא על שם המנה.
"""

    quantity_rules = f"""
כללי כמויות (חובה):
- לכל מרכיב חייבת להיות כמות ריאלית ויחידת מידה (כף, כפית, גרם, מ"ל, כוס, יחידה).
- הכמויות חייבות להתאים ל-{payload.servings} מנות.
- הכמויות מופיעות רק ברשימת המרכיבים — בשלבים השתמש בשמות המרכיבים בלי לחזור על המספרים.
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

    soup_stew_rules = ""
    if payload.recipeType == "soup_stew":
        soup_stew_rules = """
כללי מרק/תבשיל (חובה — סוג מתכון: מרק/תבשיל):
- המתכון חייב להיות מרק, תבשיל, נזיד, סיר אחד, תבשיל בתבנית או מנה מבושלת מנחמת.
- שם המנה חייב לכלול מרק, תבשיל, נזיד, סיר, צ'ולנט או מנה דומה.
- אסור: קינוח, עוגה, סלט קר בלבד, מנה מהירה במחבת ללא נוזל/רוטב מבושל.
- שלבי ההכנה: חימום, התבשלות, רתיחה, בישול לאט, ערבוב — אופייני למרק/תבשיל.
- אם המשתמש ציין מרכיבים — בנה מרק/תבשיל סביבם, לא ארוחה יבשה ולא קינוח.
"""

    dessert_rules = ""
    if payload.recipeType == "dessert":
        if user_ingredients:
            dessert_rules = """
כללי קינוח (חובה — סוג מתכון: קינוח):
- המתכון חייב להיות קינוח בלבד — לא מנה עיקרית, לא ארוחה מלוחה, לא שקשוקה, לא סלט, לא מרק.
- אסור: שקשוקה, פסטה מלוחה, עוף בתנור, סלט, מוקפץ, תבשיל עיקרי.
- השתמש אך ורק במרכיבים שהמשתמש ציין — אל תוסיף וניל, חמאה, שוקולד, פירות, אבקת סוכר או קמח אלא אם המשתמש הזין אותם.
- שלבי ההכנה חייבים להיות ספציפיים למרכיבים שהמשתמש הזין — לא טקסט גנרי.
- אסור שלבים גנריים כמו: "מסדרים על מגש הכנה", "מקשטים בפירות ושוקולד", "מגישים קר או חם".
- ביטוי מרכיבים בעברית: "הקוקוס, המרשמלו והסוכר" (פסיקים ו-"ו" לפני המרכיב האחרון).
- spiceLevel חייב להיות 0 (קינוחים אינם חריפים).
- שם המנה חייב לשקף את המרכיבים שהמשתמש הזין.
- אל תמציא קינוח שלא מבוסס על המרכיבים שהמשתמש הזין.
"""
        else:
            dessert_rules = """
כללי קינוח (חובה — סוג מתכון: קינוח):
- המתכון חייב להיות קינוח בלבד — לא מנה עיקרית, לא ארוחה מלוחה, לא שקשוקה, לא סלט, לא מרק.
- אסור: שקשוקה, פסטה מלוחה, עוף בתנור, סלט, מוקפץ, תבשיל עיקרי.
- שלבי ההכנה חייבים להיות ספציפיים למנה — לא טקסט גנרי.
- spiceLevel חייב להיות 0 (קינוחים אינם חריפים).
- שם המנה חייב לשקף את הקינוח (עוגה, עוגיות, מוס, בראוניז וכו').
"""

    kosher_rules = build_kosher_rules_he(
        category=payload.category,
        category_label=category_label,
    )

    mood_time_rules = f"""
כללי מצב רוח, זמן ומנות (חובה):
- מצב רוח ({mood_label}): השפיע על תיאור, תיבול ופלייליסט — לא על סוג המנה ({recipe_type_label}).
- זמן הכנה מקסימלי: {payload.cookingTime} דקות — כל שלבי ההכנה חייבים להיות ריאליים בגבולות הזמן הזה.
- מספר מנות: {payload.servings} — כמויות חייבות להתאים בדיוק.
"""

    match_note = (
        "- matchPercentage: 0–100 לפי התאמה למרכיבי המשתמש (ראה כללי שף)."
        if user_ingredients
        else "- matchPercentage: 0 (נוצר לפי העדפות — לא לחשב התאמת מרכיבים)."
    )
    content_fit_note = (
        "- התאם את המנה לקטגוריה, למצב הרוח ולזמן ההכנה — אך כשיש מרכיבים, הם קודמים לכל השאר."
        if user_ingredients
        else "- התאם את המנה לקטגוריה, למצב הרוח, לזמן ההכנה ולמספר המנות."
    )
    upgrades_note = (
        '- optionalUpgrades: מערך של עד 3 אובייקטים {{"ingredient": "...", "reason": "..."}} — מרכיבים אופציונליים בלבד, לא ברשימת ingredients.'
        if user_ingredients
        else "- optionalUpgrades: מערך ריק []."
    )
    regeneration_rules = build_regeneration_prompt_section(
        language="he",
        exclude_titles=payload.excludeTitles,
        exclude_cooking_methods=payload.excludeCookingMethods,
        exclude_dessert_categories=payload.excludeDessertCategories,
    )

    description_rules = ""
    if user_ingredients:
        description_rules = """
כללי תיאור / הקדמת שף (חובה — שדה description):
- לפני המתכון, כתוב/י הקדמה ידידותית בעברית טבעית.
- מבנה: "עם המרכיבים שיש לך אפשר להכין:" + 2–4 שורות עם • (מנות מוכרות מהעולם האמיתי) + שורה ריקה + משפט למה name היא הבחירה הטובה.
- חשוב/י קודם, כתוב/י אחר כך — אל תקפוץ/י ישר למתכון.
- אסור שילובים לא ריאליים; אסור מתכון שלא קשור למרכיבים.
"""

    real_world_rules = ""
    if user_ingredients:
        real_world_rules = build_real_world_prompt_section(
            user_ingredients,
            language="he",
            recipe_type=payload.recipeType,
            category=payload.category,
        )

    return f"""אתה שף/ית ידידותי/ת שעוזר/ת במטבח הבית — FOOD FOR ANY MOOD.
צור מתכון אחד מקורי בעברית בלבד (שם המנה, תיאור, מרכיבים, שלבים, תגיות, פלייליסט, optionalUpgrades).

{get_chef_rules_he()}

{real_world_rules}

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
{ingredient_rules}{title_rules}{description_rules}{quantity_rules}{meal_rules}{soup_stew_rules}{dessert_rules}{kosher_rules}{mood_time_rules}
כללי תוכן:
- כל טקסט המתכון חייב להיות בעברית.
- שמות המרכיבים בשלבים וברשימה — בעברית בלבד, ללא מילים באנגלית.
- שם האפליקציה FOOD FOR ANY MOOD נשאר באנגלית — אל תתרגם אותו.
{content_fit_note}
{match_note}
{upgrades_note}
- spiceLevel: 0–3 (0=לא חריף, 3=חריף).
- nutrition: הערכה סבירה ל-{payload.servings} מנות; nutrition.servings חייב להיות {payload.servings}.
- healthScore: 0–100 — computed from calories/protein/sugar/fiber per portion and ingredient quality (system may recalculate).
- tags: מפתחות קצרים באנגלית בלבד (highProtein, healthy, quick וכו') — המערכת מחשבת מחדש לפי ערכי התזונה; אל תמציא תגיות שלא נתמכות בנתונים.
- playlist.title ו-playlist.description בעברית; playlist.platform = "{payload.musicPlatform}";
  playlist.url = קישור חיפוש אמיתי ל-Spotify או YouTube המתאים למצב הרוח.
{regeneration_rules}
החזר JSON בלבד לפי הסכימה — ללא markdown וללא טקסט נוסף."""


def _build_gemini_prompt_en(payload: GenerateRecipeRequest, *, strict: bool = False) -> str:
    category_labels = {
        "dairy": "Dairy",
        "meat": "Meat",
        "parve": "Parve",
        "vegan": "Vegan",
        "any": "No preference",
    }
    mood_labels = {
        "happy": "Happy",
        "cozy": "Cozy",
        "energetic": "Energetic",
        "relaxed": "Relaxed",
        "adventurous": "Adventurous",
        "comfort": "Comfort",
    }
    category_label = category_labels[payload.category]
    mood_label = mood_labels[payload.mood]
    recipe_type_labels = {
        "meal": "Meal",
        "dessert": "Dessert",
        "soup_stew": "Soup/Stew",
    }
    recipe_type_label = recipe_type_labels.get(payload.recipeType, "Meal")
    gluten_note = "Yes — recipe must be gluten-free" if payload.isGlutenFree else "No"
    user_ingredients = parse_user_ingredients(payload.ingredients)
    ingredients_note = payload.ingredients.strip() or "Not specified — suggest suitable ingredients"

    strict_note = (
        "\n⚠️ Previous attempt failed validation — you MUST follow every rule below with no exceptions:\n"
        if strict
        else ""
    )
    if strict:
        strict_note += (
            "⚠️ Previous recipe rejected — the dish name must sound like a familiar real-world dish "
            "(shakshuka, creamy mushroom pasta, tuna salad).\n"
            "Base the recipe on familiar real-world dishes and cooking patterns. Do not invent unrealistic recipes.\n"
        )

    if user_ingredients:
        ingredient_rules = """
INGREDIENT RULES:
- Base recipe ingredients array: ONLY user-provided ingredients plus system pantry: water, salt, black pepper, oil, baking powder; vanilla extract ONLY if the user listed vanilla.
- NEVER add unless the user provided them: berries, cookies, chocolate, fruits, nuts, cream cheese, yogurt, milk, butter.
- optionalUpgrades: up to 3 optional improvements with ingredient + reason — never in the main ingredients list.
"""
        match_note = "- matchPercentage: 0–100 based on user ingredient match."
        upgrades_note = "- optionalUpgrades: up to 3 optional improvements with ingredient + reason."
    else:
        ingredient_rules = """
PREFERENCE-BASED GENERATION (user did not list ingredients):
- Create a complete recipe matching category, recipe type, mood, cooking time, servings, and gluten-free preference.
- You may include all ingredients needed for the dish, including pantry staples (salt, oil, spices).
- optionalUpgrades: empty array [].
- matchPercentage: 0 — not applicable (generated from preferences).
"""
        match_note = "- matchPercentage: 0 (generated from preferences — do not score ingredient match)."
        upgrades_note = "- optionalUpgrades: empty array []."

    regeneration_rules = build_regeneration_prompt_section(
        language="en",
        exclude_titles=payload.excludeTitles,
        exclude_cooking_methods=payload.excludeCookingMethods,
        exclude_dessert_categories=payload.excludeDessertCategories,
    )

    description_rules = ""
    if user_ingredients:
        description_rules = """
DESCRIPTION / CHEF INTRO (mandatory — description field):
- Before the recipe, write a friendly natural intro.
- Structure: "With the ingredients you have, you could make:" + 2–4 bullet lines with • (familiar real-world dish names) + blank line + one sentence why name is the best pick.
- Think first, write second — do not jump straight to the recipe.
- No unrealistic combinations; no generic dishes unrelated to the ingredients.
"""

    real_world_rules = ""
    if user_ingredients:
        real_world_rules = build_real_world_prompt_section(
            user_ingredients,
            language="en",
            recipe_type=payload.recipeType,
            category=payload.category,
        )

    return f"""You are a friendly home chef helping someone cook — FOOD FOR ANY MOOD.
Return exactly one recipe as structured JSON in English only.

{get_chef_rules_en()}

{real_world_rules}

LANGUAGE (mandatory):
- The entire recipe MUST be in English only (name, description, ingredients, steps, tags, playlist, optionalUpgrades).
- Do NOT use Hebrew in the JSON output.
- The app name FOOD FOR ANY MOOD stays in English.

RECIPE TYPE (mandatory): {recipe_type_label} ({payload.recipeType})

USER PREFERENCES:
- Category: {category_label} ({payload.category}) — {"choose the best kosher category for the dish; recipe must be consistently dairy, meat, or parve" if payload.category == "any" else "kosher rules apply"}
- Mood: {mood_label} ({payload.mood})
- Max cooking time: {payload.cookingTime} minutes
- Gluten-free: {gluten_note}
- Available ingredients (base recipe): {ingredients_note}
- Servings: {payload.servings}
- Music platform for playlist: {payload.musicPlatform}
{strict_note}{ingredient_rules}{description_rules}
STEP RULES:
- Minimum 4 steps; prefer 5–8 detailed, natural steps.
- Quantities in ingredient list only — not repeated in steps.
- Each step: action, technique, time when relevant, expected result.

{build_kosher_rules_en(category=payload.category, category_label=category_label)}

CONTENT:
- Dish name must sound like a real dish — never an ingredient list. Maximum 4 words.
- NEVER: "cream sugar eggs dessert", "vanilla homemade recipe", ingredient chains as titles.
- GOOD: "Baked Vanilla Custard", "Silky Vanilla Mousse", "Homemade Vanilla Pudding".
- NEVER generic titles: "Homemade Stew", "Quick Dish", "Cheesecake Dessert".
{match_note}
{upgrades_note}
- spiceLevel: 0–3; nutrition.servings must be {payload.servings}; healthScore: 0–100.
- playlist.platform = "{payload.musicPlatform}"; playlist.url = real Spotify or YouTube search URL.
{regeneration_rules}
Return JSON only — no markdown, no extra text."""


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

    energy_label = "Medium energy" if payload.language == "en" else "אנרגיה בינונית"

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
        healthScore=calculate_health_score_from_recipe(
            ingredients=gemini_recipe.ingredients,
            calories=max(0, gemini_recipe.nutrition.calories),
            protein=max(0, gemini_recipe.nutrition.protein),
            carbs=max(0, gemini_recipe.nutrition.carbs),
            fat=max(0, gemini_recipe.nutrition.fat),
            servings=payload.servings,
        ),
        tags=gemini_recipe.tags,
        optionalUpgrades=(gemini_recipe.optionalUpgrades or [])[:3],
        playlist=Playlist(
            id="gemini-playlist",
            name=gemini_recipe.playlist.title,
            description=gemini_recipe.playlist.description,
            energy="medium",
            energyLabel=energy_label,
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


def _has_chef_intro(description: str, language: str = "he") -> bool:
    text = (description or "").strip()
    if "•" in text:
        return True
    if language == "he":
        return "עם המרכיבים שיש לך" in text or "אפשר להכין:" in text
    return "With the ingredients you have" in text or "you could make:" in text.lower()


def _ensure_chef_description(
    description: str,
    *,
    ingredients: list[str],
    chosen_name: str,
    language: str,
    recipe_type: str,
    cooking_time: int,
    has_user_ingredients: bool,
) -> str:
    if not has_user_ingredients or not ingredients:
        return description
    if _has_chef_intro(description, language):
        return description
    return build_chef_intro(
        ingredients,
        chosen_name=chosen_name,
        language=language,
        recipe_type=recipe_type,
        cooking_time=cooking_time,
    )


def _post_process_recipe(
    recipe: GeneratedRecipe,
    payload: GenerateRecipeRequest,
    *,
    preserve_original_steps: bool = False,
) -> GeneratedRecipe:
    """Hebrewize ingredients, split merged entries, and validate step usage."""
    raw = _recipe_to_validation_dict(recipe)
    raw["matchPercentage"] = recipe.matchPercentage
    parser_category = _template_category(payload) if payload.category == "any" else payload.category
    processed, validation = apply_recipe_ingredient_parser(
        raw,
        payload.ingredients,
        cooking_time=payload.cookingTime,
        servings=payload.servings,
        recipe_type=payload.recipeType,
        category=parser_category,
        is_gluten_free=payload.isGlutenFree,
        language=payload.language,
        preserve_original_steps=preserve_original_steps,
    )

    print(
        "[FOOD FOR ANY MOOD] PARSED_RECIPE",
        {
            "name": processed["name"],
            "ingredients": processed["ingredients"],
            "steps": processed["steps"],
            "preserveOriginalSteps": preserve_original_steps,
        },
    )

    print(
        "[FOOD FOR ANY MOOD] Ingredient parser score:",
        validation["ingredient_relevance_score"],
        "ok=",
        validation["ok"],
    )

    preference_based = not parse_user_ingredients(payload.ingredients)
    user_ingredients = parse_user_ingredients(payload.ingredients)
    description = _ensure_chef_description(
        recipe.description,
        ingredients=processed["ingredients"],
        chosen_name=processed["name"],
        language=payload.language or "he",
        recipe_type=payload.recipeType,
        cooking_time=payload.cookingTime,
        has_user_ingredients=bool(user_ingredients),
    )

    tag_category = resolve_kosher_category(
        payload.category,
        {**processed, "tags": processed.get("tags") or []},
    )
    tagged = apply_derived_recipe_tags(
        processed,
        category=tag_category,
        is_gluten_free=payload.isGlutenFree,
        recipe_type=payload.recipeType,
        spice_level=recipe.spiceLevel,
        cook_time=payload.cookingTime,
    )

    category_fit = assess_category_fit(
        payload.ingredients,
        category=payload.category,
        is_gluten_free=payload.isGlutenFree,
        language=payload.language or "he",
    )
    category_note = (category_fit.get("category_note") or "").strip() or None

    language = payload.language or "he"
    normalized = normalize_hebrew_recipe_content(
        {
            "name": tagged["name"],
            "description": description,
            "ingredients": tagged["ingredients"],
            "steps": tagged["steps"],
            "categoryNote": category_note,
            "optionalUpgrades": [] if preference_based else (recipe.optionalUpgrades or []),
        },
        language,
    )

    return GeneratedRecipe(
        name=normalized["name"],
        description=normalized["description"],
        ingredients=normalized["ingredients"],
        steps=normalized["steps"],
        matchPercentage=tagged["matchPercentage"],
        spiceLevel=recipe.spiceLevel,
        nutrition=Nutrition(**tagged["nutrition"]),
        healthScore=tagged.get("healthScore", recipe.healthScore),
        tags=tagged["tags"],
        playlist=recipe.playlist,
        optionalUpgrades=normalized.get("optionalUpgrades", []),
        generatedFromPreferences=processed.get("generatedFromPreferences", preference_based),
        categoryNote=normalized.get("categoryNote") or None,
    )


def _effective_fallback_type(payload: GenerateRecipeRequest) -> RecipeType:
    """Dessert + meat is invalid — fall back to a meat meal."""
    if is_invalid_recipe_selection(payload.recipeType, payload.category):
        return "meal"
    return payload.recipeType


def _category_fallback_recipe(payload: GenerateRecipeRequest) -> GeneratedRecipe:
    """Return a guaranteed-valid template for the selected type and category."""
    if is_cinnamon_dessert_debug_flow(payload):
        return build_cinnamon_emergency_generated_recipe(payload)

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
        category=_template_category(payload),
        mood=payload.mood,
        cooking_time=payload.cookingTime,
        is_gluten_free=payload.isGlutenFree,
        music_platform=payload.musicPlatform,
        build_playlist=lambda platform, match_percent: _build_playlist(
            platform, match_percent, language=payload.language
        ),
        recipe_type=payload.recipeType,
        servings=payload.servings,
        language=payload.language,
        exclude_titles=payload.excludeTitles,
        exclude_cooking_methods=payload.excludeCookingMethods,
        exclude_dessert_categories=payload.excludeDessertCategories,
    )
    processed, _ = apply_recipe_ingredient_parser(
        raw,
        payload.ingredients,
        cooking_time=payload.cookingTime,
        servings=payload.servings,
        recipe_type=payload.recipeType,
        category=payload.category,
        is_gluten_free=payload.isGlutenFree,
        language=payload.language,
        preserve_original_steps=True,
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
        optionalUpgrades=[
            OptionalUpgrade(**item) for item in (raw.get("optionalUpgrades") or [])[:3]
        ],
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

    if not is_recipe_acceptable(payload.ingredients, recipe_dict, payload.language):
        print("[FOOD FOR ANY MOOD] Gemini recipe rejected: language or parser quality check failed")
        return False

    diversity = validate_recipe_diversity(
        recipe_dict,
        recipe_type=payload.recipeType,
        exclude_titles=payload.excludeTitles,
        exclude_cooking_methods=payload.excludeCookingMethods,
        exclude_dessert_categories=payload.excludeDessertCategories,
    )
    if not diversity["ok"]:
        log_quality_rejections(diversity["failures"])
        return False

    if user_ingredients:
        real_world = validate_real_world_dish(
            recipe_dict,
            user_ingredients,
            recipe_type=payload.recipeType,
            category=payload.category,
            language=payload.language or "he",
        )
        if not real_world["ok"]:
            log_quality_rejections(real_world["failures"])
            return False

    return True


def _try_gemini_recipe(
    payload: GenerateRecipeRequest,
    *,
    strict: bool,
    timer: _StageTimer | None = None,
) -> GeneratedRecipe | None:
    stage = "gemini:strict" if strict else "gemini:first"
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(generate_recipe_with_gemini, payload, strict=strict)
            raw = future.result(timeout=GEMINI_TIMEOUT_SECONDS)
        if timer:
            timer.mark(stage, "Success")
    except concurrent.futures.TimeoutError:
        if timer:
            timer.mark(stage, "Failed", f"timeout after {GEMINI_TIMEOUT_SECONDS}s")
        raise
    except Exception as exc:
        if timer:
            timer.mark(stage, "Failed", str(exc))
        raise
    print(
        "[FOOD FOR ANY MOOD] RAW_GEMINI",
        {
            "name": raw.name,
            "ingredients": raw.ingredients,
            "steps": raw.steps,
        },
    )
    if timer:
        timer.mark(f"{stage}:postProcess")
    return _post_process_recipe(raw, payload, preserve_original_steps=True)


def generate_recipe_with_ingredient_validation(
    payload: GenerateRecipeRequest,
) -> tuple[GeneratedRecipe, Literal["gemini", "mock"]]:
    """One Gemini attempt within 15s, then category-specific fallback."""
    timer = _StageTimer("generate_recipe_with_ingredient_validation")
    debug_flow = is_cinnamon_dessert_debug_flow(payload)
    parsed_debug = log_parsed_ingredients(payload) if debug_flow else None
    if debug_flow:
        log_matched_pattern(parsed_debug, payload)
        print("[DESSERT_DEBUG cinnamon-dessert] Skipping Gemini — using hardcoded emergency fallback")
        recipe = build_cinnamon_emergency_generated_recipe(payload)
        log_recipe_snapshot(_recipe_to_validation_dict(recipe), label_prefix="emergency/hardcoded")
        timer.mark("mockFallback", "Success", "cinnamon-dessert-bypass")
        timer.mark("complete", "Success", "mock")
        timer.print_table()
        return recipe, "mock"

    log_recipe_validation(
        selected_recipe_type=payload.recipeType,
        selected_category=payload.category,
        generated_title="",
        validation_passed=False,
        fallback_used=False,
    )
    print(f"[FOOD FOR ANY MOOD] selectedLanguage: {payload.language}")
    timer.mark("init")

    try:
        recipe = _try_gemini_recipe(payload, strict=False, timer=timer)
        passed = _passes_gemini_quality(recipe, payload)
        timer.mark("quality:first", "Success" if passed else "Failed")
        if not passed:
            print("[FOOD FOR ANY MOOD] First Gemini attempt failed — retrying with strict prompt")
            recipe = _try_gemini_recipe(payload, strict=True, timer=timer)
            passed = _passes_gemini_quality(recipe, payload)
            timer.mark("quality:strict", "Success" if passed else "Failed")
        log_recipe_validation(
            selected_recipe_type=payload.recipeType,
            selected_category=payload.category,
            generated_title=recipe.name,
            validation_passed=passed,
            fallback_used=False,
        )
        if passed:
            print(f"[FOOD FOR ANY MOOD] recipeLanguageUsed: {payload.language}")
            timer.mark("complete", "Success", "gemini")
            timer.print_table()
            return recipe, "gemini"

        recipe_dict = _recipe_to_validation_dict(recipe)
        effective = resolve_kosher_category(payload.category, recipe_dict)
        if violates_kosher_category(effective, recipe_dict):
            print("[FOOD FOR ANY MOOD] Gemini rejected: kosher category violation")
        else:
            print("[FOOD FOR ANY MOOD] Gemini attempt failed validation — using fallback")
    except concurrent.futures.TimeoutError:
        print(f"[FOOD FOR ANY MOOD] Gemini timeout after {GEMINI_TIMEOUT_SECONDS}s")
        timer.mark("gemini", "Failed", "timeout")
    except Exception as exc:
        print(f"[FOOD FOR ANY MOOD] Gemini failed: {exc}")
        timer.mark("gemini", "Failed", str(exc))

    recipe = _category_fallback_recipe(payload)
    timer.mark("mockFallback", "Success")
    log_recipe_validation(
        selected_recipe_type=payload.recipeType,
        selected_category=payload.category,
        generated_title=recipe.name,
        validation_passed=True,
        fallback_used=True,
    )
    print(f"[FOOD FOR ANY MOOD] recipeLanguageUsed: {payload.language}")
    timer.mark("complete", "Success", "mock")
    timer.print_table()
    return recipe, "mock"


def _build_mock_description(payload: GenerateRecipeRequest, template: dict) -> str:
    copy = get_recipe_copy(payload.language)
    mood_text = copy["mood_flavor"].get(payload.mood, copy["default_mood"])
    if payload.recipeType == "dessert":
        description = copy["dessert_description"].format(
            mood=mood_text,
            minutes=payload.cookingTime,
            name=template["name"],
        )
    else:
        description = copy["meal_description"].format(
            mood=mood_text,
            minutes=payload.cookingTime,
            name=template["name"],
        )
    if payload.isGlutenFree:
        description += copy["gf_suffix"]
    return description


def _append_fallback_extras(ingredients: list[str], payload: GenerateRecipeRequest) -> list[str]:
    """Only append gluten-free tag — do not inject pantry staples."""
    items = list(ingredients)
    if payload.isGlutenFree:
        if payload.language == "en":
            if not any("gluten-free" in item.lower() for item in items):
                items.append("gluten-free adapted")
        elif not any("ללא גלוטן" in item for item in items):
            items.append("מותאם ללא גלוטן")
    return items


def _apply_gluten_free_ingredients(ingredients: list[str], language: Language) -> list[str]:
    if language == "en":
        return [
            item.replace("pasta", "gluten-free pasta")
            .replace("soy sauce", "gluten-free soy sauce")
            .replace("flour", "gluten-free flour")
            .replace("cookies", "gluten-free cookies")
            for item in ingredients
        ]
    return [
        item.replace("פסטה", "פסטה ללא גלוטן")
        .replace("רוטב סויה", "רוטב סויה ללא גלוטן")
        .replace("קמח", "קמח ללא גלוטן")
        .replace("עוגיות", "עוגיות ללא גלוטן")
        for item in ingredients
    ]


def generate_mock_recipe(payload: GenerateRecipeRequest) -> GeneratedRecipe:
    """Localized mock fallback when Gemini fails or is not configured."""
    if is_invalid_recipe_selection(payload.recipeType, payload.category):
        payload = payload.model_copy(update={"recipeType": "meal"})

    user_ingredients = parse_user_ingredients(payload.ingredients)

    if user_ingredients:
        return _fallback_recipe_from_ingredients(payload)

    template_source = get_category_templates(payload.language, payload.recipeType)
    template_key = _template_category(payload)
    template = template_source[template_key]

    ingredients = list(template["base_ingredients"])
    if payload.isGlutenFree:
        ingredients = _apply_gluten_free_ingredients(ingredients, payload.language)

    ingredients = _append_fallback_extras(ingredients, payload)
    description = _build_mock_description(payload, template)

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
            playlist=_build_playlist(
                payload.musicPlatform,
                match_percentage,
                language=payload.language,
            ),
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
        recipe, source = await asyncio.to_thread(
            generate_recipe_with_ingredient_validation, payload
        )
        if source == "gemini":
            print(f"[FOOD FOR ANY MOOD] Gemini success: {recipe.name}")
        else:
            print(
                "[FOOD FOR ANY MOOD] Returning mock fallback after Gemini validation failure:",
                recipe.name,
            )
        return recipe, source, None if source == "gemini" else "Gemini validation failed or unavailable"
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


def _cinnamon_emergency_response(
    payload: GenerateRecipeRequest,
    *,
    gemini_error: str | None = None,
    timer: _StageTimer | None = None,
) -> GenerateRecipeResponse:
    """Hardcoded עוגיות חמאה וקינמון — skips all validators."""
    print("[DESSERT_DEBUG cinnamon-dessert] Returning hardcoded emergency fallback (validation bypassed)")
    recipe = build_cinnamon_emergency_generated_recipe(payload)
    log_recipe_snapshot(_recipe_to_validation_dict(recipe), label_prefix="emergency/hardcoded")
    if timer:
        timer.mark("cinnamonEmergencyFallback", "Success")
    resolved = _resolved_category(payload, _recipe_to_validation_dict(recipe))
    response = GenerateRecipeResponse(
        recipe=recipe,
        recipePossible=True,
        source="mock",
        fallbackUsed=True,
        geminiError=gemini_error,
        resolvedCategory=resolved,
    )
    log_final_response(response)
    if timer:
        timer.print_table()
    return response


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
    timer = _StageTimer("POST /generate-recipe")
    print("[FOOD FOR ANY MOOD] Generate recipe endpoint called")
    timer.mark("requestReceived")
    print(f"[FOOD FOR ANY MOOD] recipeType received: {payload.recipeType}")
    print(f"[FOOD FOR ANY MOOD] selectedLanguage: {payload.language}")
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
            "language": payload.language,
        },
    )
    debug_flow = is_cinnamon_dessert_debug_flow(payload)
    if debug_flow:
        log_parsed_ingredients(payload)
        log_matched_pattern(parse_user_ingredients(payload.ingredients), payload)
    else:
        detection = describe_cinnamon_detection(payload)
        if detection["hasAllRequiredCanons"]:
            print(
                "[DESSERT_DEBUG cinnamon-dessert] NOT detected — "
                f"recipeType={detection['recipeType']} "
                f"recipeTypeMatches={detection['recipeTypeMatches']} "
                f"canons={detection['canonicalIngredients']}"
            )
    safety = assess_ingredient_safety(payload.ingredients, language=payload.language or "he")
    timer.mark("assessIngredientSafety", "Success" if safety["ok"] else "Failed")
    if not safety["ok"]:
        print(f"[FOOD FOR ANY MOOD] Ingredient safety rejected: {safety.get('invalid_ingredients', [])}")
        timer.print_table()
        return GenerateRecipeResponse(
            recipe=None,
            recipePossible=False,
            impossibleReason=safety["reason"],
            missingIngredients=safety.get("invalid_ingredients", []),
            source="none",
        )

    feasibility = assess_ingredient_feasibility(
        payload.ingredients,
        recipe_type=payload.recipeType,
        category=payload.category,
        is_gluten_free=payload.isGlutenFree,
        language=payload.language or "he",
    )
    timer.mark("assessIngredientFeasibility", "Success" if feasibility["recipe_possible"] else "Failed")
    if not feasibility["recipe_possible"]:
        if debug_flow:
            return _cinnamon_emergency_response(payload, timer=timer)
        reason, missing = build_validation_failure_message({}, feasibility, language=payload.language or "he")
        print(f"[FOOD FOR ANY MOOD] Recipe not possible: {reason}")
        timer.print_table()
        return GenerateRecipeResponse(
            recipe=None,
            recipePossible=False,
            impossibleReason=reason,
            missingIngredients=missing,
            source="none",
        )

    recipe, source, gemini_error = await generate_recipe_with_fallback(payload)
    timer.mark(
        "generate_recipe_with_fallback",
        "Success" if recipe is not None else "Failed",
        f"source={source} geminiError={gemini_error or 'none'}",
    )

    if recipe is None:
        if not parse_user_ingredients(payload.ingredients):
            print("[FOOD FOR ANY MOOD] No recipe generated for preference-based request — using category fallback")
            recipe = _category_fallback_recipe(payload)
            source = "mock"
        else:
            return GenerateRecipeResponse(
                recipe=None,
                recipePossible=False,
                impossibleReason=(
                    "לא הצלחנו ליצור מתכון מהמרכיבים שסיפקתם."
                    if payload.language == "he"
                    else "We could not create a recipe from the ingredients you provided."
                ),
                source="none",
                geminiError=gemini_error,
            )

    pre_return = validate_recipe_before_return(
        _recipe_to_validation_dict(recipe),
        payload.ingredients,
        language=payload.language or "he",
        recipe_type=payload.recipeType,
        category=payload.category,
    )
    timer.mark("validateRecipeBeforeReturn", "Success" if pre_return["ok"] else "Failed", ",".join(pre_return["failures"]))
    debug_flow = is_cinnamon_dessert_debug_flow(payload)
    if debug_flow:
        log_recipe_snapshot(_recipe_to_validation_dict(recipe), label_prefix="generated/fallback")
        log_all_validation_results(
            _recipe_to_validation_dict(recipe),
            payload,
            user_ingredients=parse_user_ingredients(payload.ingredients),
        )
    if not pre_return["ok"]:
        preference_based = not parse_user_ingredients(payload.ingredients)
        print(
            "[FOOD FOR ANY MOOD] Pre-return failed — using category fallback "
            f"({'preference' if preference_based else 'ingredient'}-based request)"
        )
        recipe = _category_fallback_recipe(payload)
        source = "mock"
        pre_return = validate_recipe_before_return(
            _recipe_to_validation_dict(recipe),
            payload.ingredients,
            language=payload.language or "he",
            recipe_type=payload.recipeType,
            category=payload.category,
        )
        timer.mark(
            "validateRecipeBeforeReturn:fallback",
            "Success" if pre_return["ok"] else "Failed",
            ",".join(pre_return["failures"]),
        )
        if debug_flow:
            log_recipe_snapshot(_recipe_to_validation_dict(recipe), label_prefix="retry/fallback")
            log_all_validation_results(
                _recipe_to_validation_dict(recipe),
                payload,
                user_ingredients=parse_user_ingredients(payload.ingredients),
            )
        if not pre_return["ok"]:
            if debug_flow:
                return _cinnamon_emergency_response(payload, gemini_error=gemini_error, timer=timer)
            reason, missing = build_validation_failure_message(
                pre_return,
                None,
                language=payload.language or "he",
            )
            print("[FOOD FOR ANY MOOD] Recipe failed pre-return validation:", pre_return["failures"])
            timer.print_table()
            failure_response = GenerateRecipeResponse(
                recipe=None,
                recipePossible=False,
                impossibleReason=reason,
                missingIngredients=missing,
                source="none",
                geminiError=gemini_error,
            )
            if debug_flow:
                log_final_response(failure_response)
            return failure_response

    if source == "gemini":
        print(f"[FOOD FOR ANY MOOD] Returning Gemini recipe: {recipe.name}")
    else:
        print(
            "[FOOD FOR ANY MOOD] Returning mock fallback recipe "
            f"(Gemini error: {gemini_error})"
        )
    timer.mark("response", "Success", f"source={source}")
    timer.print_table()
    recipe_dict = _recipe_to_validation_dict(recipe)
    resolved = _resolved_category(payload, recipe_dict)
    success_response = GenerateRecipeResponse(
        recipe=recipe,
        recipePossible=True,
        source=source,
        fallbackUsed=source == "mock",
        geminiError=gemini_error,
        resolvedCategory=resolved,
    )
    if debug_flow:
        log_final_response(success_response)
    return success_response


@app.post("/recipes/generate", response_model=GenerateRecipeResponse, include_in_schema=True)
async def generate_recipe_alias(payload: GenerateRecipeRequest):
    """Backward-compatible alias for older frontend paths."""
    return await generate_recipe(payload)


class RegenerateStepsRequest(BaseModel):
    name: str
    ingredients: list[str]
    currentSteps: list[str] = Field(default_factory=list)
    language: str = "he"
    cookingTime: int = 30
    recipeType: str = "meal"
    variationIndex: int = 0


class RegenerateStepsResponse(BaseModel):
    steps: list[str]
    ok: bool = True
    error: str | None = None


@app.post("/regenerate-steps", response_model=RegenerateStepsResponse)
async def regenerate_recipe_steps_endpoint(payload: RegenerateStepsRequest):
    """Regenerate preparation steps only — same title and ingredients."""
    print(
        "[FOOD FOR ANY MOOD] Regenerate steps:",
        payload.name,
        "ingredients=",
        len(payload.ingredients),
        "variation=",
        payload.variationIndex,
    )
    ingredients = [item.strip() for item in payload.ingredients if item and item.strip()]
    current_steps = [s.strip() for s in (payload.currentSteps or []) if s and s.strip()]
    language = payload.language or "he"

    if not ingredients:
        return RegenerateStepsResponse(
            steps=[],
            ok=False,
            error="No ingredients provided",
        )

    from alternate_user_ingredient_steps import build_alternate_steps_from_user_ingredients

    def _local_alternate() -> list[str]:
        return finalize_regenerated_steps(
            build_alternate_steps_from_user_ingredients(
                ingredients,
                recipe_type=payload.recipeType or "meal",
                language=language,
                cooking_time=payload.cookingTime,
                variation_index=payload.variationIndex,
            ),
            language=language,
        )

    if gemini_client is None:
        print("[FOOD FOR ANY MOOD] Regenerate steps: no Gemini — local alternate")
        return RegenerateStepsResponse(steps=_local_alternate())

    try:
        prompt = build_regenerate_steps_prompt(
            name=payload.name,
            ingredients=ingredients,
            current_steps=current_steps,
            language=language,
            cooking_time=payload.cookingTime,
            recipe_type=payload.recipeType or "meal",
            variation_index=payload.variationIndex,
        )
        schema = GeminiStepsOutput.model_json_schema()
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": schema,
            },
        )
        if not response.text:
            raise RuntimeError("Gemini returned empty steps")
        parsed = GeminiStepsOutput.model_validate_json(response.text)
        steps = finalize_regenerated_steps(parsed.steps, language=language)
        joined_prev = "|".join(current_steps)
        joined_new = "|".join(steps)
        if joined_prev == joined_new:
            print("[FOOD FOR ANY MOOD] Regenerate steps: Gemini same as current — local alternate")
            return RegenerateStepsResponse(steps=_local_alternate())
        print("[FOOD FOR ANY MOOD] Regenerate steps: Gemini OK,", len(steps), "steps")
        return RegenerateStepsResponse(steps=steps)
    except Exception as exc:
        print(f"[FOOD FOR ANY MOOD] Regenerate steps failed: {exc}")
        try:
            return RegenerateStepsResponse(steps=_local_alternate(), ok=True, error=str(exc))
        except Exception as local_exc:
            print(f"[FOOD FOR ANY MOOD] Local alternate failed: {local_exc}")
            return RegenerateStepsResponse(steps=[], ok=False, error=str(exc))


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


@app.post("/generate-themed-meal", response_model=GenerateThemedMealResponse)
async def generate_themed_meal(payload: GenerateThemedMealRequest):
    """Generate a full themed meal menu for My Area."""
    print("[FOOD FOR ANY MOOD] Generate themed meal endpoint called")
    return generate_themed_meal_with_fallback(gemini_client, GEMINI_MODEL, payload)


@app.post("/upgrade-themed-meal", response_model=UpgradeThemedMealResponse)
async def upgrade_themed_meal(payload: UpgradeThemedMealRequest):
    """Upgrade a full themed meal menu."""
    print("[FOOD FOR ANY MOOD] Upgrade themed meal endpoint called")
    return upgrade_themed_meal_with_fallback(gemini_client, GEMINI_MODEL, payload)


@app.post("/upgrade-recipe", response_model=UpgradeRecipeResponse)
async def upgrade_recipe(payload: UpgradeRecipeRequest):
    """Upgrade an existing generated recipe on the Home page."""
    print("[FOOD FOR ANY MOOD] Upgrade recipe endpoint called")
    print("[FOOD FOR ANY MOOD] Upgrade recipe incoming payload:", payload.model_dump())
    try:
        result = upgrade_recipe_with_fallback(gemini_client, GEMINI_MODEL, payload)
        print("[FOOD FOR ANY MOOD] Upgrade recipe outgoing response:", result.model_dump())
        return result
    except Exception as exc:
        print(f"[FOOD FOR ANY MOOD] Upgrade recipe endpoint error: {exc}")
        return upgrade_recipe_with_fallback(None, GEMINI_MODEL, payload)


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
