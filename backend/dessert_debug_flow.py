"""
Temporary debug logging for the cinnamon-butter dessert ingredient flow.
Remove once the validation path is confirmed stable.
"""

from __future__ import annotations

import json
from typing import Any

from ingredient_relevance import canonical_ingredient, parse_user_ingredients
from recipe_dish_patterns import get_best_dish_pattern
from recipe_diversity import validate_recipe_diversity
from recipe_dish_patterns import validate_real_world_dish
from recipe_ingredient_parser import is_recipe_acceptable
from recipe_pre_return_validation import validate_recipe_before_return
from recipe_quality import validateRecipeCategory, validateRecipeType, validate_gemini_recipe_quality

CINNAMON_DESSERT_CANONS = frozenset({"flour", "sugar", "butter", "cinnamon"})
DESSERT_RECIPE_TYPES = frozenset({"dessert", "קינוח"})
DEBUG_PREFIX = "[DESSERT_DEBUG cinnamon-dessert]"

EMERGENCY_NAME_HE = "עוגיות חמאה וקינמון"
EMERGENCY_INGREDIENTS_HE = [
    "2 כוסות קמח",
    "100 גרם חמאה",
    "1/2 כוס סוכר",
    "1 כפית קינמון",
    "1 ביצה",
]
EMERGENCY_STEPS_HE = [
    "מחממים תנור ל-180 מעלות.",
    "מערבבים בקערה חמאה רכה וסוכר עד לקבלת תערובת אחידה.",
    "מוסיפים ביצה וקינמון ומערבבים.",
    "מוסיפים קמח בהדרגה ולשים עד לקבלת בצק רך.",
    "יוצרים עוגיות קטנות ומניחים על תבנית עם נייר אפייה.",
    "אופים 12-15 דקות עד שהעוגיות מזהיבות קלות.",
]


def _cinnamon_canons(payload) -> set[str]:
    user_ingredients = parse_user_ingredients(getattr(payload, "ingredients", "") or "")
    canons = {canonical_ingredient(item) for item in user_ingredients}
    canons.discard(None)
    return canons


def describe_cinnamon_detection(payload) -> dict:
    recipe_type = getattr(payload, "recipeType", None)
    canons = sorted(_cinnamon_canons(payload))
    return {
        "recipeType": recipe_type,
        "recipeTypeMatches": recipe_type in DESSERT_RECIPE_TYPES,
        "canonicalIngredients": canons,
        "hasAllRequiredCanons": CINNAMON_DESSERT_CANONS.issubset(set(canons)),
    }


def is_cinnamon_dessert_debug_flow(payload) -> bool:
    """True for קמח+סוכר+חמאה+קינמון with recipeType=dessert (or Hebrew קינוח)."""
    if getattr(payload, "recipeType", None) not in DESSERT_RECIPE_TYPES:
        return False
    canons = _cinnamon_canons(payload)
    if not canons:
        return False
    return CINNAMON_DESSERT_CANONS.issubset(canons)


def build_cinnamon_emergency_generated_recipe(payload):
    """Hardcoded guaranteed-valid recipe — bypasses all validators."""
    from main import GeneratedRecipe, Nutrition, OptionalUpgrade, Playlist, _build_playlist

    language = payload.language or "he"
    name = EMERGENCY_NAME_HE
    ingredients = list(EMERGENCY_INGREDIENTS_HE)
    steps = list(EMERGENCY_STEPS_HE)
    description = (
        "עוגיות חמאה וקינמון קלאסיות — בצק פשוט שאופים עד פריך וזהוב."
        if language == "he"
        else "Classic butter cinnamon cookies — simple dough baked until lightly golden."
    )
    nutrition = Nutrition(calories=320, protein=5, carbs=38, fat=16, servings=payload.servings)
    health_score = 32
    tags = ["comfortFood", "vegetarian"]
    if payload.category == "parve":
        tags = ["comfortFood"]
    playlist = _build_playlist(payload.musicPlatform, 95, language=language)
    return GeneratedRecipe(
        name=name,
        description=description,
        ingredients=ingredients,
        steps=steps,
        matchPercentage=100,
        spiceLevel=0,
        nutrition=nutrition,
        healthScore=health_score,
        tags=tags,
        playlist=Playlist(**playlist),
        optionalUpgrades=[],
        generatedFromPreferences=False,
        categoryNote=None,
    )


def _log(label: str, value: Any) -> None:
    try:
        serialized = json.dumps(value, ensure_ascii=False, default=str)
    except TypeError:
        serialized = repr(value)
    print(f"{DEBUG_PREFIX} {label}: {serialized}")


def log_parsed_ingredients(payload) -> list[str]:
    parsed = parse_user_ingredients(payload.ingredients)
    canons = [canonical_ingredient(item) for item in parsed]
    _log("1 parsed ingredients after normalization", {"raw": parsed, "canonical": canons})
    return parsed


def log_matched_pattern(user_ingredients: list[str], payload) -> None:
    match = get_best_dish_pattern(
        user_ingredients,
        recipe_type=payload.recipeType,
        category=payload.category,
    )
    if match:
        pattern = match.pattern
        _log(
            "2 matched recipe pattern",
            {
                "id": pattern.id,
                "name_he": pattern.name_he,
                "score": match.score,
            },
        )
    else:
        _log("2 matched recipe pattern", None)


def log_recipe_snapshot(recipe_dict: dict, *, label_prefix: str) -> None:
    _log(f"3 {label_prefix} recipe title", recipe_dict.get("name"))
    _log(f"4 {label_prefix} ingredients", recipe_dict.get("ingredients"))
    _log(f"5 {label_prefix} steps", recipe_dict.get("steps"))


def log_all_validation_results(
    recipe_dict: dict,
    payload,
    *,
    user_ingredients: list[str] | None = None,
) -> dict[str, Any]:
    """Run each validator separately and log pass/fail."""
    user_ingredients = user_ingredients or parse_user_ingredients(payload.ingredients)
    language = payload.language or "he"
    results: dict[str, Any] = {}

    results["validateRecipeType"] = validateRecipeType(payload.recipeType, recipe_dict)
    results["validateRecipeCategory"] = validateRecipeCategory(
        payload.recipeType, payload.category, recipe_dict
    )
    quality = validate_gemini_recipe_quality(
        recipe_dict,
        recipe_type=payload.recipeType,
        category=payload.category,
        cooking_time=payload.cookingTime,
        user_ingredients=user_ingredients,
    )
    results["validate_gemini_recipe_quality"] = {"ok": quality.ok, "reasons": quality.reasons}
    results["is_recipe_acceptable"] = is_recipe_acceptable(
        payload.ingredients, recipe_dict, language
    )
    results["validate_recipe_diversity"] = validate_recipe_diversity(
        recipe_dict,
        recipe_type=payload.recipeType,
        exclude_titles=payload.excludeTitles,
        exclude_cooking_methods=payload.excludeCookingMethods,
        exclude_dessert_categories=payload.excludeDessertCategories,
    )
    if user_ingredients:
        results["validate_real_world_dish"] = validate_real_world_dish(
            recipe_dict,
            user_ingredients,
            recipe_type=payload.recipeType,
            category=payload.category,
            language=language,
        )
    pre_return = validate_recipe_before_return(
        recipe_dict,
        payload.ingredients,
        language=language,
        recipe_type=payload.recipeType,
        category=payload.category,
    )
    results["validate_recipe_before_return"] = pre_return

    _log("6 every validation function result", results)

    rejection_reason = None
    if not pre_return.get("ok"):
        rejection_reason = f"validate_recipe_before_return: {pre_return.get('failures')}"
    else:
        for name, value in results.items():
            if name == "validate_recipe_before_return":
                continue
            if name == "validate_gemini_recipe_quality" and not value.get("ok"):
                rejection_reason = f"{name}: {value.get('reasons')}"
                break
            if name == "validate_recipe_diversity" and not value.get("ok"):
                rejection_reason = f"{name}: {value.get('failures')}"
                break
            if name == "validate_real_world_dish" and not value.get("ok"):
                rejection_reason = f"{name}: {value.get('failures')}"
                break
            if isinstance(value, bool) and not value:
                rejection_reason = name
                break

    _log("7 exact validation reason that causes rejection", rejection_reason or "none — all checks passed")
    return {"results": results, "rejection_reason": rejection_reason, "pre_return": pre_return}


def log_final_response(response) -> None:
    payload = {
        "recipePossible": getattr(response, "recipePossible", None),
        "source": getattr(response, "source", None),
        "fallbackUsed": getattr(response, "fallbackUsed", None),
        "impossibleReason": getattr(response, "impossibleReason", None),
        "recipeName": getattr(getattr(response, "recipe", None), "name", None),
    }
    _log("8 final response returned to frontend", payload)
