"""Upgrade an existing generated recipe (Gemini + Hebrew fallback)."""

from __future__ import annotations

from typing import Literal

from google import genai
from ingredient_relevance import MOOD_DESCRIPTIONS, parse_user_ingredients
from kosher_category_definitions import build_kosher_rules_he
from pydantic import BaseModel, Field, ValidationError
from upgrade_content_quality import (
    CONCRETE_PROMPT_RULES,
    build_concrete_recipe_upgrade,
    sanitize_recipe_upgrade,
)

Category = Literal["dairy", "meat", "parve", "any"]
Mood = Literal["happy", "cozy", "energetic", "relaxed", "adventurous", "comfort"]
RecipeType = Literal["meal", "dessert"]

CATEGORY_LABELS: dict[str, str] = {
    "dairy": "חלבי",
    "meat": "בשרי",
    "parve": "פרווה",
    "any": "ללא העדפה",
}

MOOD_LABELS: dict[Mood, str] = {
    "happy": "שמח",
    "cozy": "נעים וחמים",
    "energetic": "אנרגטי",
    "relaxed": "רגוע",
    "adventurous": "הרפתקני",
    "comfort": "מנחם",
}

RECIPE_TYPE_LABELS: dict[RecipeType, str] = {
    "meal": "ארוחה",
    "dessert": "קינוח",
}


class RecipeUpgradeOutput(BaseModel):
    upgradedTitle: str
    changes: list[str] = Field(default_factory=list)
    upgradedIngredients: list[str] = Field(default_factory=list)
    preparationNotes: list[str] = Field(default_factory=list)
    servingSuggestion: str = ""
    premiumTouch: str = ""
    nutritionImpact: str = ""


class UpgradeRecipeRequest(BaseModel):
    name: str
    description: str = ""
    ingredients: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    category: Category = "parve"
    recipeType: RecipeType = "meal"
    mood: Mood = "cozy"
    cookingTime: int = Field(default=30, ge=5, le=180)
    isGlutenFree: bool = False
    language: str = "he"


class UpgradeRecipeResponse(BaseModel):
    upgrade: RecipeUpgradeOutput
    source: Literal["gemini", "fallback"] = "fallback"
    ok: bool = True
    error: str | None = None


def _gluten_note(is_gluten_free: bool) -> str:
    return "כן — אל תכלול גלוטן" if is_gluten_free else "לא"


def _build_upgrade_prompt(payload: UpgradeRecipeRequest) -> str:
    category = payload.category if payload.category in CATEGORY_LABELS else "parve"
    category_label = CATEGORY_LABELS.get(category, "פרווה")
    kosher = build_kosher_rules_he(category=category, category_label=category_label)
    mood_label = MOOD_LABELS.get(payload.mood, payload.mood)
    mood_desc = MOOD_DESCRIPTIONS.get(payload.mood, "")
    type_label = RECIPE_TYPE_LABELS.get(payload.recipeType, "ארוחה")
    ingredients = [str(i).strip() for i in payload.ingredients if str(i).strip()]
    user_ingredients = parse_user_ingredients(", ".join(ingredients))
    ingredients_text = ", ".join(user_ingredients) if user_ingredients else ", ".join(ingredients)

    steps_text = "\n".join(f"{i + 1}. {step}" for i, step in enumerate(payload.steps[:12]))

    return f"""אתה שף ישראלי. שדרג/י את המתכון הבא — גרסה מעודנת ומרשימה יותר, מבוססת על אותם מרכיבים ובחירות המשתמש.
הכל בעברית.

מתכון מקורי:
- שם: {payload.name.strip()}
- תיאור: {payload.description.strip()}
- מרכיבים: {ingredients_text or "לא צוינו"}
- סוג: {type_label}
- קטגוריה: {category_label}
- מצב רוח: {mood_label} ({mood_desc})
- זמן הכנה: {payload.cookingTime} דקות
- ללא גלוטן: {_gluten_note(payload.isGlutenFree)}

{kosher.strip()}

שלבי הכנה נוכחיים:
{steps_text or "לא צוינו"}

החזר JSON עם:
- upgradedTitle: כותרת עם מרכיבים ספציפיים (לא "גרסה משודרגת")
- changes: 3–5 שינויים — כל שורה = מרכיבים עם כמויות + פעולה (דקות/טמפרטורה)
- upgradedIngredients: מרכיבים נוספים — כל שורה עם כמות (גרם/כפות/יחידות)
- preparationNotes: 3–5 הערות הכנה — פעולות מדידות (למשל "בשלו 5 דקות נוספות")
- servingSuggestion: הגשה עם כמויות (כפות, גרם, מספר מנות)
- premiumTouch: גימור אחרון עם כמות מדויקת
- nutritionImpact: השפעה תזונתית עם מספרים (קcal, גרם חלבון/שומן)

{CONCRETE_PROMPT_RULES.strip()}

דוגמה לשינוי טוב: "הוסיפו 1 פלפל אדום קלוי, 80 גרם פטה, חצי כפית כמון — בשלו 5 דקות לפני הביצים."
דוגמה לשינוי אסור: "שיפור תיבול ומרקמים"

חובה: שדרוג מבוסס על המתכון בפועל, לא מתכון חדש."""


def _fallback_upgrade(payload: UpgradeRecipeRequest) -> RecipeUpgradeOutput:
    data = build_concrete_recipe_upgrade(payload)
    return RecipeUpgradeOutput(**data)


def upgrade_recipe_with_fallback(
    client: genai.Client | None,
    model: str,
    payload: UpgradeRecipeRequest,
) -> UpgradeRecipeResponse:
    fallback = _fallback_upgrade(payload)

    print(
        "[FOOD FOR ANY MOOD] upgrade_recipe payload:",
        {
            "name": payload.name,
            "category": payload.category,
            "recipeType": payload.recipeType,
            "mood": payload.mood,
            "cookingTime": payload.cookingTime,
            "isGlutenFree": payload.isGlutenFree,
            "ingredientCount": len(payload.ingredients),
            "stepCount": len(payload.steps),
            "language": payload.language,
        },
    )

    if client is None:
        print("[FOOD FOR ANY MOOD] upgrade_recipe: no Gemini client — using fallback")
        response = UpgradeRecipeResponse(upgrade=fallback, source="fallback")
        print("[FOOD FOR ANY MOOD] upgrade_recipe response:", response.model_dump())
        return response

    try:
        prompt = _build_upgrade_prompt(payload)
        schema = RecipeUpgradeOutput.model_json_schema()
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": schema,
            },
        )
        if not response.text:
            raise RuntimeError("Empty Gemini response")
        upgrade = RecipeUpgradeOutput.model_validate_json(response.text)
        upgrade = sanitize_recipe_upgrade(upgrade, payload)
        result = UpgradeRecipeResponse(upgrade=upgrade, source="gemini")
        print("[FOOD FOR ANY MOOD] upgrade_recipe response:", result.model_dump())
        return result
    except (ValidationError, RuntimeError, Exception) as exc:
        print(f"[FOOD FOR ANY MOOD] Recipe upgrade failed: {exc}")
        result = UpgradeRecipeResponse(
            upgrade=fallback,
            source="fallback",
            ok=True,
            error=str(exc),
        )
        print("[FOOD FOR ANY MOOD] upgrade_recipe fallback response:", result.model_dump())
        return result
