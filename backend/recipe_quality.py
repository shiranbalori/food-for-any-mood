"""Post-Gemini recipe quality checks: type, ingredients, time, kosher category."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

from ingredient_allowlist import find_unauthorized_recipe_ingredients
from ingredient_relevance import MIN_INGREDIENT_MATCH_RATIO, validate_recipe_relevance

RecipeType = Literal["meal", "dessert"]
Category = Literal["dairy", "meat", "parve"]

TIME_BUFFER_RATIO = 1.35
TIME_BUFFER_MINUTES = 15

DESSERT_SIGNALS = (
    "עוגה",
    "עוגיות",
    "עוג",
    "קינוח",
    "מוס",
    "סורבה",
    "בראוניז",
    "בראונ",
    "טירמיסו",
    "פנקייק",
    "וופל",
    "מאפינ",
    "מאפה מתוק",
    "שוקולד",
    "קרם",
    "גלידה",
    "סוכר",
    "דבש",
    "מתוק",
    "וניל",
    "קינמון וסוכר",
)

STRONG_DESSERT_NAME_SIGNALS = (
    "עוגה",
    "עוגיות",
    "קינוח",
    "מוס",
    "סורבה",
    "טירמיסו",
    "בראוניז",
    "גלידה",
    "פנקייק",
    "מאפין",
    "בראונ",
)

DESSERT_TITLE_REQUIRED = STRONG_DESSERT_NAME_SIGNALS + (
    "מתוק",
    "שוקולד",
    "קרם",
    "וופל",
    "cake",
    "cookie",
    "brownie",
    "muffin",
    "dessert",
    "cheesecake",
    "chocolate",
)

SAVORY_BLOCKED_FOR_DESSERT = (
    "תבשיל ביתי",
    "תבשיל",
    "מרק",
    "שקשוק",
    "סלט",
    "פסטה",
    "מוקפץ",
    "עוף",
    "בשר",
    "חבית",
    "אורז",
    "טונה",
    "נודלס",
    "Lasagna",
    "מנה עיקרית",
    "ארוחה",
    "צלי",
    "קציצ",
)

MEAL_DESSERT_BLOCKED_IN_TITLE = (
    "עוגה",
    "עוגיות",
    "קינוח",
    "מוס",
    "בראוניז",
    "בראונ",
    "מאפין",
    "muffin",
    "גלידה",
    "טירמיסו",
    "סורבה",
    "מתוק",
    "שוקולד",
    "עוג",
    "cake",
    "cookie",
    "cookies",
    "brownie",
    "dessert",
    "cheesecake",
    "chocolate",
)

SAVORY_MEAL_SIGNALS = (
    "שקשוק",
    "סלט",
    "מרק",
    "תבשיל",
    "מוקפץ",
    "קציצ",
    "צלי",
    "סטייק",
    "פסטה",
    "אורז",
    "טונה",
    "חבית",
    "מנה עיקרית",
    "ארוחה",
)

MEAT_PATTERNS = (
    r"עוף",
    r"חזה\s*עוף",
    r"כרע(?:יים)?",
    r"בשר",
    r"בקר",
    r"כבש",
    r"הודו",
    r"טורק",
    r"נקניק",
    r"קבב",
    r"סטייק",
    r"כבד",
    r"מרג(?:ז|ע)",
    r"צלי(?:ה|ת)?",
    r"chicken",
    r"beef",
    r"\bmeat\b",
    r"steak",
    r"turkey",
    r"lamb",
    r"pork",
    r"ground beef",
)

DAIRY_PATTERNS = (
    r"חלב",
    r"גבינ",
    r"שמנת",
    r"חמאה",
    r"יוגורט",
    r"קוטג",
    r"מוצרל",
    r"פרמז",
    r"ריקוט",
    r"מסקרפונ",
    r"\bmilk\b",
    r"cheese",
    r"cream",
    r"butter",
    r"yogurt",
    r"ricotta",
    r"parmesan",
    r"cream cheese",
)


@dataclass
class RecipeQualityResult:
    ok: bool
    reasons: list[str] = field(default_factory=list)


def recipe_text_blob(recipe: dict) -> str:
    parts = [recipe.get("name", ""), recipe.get("description", "")]
    parts.extend(recipe.get("ingredients") or [])
    parts.extend(recipe.get("steps") or [])
    parts.extend(recipe.get("tags") or [])
    return " ".join(str(part) for part in parts).lower()


def title_has_dessert_keyword(title: str) -> bool:
    text = (title or "").lower()
    if any(keyword in text for keyword in DESSERT_TITLE_REQUIRED):
        return True
    return "עוג" in text


def title_has_savory_block(title: str) -> bool:
    text = (title or "").lower()
    return any(blocked in text for blocked in SAVORY_BLOCKED_FOR_DESSERT)


def validateRecipeType(recipe_type: RecipeType, recipe: dict) -> bool:
    """Hard recipe-type gate: dessert titles must name a dessert; meals must not."""
    return validate_recipe_type(recipe_type, recipe)


def is_likely_dessert(recipe: dict) -> bool:
    name = (recipe.get("name") or "").lower()
    text = recipe_text_blob(recipe)

    if any(signal in name for signal in STRONG_DESSERT_NAME_SIGNALS):
        return True

    dessert_hits = sum(1 for signal in DESSERT_SIGNALS if signal in text)
    return dessert_hits >= 2


def is_clearly_savory_meal(recipe: dict) -> bool:
    name = (recipe.get("name") or "").lower()
    text = recipe_text_blob(recipe)
    if any(signal in name for signal in STRONG_DESSERT_NAME_SIGNALS):
        return False
    if is_likely_dessert(recipe):
        return False
    return any(signal in text for signal in SAVORY_MEAL_SIGNALS)


def validate_recipe_type(recipe_type: RecipeType, recipe: dict) -> bool:
    name = (recipe.get("name") or "").strip()
    if recipe_type == "dessert":
        if not title_has_dessert_keyword(name):
            return False
        if title_has_savory_block(name):
            return False
        if is_clearly_savory_meal(recipe):
            return False
        text = recipe_text_blob(recipe)
        if any(blocked in text for blocked in SAVORY_BLOCKED_FOR_DESSERT):
            savory_hits = sum(1 for signal in SAVORY_MEAL_SIGNALS if signal in text)
            if savory_hits >= 1 and not title_has_dessert_keyword(name):
                return False
        return True
    if recipe_type == "meal":
        lower_name = name.lower()
        if any(keyword in lower_name for keyword in MEAL_DESSERT_BLOCKED_IN_TITLE):
            return False
        if "עוג" in lower_name:
            return False
        if title_has_dessert_keyword(name) and is_likely_dessert(recipe):
            return False
        return True
    return True


def recipe_has_meat(recipe: dict) -> bool:
    text = recipe_text_blob(recipe)
    return any(re.search(pattern, text) for pattern in MEAT_PATTERNS)


def recipe_has_dairy(recipe: dict) -> bool:
    text = recipe_text_blob(recipe)
    return any(re.search(pattern, text) for pattern in DAIRY_PATTERNS)


def is_invalid_recipe_selection(recipe_type: RecipeType, category: Category) -> bool:
    """Dessert + meat category is never allowed."""
    return recipe_type == "dessert" and category == "meat"


def is_dairy_dessert_valid(recipe: dict) -> bool:
    if not validate_recipe_type("dessert", recipe):
        return False
    if recipe_has_meat(recipe):
        return False
    if not recipe_has_dairy(recipe):
        return False
    text = recipe_text_blob(recipe)
    dairy_dessert_signals = (
        "עוג", "קינוח", "עוגיות", "בראונ", "מאפין", "גבינ", "שוקולד", "קרם",
        "cake", "cookie", "brownie", "muffin", "cheese", "chocolate", "cream",
    )
    return any(signal in text for signal in dairy_dessert_signals)


def is_parve_dessert_valid(recipe: dict) -> bool:
    if not validate_recipe_type("dessert", recipe):
        return False
    if recipe_has_meat(recipe) or recipe_has_dairy(recipe):
        return False
    return True


def is_meat_meal_valid(recipe: dict) -> bool:
    if not validate_recipe_type("meal", recipe):
        return False
    if recipe_has_dairy(recipe):
        return False
    if not recipe_has_meat(recipe):
        return False
    name = (recipe.get("name") or "").lower()
    return not title_has_dessert_keyword(name)


def is_dairy_meal_valid(recipe: dict) -> bool:
    if not validate_recipe_type("meal", recipe):
        return False
    if recipe_has_meat(recipe):
        return False
    if not recipe_has_dairy(recipe):
        return False
    name = (recipe.get("name") or "").lower()
    return not title_has_dessert_keyword(name)


def is_parve_meal_valid(recipe: dict) -> bool:
    if not validate_recipe_type("meal", recipe):
        return False
    if recipe_has_meat(recipe) or recipe_has_dairy(recipe):
        return False
    return True


def validateRecipeCategory(
    recipe_type: RecipeType,
    category: Category,
    recipe: dict,
) -> bool:
    """Hard category gate: kosher rules, type+category pairing, vegetarian tag."""
    return validate_recipe_category(recipe_type, category, recipe)


def validate_recipe_category(
    recipe_type: RecipeType,
    category: Category,
    recipe: dict,
) -> bool:
    if is_invalid_recipe_selection(recipe_type, category):
        return False

    tags = [str(tag).lower() for tag in (recipe.get("tags") or [])]
    if "vegetarian" in tags and recipe_has_meat(recipe):
        return False

    if violates_kosher_category(category, recipe):
        return False

    if recipe_type == "dessert":
        if category == "dairy":
            return is_dairy_dessert_valid(recipe)
        if category == "parve":
            return is_parve_dessert_valid(recipe)
        return False

    if recipe_type == "meal":
        if category == "meat":
            return is_meat_meal_valid(recipe)
        if category == "dairy":
            return is_dairy_meal_valid(recipe)
        if category == "parve":
            return is_parve_meal_valid(recipe)

    return True


def validate_main_ingredients(user_ingredients: list[str], recipe: dict) -> bool:
    if not user_ingredients:
        return True
    result = validate_recipe_relevance(user_ingredients, recipe)
    if not result["ok"] or result["match_ratio"] < MIN_INGREDIENT_MATCH_RATIO:
        return False
    from ingredient_relevance import ingredient_appears_in_text, ingredients_match

    recipe_ingredients = recipe.get("ingredients") or []
    steps_text = "\n".join(recipe.get("steps") or [])
    for user_item in user_ingredients:
        in_list = any(ingredients_match(line, user_item) for line in recipe_ingredients)
        in_steps = ingredient_appears_in_text(user_item, steps_text)
        if not in_list or not in_steps:
            return False
    return True


def estimate_recipe_minutes(recipe: dict) -> int | None:
    text = " ".join(
        [
            recipe.get("description") or "",
            " ".join(recipe.get("steps") or []),
        ]
    )
    matches = re.findall(r"(\d+)\s*(?:דק(?:ות|'|׳)?|min(?:ute)?s?)", text, flags=re.IGNORECASE)
    if not matches:
        return None
    return max(int(value) for value in matches)


def validate_cooking_time(recipe: dict, max_minutes: int) -> bool:
    estimated = estimate_recipe_minutes(recipe)
    if estimated is None:
        return True
    allowed = int(max_minutes * TIME_BUFFER_RATIO) + TIME_BUFFER_MINUTES
    return estimated <= allowed


def violates_kosher_category(category: Category, recipe: dict) -> bool:
    text = recipe_text_blob(recipe)
    has_meat = any(re.search(pattern, text) for pattern in MEAT_PATTERNS)
    has_dairy = any(re.search(pattern, text) for pattern in DAIRY_PATTERNS)

    if category == "meat":
        return has_dairy
    if category == "dairy":
        return has_meat
    if category == "parve":
        return has_meat or has_dairy
    return False


def validate_gemini_recipe_quality(
    recipe: dict,
    *,
    recipe_type: RecipeType,
    category: Category,
    cooking_time: int,
    user_ingredients: list[str],
) -> RecipeQualityResult:
    reasons: list[str] = []

    if not validate_recipe_type(recipe_type, recipe):
        reasons.append("wrong_recipe_type")

    if not validate_recipe_category(recipe_type, category, recipe):
        reasons.append("wrong_category")

    if not validate_main_ingredients(user_ingredients, recipe):
        reasons.append("missing_main_ingredients")

    if not validate_cooking_time(recipe, cooking_time):
        reasons.append("time_mismatch")

    if violates_kosher_category(category, recipe):
        reasons.append("kosher_violation")

    unauthorized = find_unauthorized_recipe_ingredients(recipe, ",".join(user_ingredients))
    if user_ingredients and unauthorized:
        reasons.append("unauthorized_ingredients")

    return RecipeQualityResult(ok=len(reasons) == 0, reasons=reasons)


def log_quality_rejections(reasons: list[str]) -> None:
    for reason in reasons:
        if reason == "wrong_recipe_type":
            print("[FOOD FOR ANY MOOD] Rejected recipe - wrong type")
        elif reason == "wrong_category":
            print("[FOOD FOR ANY MOOD] Rejected recipe - wrong category")
        elif reason == "missing_main_ingredients":
            print("[FOOD FOR ANY MOOD] Gemini recipe rejected: missing main ingredients")
        elif reason == "time_mismatch":
            print("[FOOD FOR ANY MOOD] Gemini recipe rejected: time mismatch")
        elif reason == "kosher_violation":
            print("[FOOD FOR ANY MOOD] Gemini recipe rejected: kosher category violation")
        elif reason == "unauthorized_ingredients":
            print("[FOOD FOR ANY MOOD] Gemini recipe rejected: unauthorized ingredients")
        elif reason == "duplicate_title":
            print("[FOOD FOR ANY MOOD] Gemini recipe rejected: duplicate title")
        elif reason == "duplicate_cooking_method":
            print("[FOOD FOR ANY MOOD] Gemini recipe rejected: duplicate cooking method")
        elif reason == "duplicate_dessert_category":
            print("[FOOD FOR ANY MOOD] Gemini recipe rejected: duplicate dessert category")


def log_recipe_validation(
    *,
    selected_recipe_type: str,
    selected_category: str,
    generated_title: str,
    validation_passed: bool,
    fallback_used: bool,
) -> None:
    print(f"[FOOD FOR ANY MOOD] selectedRecipeType: {selected_recipe_type}")
    print(f"[FOOD FOR ANY MOOD] selectedCategory: {selected_category}")
    print(f"[FOOD FOR ANY MOOD] generatedTitle: {generated_title}")
    print(f"[FOOD FOR ANY MOOD] validationPassed: {validation_passed}")
    print(f"[FOOD FOR ANY MOOD] fallbackUsed: {fallback_used}")
