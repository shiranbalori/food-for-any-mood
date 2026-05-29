"""AI Nutrition Coach — macro analysis, insights, and health tips."""

from __future__ import annotations

import asyncio
import re
from typing import Literal

from google import genai
from pydantic import BaseModel, Field, ValidationError

MacroLevel = Literal["high", "medium", "low"]

FIBER_KEYWORDS = (
    "ברוקולי",
    "עדש",
    "חומוס",
    "קינוא",
    "תרד",
    "שיבולת",
    "כוסמת",
    "אפונה",
    "שעועית",
    "ירק",
    "סלט",
    "כרוב",
    "גזר",
    "broccoli",
    "lentil",
    "chickpea",
    "quinoa",
    "spinach",
    "oats",
    "bean",
    "vegetable",
)

HEAVY_KEYWORDS = (
    "שמנת",
    "חמאה",
    "שמן",
    "fried",
    "cream",
    "butter",
)


class MacroLevels(BaseModel):
    protein: MacroLevel
    carbs: MacroLevel
    fat: MacroLevel
    fiber: MacroLevel


class HealthInsights(BaseModel):
    suitableForDiet: bool
    suitableForKids: bool
    suitableForDinner: bool
    suitableForPostWorkout: bool


class NutritionAnalysisRequest(BaseModel):
    name: str = ""
    ingredients: list[str] = Field(default_factory=list)
    calories: int = 0
    protein: int = 0
    carbs: int = 0
    fat: int = 0
    servings: int = Field(default=2, ge=1, le=12)
    cookTime: int = Field(default=30, ge=5, le=180)
    spiceLevel: int = Field(default=0, ge=0, le=3)
    healthScore: int = Field(default=70, ge=0, le=100)


class NutritionAnalysisResponse(BaseModel):
    macroLevels: MacroLevels
    insights: HealthInsights
    nutritionScore: int = Field(ge=0, le=100)
    tips: list[str] = Field(default_factory=list)
    source: Literal["gemini", "fallback"]


class GeminiTipsOutput(BaseModel):
    tips: list[str] = Field(default_factory=list)


def _per_serving(value: int, servings: int) -> float:
    return value / max(1, servings)


def _macro_level(value: float, high: float, medium: float) -> MacroLevel:
    if value >= high:
        return "high"
    if value >= medium:
        return "medium"
    return "low"


def _estimate_fiber_level(ingredients: list[str], carbs_per_serving: float) -> MacroLevel:
    text = " ".join(ingredients).lower()
    fiber_hits = sum(1 for keyword in FIBER_KEYWORDS if keyword in text)

    if fiber_hits >= 3 or (fiber_hits >= 1 and carbs_per_serving >= 40):
        return "high"
    if fiber_hits >= 1 or carbs_per_serving >= 28:
        return "medium"
    return "low"


def _build_insights(
    payload: NutritionAnalysisRequest,
    *,
    protein_per: float,
    carbs_per: float,
    fat_per: float,
    calories_per: float,
) -> HealthInsights:
    ingredient_text = " ".join(payload.ingredients).lower()
    heavy = any(keyword in ingredient_text for keyword in HEAVY_KEYWORDS)

    return HealthInsights(
        suitableForDiet=calories_per <= 550 and fat_per <= 28 and not heavy,
        suitableForKids=payload.spiceLevel <= 1 and fat_per <= 32,
        suitableForDinner=calories_per <= 700 and fat_per <= 38,
        suitableForPostWorkout=protein_per >= 18 and carbs_per >= 25,
    )


def calculate_nutrition_score(
    payload: NutritionAnalysisRequest,
    *,
    fiber_level: MacroLevel,
    protein_per: float,
    fat_per: float,
    calories_per: float,
) -> int:
    """Rule-based nutrition score 0–100."""
    score = float(payload.healthScore or 70)

    if protein_per >= 20:
        score += 5
    elif protein_per < 10:
        score -= 4

    if fiber_level == "high":
        score += 8
    elif fiber_level == "medium":
        score += 4
    else:
        score -= 2

    if fat_per > 35:
        score -= 8
    elif fat_per <= 18:
        score += 3

    if calories_per > 650:
        score -= 10
    elif calories_per <= 450:
        score += 4

    if payload.spiceLevel >= 3:
        score -= 2

    return int(min(100, max(0, round(score))))


def build_fallback_tips(
    payload: NutritionAnalysisRequest,
    macro_levels: MacroLevels,
    insights: HealthInsights,
) -> list[str]:
    tips: list[str] = []

    if macro_levels.protein == "low":
        tips.append("כדאי להוסיף מקור חלבון — ביצה, טופו, עוף או קטנייה — לאיזון המנה.")
    elif insights.suitableForPostWorkout:
        tips.append("שילוב חלבון ופחמימות במנה הזו מתאים לשיקום אחרי אימון.")

    if macro_levels.fiber == "low":
        tips.append("הוסיפו ירק עלה ירוק או קטנייה לצד המנה כדי להעלות סיבים תזונתיים.")
    elif macro_levels.fiber == "high":
        tips.append("המנה עשירה בירקות/קטניות — מצוין לשובע ולעיכול.")

    if macro_levels.fat == "high":
        tips.append("שימו לב לכמות השומן — אפשר להקטין שמן/חמאה בחצי לגרסה קלה יותר.")
    elif insights.suitableForDiet:
        tips.append("המנה מאוזנת יחסית — מתאימה לשמירה על דיאטה עם מנות בינוניות.")

    if insights.suitableForKids and payload.spiceLevel <= 1:
        tips.append("רמת התיבול עדינה — מתאימה גם לילדים.")

    if insights.suitableForDinner and len(tips) < 3:
        tips.append("מנה נוחה לערב — לא כבדה מדי וקלה לעיכול.")

    if not tips:
        tips.append("הקפידו על מנות מגוונות עם ירקות, חלבון ומעט שומן איכותי.")

    return tips[:3]


def build_nutrition_analysis(payload: NutritionAnalysisRequest) -> NutritionAnalysisResponse:
    servings = max(1, payload.servings)
    protein_per = _per_serving(payload.protein, servings)
    carbs_per = _per_serving(payload.carbs, servings)
    fat_per = _per_serving(payload.fat, servings)
    calories_per = _per_serving(payload.calories, servings)

    macro_levels = MacroLevels(
        protein=_macro_level(protein_per, 25, 12),
        carbs=_macro_level(carbs_per, 50, 25),
        fat=_macro_level(fat_per, 25, 12),
        fiber=_estimate_fiber_level(payload.ingredients, carbs_per),
    )
    insights = _build_insights(
        payload,
        protein_per=protein_per,
        carbs_per=carbs_per,
        fat_per=fat_per,
        calories_per=calories_per,
    )
    nutrition_score = calculate_nutrition_score(
        payload,
        fiber_level=macro_levels.fiber,
        protein_per=protein_per,
        fat_per=fat_per,
        calories_per=calories_per,
    )
    tips = build_fallback_tips(payload, macro_levels, insights)

    return NutritionAnalysisResponse(
        macroLevels=macro_levels,
        insights=insights,
        nutritionScore=nutrition_score,
        tips=tips,
        source="fallback",
    )


def _build_gemini_tips_prompt(payload: NutritionAnalysisRequest, analysis: NutritionAnalysisResponse) -> str:
    ingredients = ", ".join(payload.ingredients[:12]) or "לא צוינו"
    return f"""אתה מאמן תזונה ישראלי. תן 2–3 טיפים בריאותיים קצרים בעברית למנה:
שם: {payload.name}
מרכיבים: {ingredients}
למנה (כ-{payload.servings} מנות): {payload.calories} קלוריות, חלבון {payload.protein}g, פחמימות {payload.carbs}g, שומן {payload.fat}g
ציון תזונה: {analysis.nutritionScore}/100

החזר JSON בלבד: {{"tips": ["...", "..."]}}
- 2–3 משפטים מעשיים
- בעברית בלבד
- ללא אבחנות רפואיות"""


def _clean_tips(raw_tips: list[str]) -> list[str]:
    cleaned: list[str] = []
    for tip in raw_tips:
        text = re.sub(r"\s+", " ", str(tip or "").strip())
        if len(text) >= 8:
            cleaned.append(text)
        if len(cleaned) >= 3:
            break
    return cleaned


def enrich_with_gemini_tips(
    client: genai.Client,
    model: str,
    payload: NutritionAnalysisRequest,
    analysis: NutritionAnalysisResponse,
) -> NutritionAnalysisResponse:
    prompt = _build_gemini_tips_prompt(payload, analysis)
    schema = GeminiTipsOutput.model_json_schema()

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

    parsed = GeminiTipsOutput.model_validate_json(response.text)
    tips = _clean_tips(parsed.tips)
    if len(tips) < 2:
        raise ValueError("Gemini returned too few tips")

    return NutritionAnalysisResponse(
        macroLevels=analysis.macroLevels,
        insights=analysis.insights,
        nutritionScore=analysis.nutritionScore,
        tips=tips,
        source="gemini",
    )


async def analyze_nutrition_with_fallback(
    client: genai.Client | None,
    model: str,
    payload: NutritionAnalysisRequest,
) -> NutritionAnalysisResponse:
    analysis = build_nutrition_analysis(payload)

    if client is None:
        return analysis

    try:
        enriched = await asyncio.to_thread(enrich_with_gemini_tips, client, model, payload, analysis)
        print(f"[FOOD FOR ANY MOOD] Nutrition coach (Gemini tips): {payload.name}")
        return enriched
    except (ValidationError, RuntimeError, ValueError, Exception) as exc:
        print(f"[FOOD FOR ANY MOOD] Nutrition coach Gemini failed: {exc}")
        return analysis
