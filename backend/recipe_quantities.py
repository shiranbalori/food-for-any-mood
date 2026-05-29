"""Assign realistic ingredient quantities, sync steps, and compute nutrition."""

from __future__ import annotations

import re

from ingredient_relevance import canonical_ingredient, normalize_ingredient

DEFAULT_SERVINGS = 2
PANTRY_SUFFIX = re.compile(r"\s*\([^)]*\)\s*$")
QTY_PREFIX = re.compile(
    r"^[\d./]+\s*(?:כפית|כפיות|כף|כפות|גרם|מ\"ל|כוס|כוסות|tsp|tbsp|gram|grams|g|ml|cup|cups)?\s*",
    re.IGNORECASE,
)

UNIT_LABELS = {
    "he": {"tsp": "כפית", "tbsp": "כף", "gram": "גרם", "ml": "מ\"ל", "cup": "כוס"},
    "en": {"tsp": "tsp", "tbsp": "tbsp", "gram": "gram", "ml": "ml", "cup": "cup"},
}

HEBREW_LABELS: dict[str, str] = {
    "egg": "ביצה",
    "eggs": "ביצים",
    "tomato": "עגבניה בינונית",
    "onion": "בצל בינוני",
    "garlic": "שן שום",
    "potato": "תפוח אדמה בינוני",
    "carrot": "גזר",
    "bell pepper": "פלפל גמבה",
    "salt": "מלח",
    "black pepper": "פלפל שחור",
    "olive oil": "שמן זית",
    "pasta": "פסטה",
    "rice": "אורז",
    "cream": "שמנת מתוקה",
    "milk": "חלב",
    "chicken": "עוף",
    "beef": "בשר בקר",
    "tofu": "טופו",
    "mushroom": "פטריות",
    "broccoli": "ברוקולי",
    "cheese": "גבינה",
    "butter": "חמאה",
    "lentils": "עדשים",
    "chickpeas": "גרגרי חומוס",
    "quinoa": "קינואה",
    "flour": "קמח",
    "sugar": "סוכר",
    "honey": "דבש",
    "soy sauce": "רוטב סויה",
    "coconut milk": "חלב קוקוס",
    "broth": "ציר",
    "tuna": "טונה",
    "yogurt": "יוגורט",
}

QUANTITY_PROFILES: dict[str, dict] = {
    "egg": {"unit": "whole", "base": 1, "per_serving": True, "singular": "ביצה", "plural": "ביצים"},
    "eggs": {"unit": "whole", "base": 1, "per_serving": True, "singular": "ביצה", "plural": "ביצים"},
    "tomato": {
        "unit": "whole",
        "base": 0.5,
        "per_serving": True,
        "singular": "עגבניה בינונית",
        "plural": "עגבניות בינוניות",
    },
    "onion": {
        "unit": "whole",
        "base": 0.5,
        "per_serving": True,
        "singular": "בצל בינוני",
        "plural": "בצלות בינוניות",
    },
    "garlic": {"unit": "whole", "base": 2, "per_serving": False, "singular": "שן שום", "plural": "שיני שום"},
    "potato": {
        "unit": "whole",
        "base": 1,
        "per_serving": True,
        "singular": "תפוח אדמה בינוני",
        "plural": "תפוחי אדמה בינוניים",
    },
    "carrot": {"unit": "whole", "base": 1, "per_serving": True, "singular": "גזר", "plural": "גזרים"},
    "bell pepper": {
        "unit": "whole",
        "base": 1,
        "per_serving": True,
        "singular": "פלפל גמבה",
        "plural": "פלפלים גמבה",
    },
    "salt": {"unit": "tsp", "base": 0.25, "per_serving": False},
    "black pepper": {"unit": "tsp", "base": 0.125, "per_serving": False},
    "olive oil": {"unit": "tbsp", "base": 1, "per_serving": False},
    "olive": {"unit": "tbsp", "base": 1, "per_serving": False},
    "oil": {"unit": "tbsp", "base": 1, "per_serving": False},
    "pasta": {"unit": "gram", "base": 100, "per_serving": True},
    "rice": {"unit": "cup", "base": 0.5, "per_serving": True},
    "cream": {"unit": "ml", "base": 100, "per_serving": True},
    "milk": {"unit": "ml", "base": 150, "per_serving": True},
    "chicken": {"unit": "gram", "base": 150, "per_serving": True},
    "beef": {"unit": "gram", "base": 150, "per_serving": True},
    "steak": {"unit": "gram", "base": 180, "per_serving": True},
    "lamb": {"unit": "gram", "base": 150, "per_serving": True},
    "tofu": {"unit": "gram", "base": 120, "per_serving": True},
    "mushroom": {"unit": "gram", "base": 80, "per_serving": True},
    "broccoli": {"unit": "gram", "base": 100, "per_serving": True},
    "spinach": {"unit": "gram", "base": 80, "per_serving": True},
    "cheese": {"unit": "gram", "base": 50, "per_serving": True},
    "butter": {"unit": "tbsp", "base": 1, "per_serving": False},
    "lentils": {"unit": "cup", "base": 0.5, "per_serving": True},
    "chickpeas": {"unit": "cup", "base": 0.5, "per_serving": True},
    "quinoa": {"unit": "cup", "base": 0.5, "per_serving": True},
    "flour": {"unit": "cup", "base": 0.25, "per_serving": False},
    "sugar": {"unit": "tbsp", "base": 1, "per_serving": False},
    "honey": {"unit": "tbsp", "base": 1, "per_serving": False},
    "soy sauce": {"unit": "tbsp", "base": 2, "per_serving": False},
    "coconut milk": {"unit": "ml", "base": 200, "per_serving": True},
    "broth": {"unit": "ml", "base": 250, "per_serving": True},
    "tuna": {"unit": "gram", "base": 120, "per_serving": True},
    "yogurt": {"unit": "ml", "base": 120, "per_serving": True},
}

NUTRITION_PER_UNIT: dict[str, dict[str, dict[str, float]]] = {
    "whole": {
        "egg": {"calories": 70, "protein": 6, "carbs": 0.5, "fat": 5},
        "eggs": {"calories": 70, "protein": 6, "carbs": 0.5, "fat": 5},
        "tomato": {"calories": 22, "protein": 1, "carbs": 4.8, "fat": 0.2},
        "default": {"calories": 25, "protein": 1, "carbs": 5, "fat": 0.2},
    },
    "tsp": {
        "salt": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0},
        "black pepper": {"calories": 5, "protein": 0.2, "carbs": 1, "fat": 0.1},
        "default": {"calories": 3, "protein": 0, "carbs": 0.5, "fat": 0.1},
    },
    "tbsp": {
        "olive oil": {"calories": 119, "protein": 0, "carbs": 0, "fat": 14},
        "oil": {"calories": 119, "protein": 0, "carbs": 0, "fat": 14},
        "default": {"calories": 45, "protein": 0.5, "carbs": 3, "fat": 3},
    },
    "gram": {
        "pasta": {"calories": 3.5, "protein": 0.12, "carbs": 0.71, "fat": 0.02},
        "chicken": {"calories": 1.65, "protein": 0.31, "carbs": 0, "fat": 0.036},
        "default": {"calories": 1.5, "protein": 0.05, "carbs": 0.2, "fat": 0.05},
    },
    "ml": {
        "cream": {"calories": 3.5, "protein": 0.02, "carbs": 0.03, "fat": 0.35},
        "milk": {"calories": 0.6, "protein": 0.03, "carbs": 0.05, "fat": 0.03},
        "default": {"calories": 0.5, "protein": 0.02, "carbs": 0.04, "fat": 0.02},
    },
    "cup": {
        "rice": {"calories": 685, "protein": 13, "carbs": 151, "fat": 1.3},
        "lentils": {"calories": 230, "protein": 18, "carbs": 40, "fat": 0.8},
        "default": {"calories": 180, "protein": 5, "carbs": 35, "fat": 2},
    },
}


def _format_fraction(value: float) -> str:
    rounded = round(value * 4) / 4
    whole = int(rounded)
    frac = int(round((rounded - whole) * 4))
    frac_map = {1: "1/4", 2: "1/2", 3: "3/4"}
    if whole == 0 and frac > 0:
        return frac_map.get(frac, str(rounded))
    if frac == 0:
        return str(whole)
    if whole == 0:
        return frac_map[frac]
    return f"{whole} {frac_map[frac]}"


def _round_amount(value: float, unit: str) -> float:
    if unit == "whole":
        return float(max(1, round(value)))
    if unit in {"tsp", "tbsp", "cup"}:
        return float(max(0.25, round(value * 4) / 4))
    if unit == "gram":
        return float(max(10, round(value / 10) * 10))
    if unit == "ml":
        return float(max(25, round(value / 25) * 25))
    return round(value, 2)


def _strip_quantity(raw: str) -> tuple[str, str | None]:
    trimmed = PANTRY_SUFFIX.sub("", (raw or "").strip()).strip()
    without_qty = QTY_PREFIX.sub("", trimmed).strip() or trimmed
    return without_qty, canonical_ingredient(without_qty)


def _resolve_profile(canon: str | None, name: str) -> dict:
    normalized_name = normalize_ingredient(name)
    if (
        (canon == "pepper" or "שחור" in normalized_name or "black pepper" in normalized_name)
        and "גמבה" not in normalized_name
        and "bell" not in normalized_name
    ):
        return {**QUANTITY_PROFILES["black pepper"], "canon": "black pepper"}
    if canon == "pepper":
        return {**QUANTITY_PROFILES["bell pepper"], "canon": "bell pepper"}
    if canon and canon in QUANTITY_PROFILES:
        return {**QUANTITY_PROFILES[canon], "canon": canon}
    label = HEBREW_LABELS.get(canon or "", name)
    return {
        "unit": "whole",
        "base": 1,
        "per_serving": True,
        "singular": label,
        "plural": label,
        "canon": canon or name,
    }


def _compute_amount(profile: dict, servings: int, base_servings: int = DEFAULT_SERVINGS) -> float:
    scale = servings / base_servings
    raw = profile["base"] * servings if profile.get("per_serving") else profile["base"] * scale
    return _round_amount(raw, profile["unit"])


def _format_item(canon: str, name: str, amount: float, profile: dict, language: str = "he") -> str:
    if profile["unit"] == "whole":
        count = int(round(amount))
        singular = profile.get("singular") or HEBREW_LABELS.get(canon, name)
        plural = profile.get("plural") or singular
        noun = singular if count == 1 else plural
        return f"{count} {noun}"

    display_name = HEBREW_LABELS.get(canon, name) if language == "he" else name
    unit_label = UNIT_LABELS.get(language, UNIT_LABELS["he"]).get(profile["unit"], profile["unit"])
    return f"{_format_fraction(amount)} {unit_label} {display_name}"


def quantify_ingredient(raw: str, servings: int = DEFAULT_SERVINGS, language: str = "he") -> dict:
    pantry_match = PANTRY_SUFFIX.search(raw or "")
    pantry_note = pantry_match.group(0).strip() if pantry_match else ""
    name, canon = _strip_quantity(raw)
    profile = _resolve_profile(canon, name)
    amount = _compute_amount(profile, servings)
    display = _format_item(profile["canon"], name, amount, profile, language)
    if pantry_note:
        display = f"{display} {pantry_note}"
    label = HEBREW_LABELS.get(profile["canon"], name) if language == "he" else name
    return {
        "canon": profile["canon"],
        "name": label,
        "amount": amount,
        "unit": profile["unit"],
        "display": display,
        "step_phrase": display,
    }


def sync_steps_with_quantities(steps: list[str], quantified_items: list[dict]) -> list[str]:
    replacements = sorted(
        [
            {"bare": item["name"], "step_phrase": item["step_phrase"]}
            for item in quantified_items
            if item.get("name") and item.get("step_phrase")
        ],
        key=lambda item: len(item["bare"]),
        reverse=True,
    )

    updated: list[str] = []
    for step in steps:
        text = step or ""
        for item in replacements:
            bare = item["bare"]
            phrase = item["step_phrase"]
            if phrase in text:
                continue
            text = text.replace(bare, phrase)
        updated.append(text)
    return updated


def compute_nutrition_from_quantities(quantified_items: list[dict], servings: int = DEFAULT_SERVINGS) -> dict:
    totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    for item in quantified_items:
        unit_table = NUTRITION_PER_UNIT.get(item["unit"], NUTRITION_PER_UNIT["gram"])
        macros = unit_table.get(item["canon"], unit_table["default"])
        amount = item["amount"]
        totals["calories"] += macros["calories"] * amount
        totals["protein"] += macros["protein"] * amount
        totals["carbs"] += macros["carbs"] * amount
        totals["fat"] += macros["fat"] * amount

    calories = round(totals["calories"])
    protein = round(totals["protein"])
    carbs = round(totals["carbs"])
    fat = round(totals["fat"])

    health_score = 72
    if protein / max(servings, 1) >= 20:
        health_score += 6
    if fat / max(servings, 1) > 28:
        health_score -= 4
    if calories / max(servings, 1) < 450:
        health_score += 3
    health_score = min(95, max(50, health_score))

    return {
        "calories": calories,
        "protein": protein,
        "carbs": carbs,
        "fat": fat,
        "servings": servings,
        "health_score": health_score,
    }


def apply_recipe_quantities(recipe: dict, *, language: str = "he", servings: int | None = None) -> dict:
    current_servings = servings or (recipe.get("nutrition") or {}).get("servings") or DEFAULT_SERVINGS
    ingredients = recipe.get("ingredients") or []
    quantified_items = [quantify_ingredient(entry, current_servings, language) for entry in ingredients]
    next_ingredients = [item["display"] for item in quantified_items]
    next_steps = sync_steps_with_quantities(recipe.get("steps") or [], quantified_items)
    nutrition = compute_nutrition_from_quantities(quantified_items, current_servings)
    health_score = nutrition.pop("health_score")

    merged_nutrition = {**(recipe.get("nutrition") or {}), **nutrition, "servings": current_servings}
    return {
        **recipe,
        "ingredients": next_ingredients,
        "steps": next_steps,
        "nutrition": merged_nutrition,
        "healthScore": health_score,
    }
