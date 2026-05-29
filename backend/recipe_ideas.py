"""Generate alternative dish ideas from the same ingredients (Gemini + fallback)."""

from __future__ import annotations

import asyncio
import random
from typing import Literal

from google import genai
from ingredient_relevance import MOOD_DESCRIPTIONS, parse_user_ingredients
from pydantic import BaseModel, Field, ValidationError

Category = Literal["dairy", "meat", "parve"]
Mood = Literal["happy", "cozy", "energetic", "relaxed", "adventurous", "comfort"]

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


class RecipeIdea(BaseModel):
    title: str
    description: str
    cookingTime: int = Field(ge=5, le=180)
    matchReason: str


class GeminiRecipeIdea(BaseModel):
    title: str
    description: str
    cookingTime: int
    matchReason: str


class GeminiRecipeIdeasOutput(BaseModel):
    ideas: list[GeminiRecipeIdea] = Field(default_factory=list)


class MoreRecipeIdeasRequest(BaseModel):
    category: Category
    ingredients: str = ""
    cookingTime: int = Field(default=30, ge=5, le=180)
    mood: Mood = "cozy"
    isGlutenFree: bool = False
    excludeTitle: str = ""


class MoreRecipeIdeasResponse(BaseModel):
    ideas: list[RecipeIdea]
    source: Literal["gemini", "fallback"]


def _normalize_title(title: str) -> str:
    return " ".join(str(title or "").strip().lower().split())


def _dedupe_ideas(ideas: list[RecipeIdea], exclude_title: str) -> list[RecipeIdea]:
    seen: set[str] = set()
    exclude = _normalize_title(exclude_title)
    result: list[RecipeIdea] = []

    for idea in ideas:
        key = _normalize_title(idea.title)
        if not key or key == exclude or key in seen:
            continue
        seen.add(key)
        result.append(idea)
        if len(result) >= 3:
            break

    return result


def _build_gemini_prompt(payload: MoreRecipeIdeasRequest) -> str:
    category_label = CATEGORY_LABELS[payload.category]
    mood_label = MOOD_LABELS[payload.mood]
    user_ingredients = parse_user_ingredients(payload.ingredients)
    ingredients_note = ", ".join(user_ingredients) if user_ingredients else "לא צוינו"
    gluten_note = "כן" if payload.isGlutenFree else "לא"
    exclude_note = (
        f'\n- אל תציע את המנה: "{payload.excludeTitle.strip()}"'
        if payload.excludeTitle.strip()
        else ""
    )

    return f"""אתה שף ישראלי. הצע 3 רעיונות שונים למנות אמיתיות (לא מתכון מלא).
הכל בעברית.

מרכיבים זמינים: {ingredients_note}
קטגוריה: {category_label}
מצב רוח: {mood_label} ({MOOD_DESCRIPTIONS.get(payload.mood, "")})
זמן הכנה מקסימלי: {payload.cookingTime} דקות
ללא גלוטן: {gluten_note}
{exclude_note}

לכל רעיון החזר:
- title: שם מנה אמיתי בעברית (לא מצב רוח)
- description: משפט קצר על המנה
- cookingTime: דקות (5–{payload.cookingTime})
- matchReason: משפט קצר — למה המנה מתאימה למרכיבים

חובה: 3 מנות שונות זו מזו, ריאליות, מבוססות על המרכיבים.
החזר JSON בלבד לפי הסכימה."""


def generate_ideas_with_gemini(
    client: genai.Client,
    model: str,
    payload: MoreRecipeIdeasRequest,
) -> list[RecipeIdea]:
    prompt = _build_gemini_prompt(payload)
    schema = GeminiRecipeIdeasOutput.model_json_schema()

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_json_schema": schema,
        },
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response")

    parsed = GeminiRecipeIdeasOutput.model_validate_json(response.text)
    ideas = [
        RecipeIdea(
            title=idea.title.strip(),
            description=idea.description.strip(),
            cookingTime=max(5, min(payload.cookingTime, int(idea.cookingTime))),
            matchReason=idea.matchReason.strip(),
        )
        for idea in parsed.ideas
        if idea.title.strip() and idea.description.strip() and idea.matchReason.strip()
    ]
    ideas = _dedupe_ideas(ideas, payload.excludeTitle)
    if len(ideas) < 3:
        raise ValueError("Gemini returned fewer than 3 unique ideas")
    return ideas[:3]


def _pick_ingredients(raw: str) -> tuple[str, str, str]:
    items = parse_user_ingredients(raw)
    if not items:
        return "ירקות", "ביצים", "גבינה"
    padded = items + items
    return padded[0], padded[1] if len(items) > 1 else padded[0], padded[2] if len(items) > 2 else padded[1]


def build_fallback_ideas(payload: MoreRecipeIdeasRequest) -> list[RecipeIdea]:
    a, b, c = _pick_ingredients(payload.ingredients)
    mood_text = MOOD_DESCRIPTIONS.get(payload.mood, "טעימים")
    max_time = payload.cookingTime
    templates = [
        RecipeIdea(
            title=f"סלט {a} ו-{b}",
            description=f"סלט טרי וקליל — מנה {mood_text}.",
            cookingTime=min(max_time, max(10, max_time // 3)),
            matchReason=f"משתמש ב-{a} וב-{b} שיש לך, בלי בישול מורכב.",
        ),
        RecipeIdea(
            title=f"מוקפץ {a} עם {b}",
            description=f"מוקפץ מהיר ב{max_time // 2} דקות — מנה {mood_text}.",
            cookingTime=min(max_time, max(15, max_time // 2)),
            matchReason=f"מחבר את {a} ו-{b} למנה חמה ומשביעה.",
        ),
        RecipeIdea(
            title=f"חביתת {c}",
            description="חביתה עשירה — ארוחה פשוטה ומנחמת.",
            cookingTime=min(max_time, 20),
            matchReason=f"מדגיש את {c} כמרכיב מרכזי במנה קלה.",
        ),
    ]

    if payload.category == "meat" and "בשר" not in a and "עוף" not in a:
        templates[1] = RecipeIdea(
            title=f"קציצות {a} בתנור",
            description="קציצות אפויות — מנה בשרית ביתית.",
            cookingTime=min(max_time, 35),
            matchReason=f"מנצל את {a} ו-{b} במנה בשרית מספקת.",
        )
    elif payload.category == "parve":
        templates[2] = RecipeIdea(
            title=f"תבשיל {a} ו-{c}",
            description="תבשיל פרווה עשיר — מושלם לארוחה משפחתית.",
            cookingTime=min(max_time, 40),
            matchReason=f"שילוב {a} ו-{c} במנה פרווה מאוזנת.",
        )

    if payload.isGlutenFree:
        for idea in templates:
            if "פסטה" in idea.title:
                idea.title = idea.title.replace("פסטה", "אורז")

    ideas = _dedupe_ideas(templates, payload.excludeTitle)
    while len(ideas) < 3:
        extra = RecipeIdea(
            title=f"מנה מהירה עם {a}",
            description=f"רעיון נוסף {mood_text} — מתאים ל-{max_time} דקות.",
            cookingTime=min(max_time, 25 + random.randint(0, 10)),
            matchReason=f"מבוסס על {a} מהמרכיבים שסיפקת.",
        )
        ideas = _dedupe_ideas(ideas + [extra], payload.excludeTitle)

    return ideas[:3]


async def generate_recipe_ideas_with_fallback(
    client: genai.Client | None,
    model: str,
    payload: MoreRecipeIdeasRequest,
) -> tuple[list[RecipeIdea], Literal["gemini", "fallback"]]:
    if client is None:
        return build_fallback_ideas(payload), "fallback"

    try:
        ideas = await asyncio.to_thread(generate_ideas_with_gemini, client, model, payload)
        print(f"[FOOD FOR ANY MOOD] Recipe ideas (Gemini): {[i.title for i in ideas]}")
        return ideas, "gemini"
    except (ValidationError, RuntimeError, ValueError, Exception) as exc:
        print(f"[FOOD FOR ANY MOOD] Recipe ideas Gemini failed: {exc}")
        return build_fallback_ideas(payload), "fallback"
