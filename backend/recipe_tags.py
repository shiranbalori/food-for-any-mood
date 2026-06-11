"""Derive recipe tags from nutrition and ingredients — never trust model tags blindly."""

from __future__ import annotations

from ingredient_relevance import canonical_ingredient
from measurement_units import strip_quantity_prefix

MEAT_FISH_CANON = frozenset(
    {"chicken", "beef", "fish", "salmon", "tuna", "turkey", "lamb", "pork", "meat", "steak"}
)
DAIRY_EGG_CANON = frozenset(
    {"milk", "egg", "eggs", "cheese", "butter", "cream", "yogurt", "ricotta", "parmesan", "feta"}
)
GLUTEN_CANON = frozenset({"flour", "pasta", "bread", "wheat", "noodles", "tortilla"})
SPICY_CANON = frozenset({"chili", "pepper flakes", "hot sauce", "curry powder"})

HIGH_PROTEIN_MIN = 25
HEALTHY_MIN_SCORE = 80
HEALTHY_MAX_CAL = 550
HEALTHY_MAX_FAT = 24
DIET_MAX_CAL = 420
DIET_MAX_FAT = 18
DIET_MIN_SCORE = 70
DIET_MAX_SUGAR = 18
CHILD_MAX_CAL = 650
POST_WORKOUT_MIN_PROTEIN = 28
POST_WORKOUT_MAX_CAL = 580
POST_WORKOUT_MAX_FAT = 22
QUICK_MAX_TIME = 25


def _ingredient_canons(recipe: dict) -> list[str]:
    result = []
    for item in recipe.get("ingredients") or []:
        canon = canonical_ingredient(strip_quantity_prefix(str(item)))
        if canon:
            result.append(canon)
    return result


def derive_recipe_tags(
    recipe: dict,
    *,
    category: str = "dairy",
    is_gluten_free: bool = False,
    recipe_type: str = "meal",
    spice_level: int = 0,
    cook_time: int = 30,
) -> list[str]:
    tags: set[str] = set()
    nutrition = recipe.get("nutrition") or {}
    calories = float(nutrition.get("calories") or 0)
    protein = float(nutrition.get("protein") or 0)
    fat = float(nutrition.get("fat") or 0)
    sugar = float(nutrition.get("sugar") or nutrition.get("sugars") or 0)
    health_score = float(recipe.get("healthScore") or nutrition.get("healthScore") or 50)

    canons = _ingredient_canons(recipe)
    canon_set = set(canons)
    has_meat_fish = bool(canon_set & MEAT_FISH_CANON)
    has_dairy_egg = bool(canon_set & DAIRY_EGG_CANON)
    has_gluten = bool(canon_set & GLUTEN_CANON)
    has_spicy = bool(canon_set & SPICY_CANON)

    if category in ("dairy", "parve", "vegan") and not has_meat_fish:
        tags.add("vegetarian")
    if not has_meat_fish and not has_dairy_egg:
        tags.add("vegan")

    if is_gluten_free and not has_gluten:
        tags.add("glutenFree")

    if protein >= HIGH_PROTEIN_MIN:
        tags.add("highProtein")

    if cook_time <= QUICK_MAX_TIME:
        tags.add("quick")

    is_indulgent_dessert = recipe_type == "dessert" and calories > 420
    is_high_calorie = calories > 520 or fat > 28

    if (
        not is_indulgent_dessert
        and health_score >= HEALTHY_MIN_SCORE
        and calories <= HEALTHY_MAX_CAL
        and fat <= HEALTHY_MAX_FAT
        and sugar <= 22
    ):
        tags.add("healthy")

    if (
        not is_indulgent_dessert
        and calories <= DIET_MAX_CAL
        and fat <= DIET_MAX_FAT
        and health_score >= DIET_MIN_SCORE
        and sugar <= DIET_MAX_SUGAR
    ):
        tags.add("dietFriendly")

    if (
        recipe_type == "meal"
        and protein >= POST_WORKOUT_MIN_PROTEIN
        and calories <= POST_WORKOUT_MAX_CAL
        and fat <= POST_WORKOUT_MAX_FAT
        and sugar <= 25
    ):
        tags.add("postWorkout")

    if (
        spice_level == 0
        and not has_spicy
        and calories <= CHILD_MAX_CAL
        and recipe_type != "dessert"
        and sugar <= 20
    ):
        tags.add("childFriendly")

    if is_high_calorie or health_score < 62:
        tags.add("comfortFood")

    if is_indulgent_dessert:
        tags.discard("healthy")
        tags.discard("dietFriendly")
        tags.discard("childFriendly")
        tags.discard("postWorkout")

    if spice_level >= 2 or has_spicy:
        tags.discard("childFriendly")

    if has_meat_fish:
        tags.discard("vegetarian")
        tags.discard("vegan")
    elif has_dairy_egg:
        tags.discard("vegan")

    if not is_gluten_free or has_gluten:
        tags.discard("glutenFree")

    return sorted(tags)


def apply_derived_recipe_tags(recipe: dict, **context) -> dict:
    return {**recipe, "tags": derive_recipe_tags(recipe, **context)}
