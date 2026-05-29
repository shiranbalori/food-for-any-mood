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
import logging
import os
import random
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from ingredient_relevance import (
    MIN_INGREDIENT_MATCH_RATIO,
    build_ingredient_fallback_recipe,
    parse_user_ingredients,
    validate_recipe_relevance,
)
from recipe_ingredient_parser import (
    apply_recipe_ingredient_parser,
    is_recipe_acceptable,
)
from pydantic import BaseModel, Field, ValidationError

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini client — key loaded from backend/.env (see .env.example)
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()

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


class GenerateRecipeRequest(BaseModel):
    category: Category
    ingredients: str = ""
    cookingTime: int = Field(default=30, ge=5, le=180)
    mood: Mood = "cozy"
    isGlutenFree: bool = False
    musicPlatform: MusicPlatform = "spotify"


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

    return f"""אתה שף ישראלי שמייצר מתכונים לאפליקציה FOOD FOR ANY MOOD.
צור מתכון אחד מקורי בעברית בלבד (שם המנה, תיאור, מרכיבים, שלבים, תגיות, פלייליסט).

העדפות המשתמש:
- קטגוריה: {category_label} ({payload.category})
- מצב רוח: {mood_label} ({payload.mood})
- זמן הכנה מקסימלי: {payload.cookingTime} דקות
- ללא גלוטן: {gluten_note}
- מרכיבים זמינים: {ingredients_note}
- פלטפורמת מוזיקה לפלייליסט: {payload.musicPlatform}
{ingredient_rules}{title_rules}
כללי תוכן:
- כל טקסט המתכון חייב להיות בעברית.
- שמות המרכיבים בשלבים וברשימה — בעברית בלבד, ללא מילים באנגלית.
- שם האפליקציה FOOD FOR ANY MOOD נשאר באנגלית — אל תתרגם אותו.
- התאם את המנה לקטגוריה, למצב הרוח ולזמן ההכנה — אך כשיש מרכיבים, הם קודמים לכל השאר.
- matchPercentage: 70–99 לפי התאמה למרכיבים ולהעדפות.
- spiceLevel: 0–3 (0=לא חריף, 3=חריף).
- nutrition: הערכה סבירה ל-2 מנות.
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
            servings=2,
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
        nutrition=recipe.nutrition,
        healthScore=recipe.healthScore,
        tags=recipe.tags,
        playlist=recipe.playlist,
    )


def _fallback_recipe_from_ingredients(payload: GenerateRecipeRequest) -> GeneratedRecipe:
    user_ingredients = parse_user_ingredients(payload.ingredients)
    raw = build_ingredient_fallback_recipe(
        user_ingredients=user_ingredients,
        category=payload.category,
        mood=payload.mood,
        cooking_time=payload.cookingTime,
        is_gluten_free=payload.isGlutenFree,
        music_platform=payload.musicPlatform,
        build_playlist=_build_playlist,
    )
    return GeneratedRecipe(
        name=raw["name"],
        description=raw["description"],
        ingredients=raw["ingredients"],
        steps=raw["steps"],
        matchPercentage=raw["matchPercentage"],
        spiceLevel=raw["spiceLevel"],
        nutrition=Nutrition(**raw["nutrition"]),
        healthScore=raw["healthScore"],
        tags=raw["tags"],
        playlist=raw["playlist"],
    )


def generate_recipe_with_ingredient_validation(
    payload: GenerateRecipeRequest,
) -> GeneratedRecipe:
    """Try Gemini (with one strict retry), parse Hebrew ingredients, then fallback."""
    user_ingredients = parse_user_ingredients(payload.ingredients)

    recipe = _post_process_recipe(generate_recipe_with_gemini(payload, strict=False), payload)

    if not user_ingredients:
        return recipe

    validation = validate_recipe_relevance(
        user_ingredients, _recipe_to_validation_dict(recipe)
    )
    quality_ok = is_recipe_acceptable(payload.ingredients, _recipe_to_validation_dict(recipe))

    if validation["ok"] and quality_ok:
        return recipe

    print(
        "[FOOD FOR ANY MOOD] Recipe relevance/quality low "
        f"(ratio={validation['match_ratio']:.2f}, "
        f"title_ok={validation['title_has_ingredient']}, quality_ok={quality_ok}) "
        "— retrying with strict prompt"
    )

    recipe = _post_process_recipe(generate_recipe_with_gemini(payload, strict=True), payload)
    validation = validate_recipe_relevance(
        user_ingredients, _recipe_to_validation_dict(recipe)
    )
    quality_ok = is_recipe_acceptable(payload.ingredients, _recipe_to_validation_dict(recipe))

    if validation["ok"] and quality_ok:
        return recipe

    print(
        "[FOOD FOR ANY MOOD] Strict retry still failed quality checks — "
        "using ingredient-based fallback recipe"
    )
    return _fallback_recipe_from_ingredients(payload)


def generate_mock_recipe(payload: GenerateRecipeRequest) -> GeneratedRecipe:
    """Hebrew mock fallback when Gemini fails or is not configured."""
    user_ingredients = parse_user_ingredients(payload.ingredients)

    if user_ingredients:
        return _fallback_recipe_from_ingredients(payload)

    template = CATEGORY_RECIPES[payload.category]

    ingredients = list(template["base_ingredients"])
    if payload.isGlutenFree:
        ingredients = [
            item.replace("פסטה", "פסטה ללא גלוטן")
            .replace("רוטב סויה", "רוטב סויה ללא גלוטן")
            for item in ingredients
        ]
        if "ללא גלוטן" not in " ".join(ingredients):
            ingredients.append("מותאם ללא גלוטן")

    ingredients.extend(["מלח", "פלפל שחור", "שמן זית"])

    mood_text = MOOD_DESCRIPTIONS.get(payload.mood, "טעימים")
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

    return GeneratedRecipe(
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
            servings=2,
        ),
        healthScore=template["healthScore"],
        tags=tags,
        playlist=_build_playlist(payload.musicPlatform, match_percentage),
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
    print(
        "[FOOD FOR ANY MOOD] Received request body:",
        {
            "category": payload.category,
            "ingredients": payload.ingredients,
            "cookingTime": payload.cookingTime,
            "mood": payload.mood,
            "isGlutenFree": payload.isGlutenFree,
            "musicPlatform": payload.musicPlatform,
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
