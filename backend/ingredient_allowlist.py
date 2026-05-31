"""Strict allowlist: user ingredients + defined system pantry only."""

from __future__ import annotations

from ingredient_relevance import canonical_ingredient, ingredients_match, normalize_ingredient, parse_user_ingredients
from measurement_units import strip_quantity_prefix

SYSTEM_PANTRY_CANONICAL = {
    "water",
    "salt",
    "black pepper",
    "oil",
    "olive",
    "olive oil",
    "baking powder",
}

FORBIDDEN_UNLESS_USER_HINTS = (
    "berries",
    "cookies",
    "chocolate",
    "fruits",
    "nuts",
    "cream cheese",
    "yogurt",
    "milk",
    "butter",
)


def _user_provided_vanilla(user_ingredients: list[str]) -> bool:
    for item in user_ingredients:
        text = normalize_ingredient(item)
        canon = canonical_ingredient(item)
        if canon == "vanilla" or "vanilla" in text or "וניל" in text:
            return True
    return False


def get_system_pantry_items(user_ingredients: list[str] | None = None) -> list[str]:
    items = ["water", "salt", "black pepper", "oil", "olive oil", "baking powder"]
    if user_ingredients and _user_provided_vanilla(user_ingredients):
        items.extend(["vanilla", "vanilla extract"])
    return items


def is_system_pantry_ingredient(name: str) -> bool:
    canon = canonical_ingredient(strip_quantity_prefix(name or ""))
    if not canon:
        return False
    if canon in SYSTEM_PANTRY_CANONICAL:
        return True
    return any(ingredients_match(name, item) for item in SYSTEM_PANTRY_CANONICAL)


def is_recipe_ingredient_allowed(recipe_line: str, user_ingredients: list[str]) -> bool:
    if not user_ingredients:
        return True

    if any(ingredients_match(user_ing, recipe_line) for user_ing in user_ingredients):
        return True

    return any(
        ingredients_match(pantry_item, recipe_line)
        for pantry_item in get_system_pantry_items(user_ingredients)
    )


def find_unauthorized_recipe_ingredients(recipe: dict, user_ingredients_raw: str) -> list[str]:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    if not user_ingredients:
        return []

    unauthorized: list[str] = []
    for item in recipe.get("ingredients") or []:
        if not is_recipe_ingredient_allowed(str(item), user_ingredients):
            unauthorized.append(str(item))
    return unauthorized


def filter_recipe_to_allowed_ingredients(recipe: dict, user_ingredients_raw: str) -> dict:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    if not user_ingredients:
        return recipe

    filtered = {
        **recipe,
        "ingredients": [
            item
            for item in (recipe.get("ingredients") or [])
            if is_recipe_ingredient_allowed(str(item), user_ingredients)
        ],
    }
    upgrades = recipe.get("optionalUpgrades") or []
    filtered["optionalUpgrades"] = [
        upgrade
        for upgrade in upgrades
        if is_recipe_ingredient_allowed(
            str(upgrade.get("ingredient", upgrade) if isinstance(upgrade, dict) else upgrade),
            user_ingredients,
        )
    ]
    return filtered
