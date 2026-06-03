"""Recipe grounding: titles/descriptions must only reference listed ingredients."""

from __future__ import annotations

from ingredient_allowlist import get_system_pantry_items, is_system_pantry_ingredient
from ingredient_relevance import (
    INGREDIENT_SYNONYMS,
    canonical_ingredient,
    ingredients_match,
    normalize_ingredient,
    parse_user_ingredients,
)
from measurement_units import strip_quantity_prefix

HELPER_PANTRY_CANONICAL = {
    "water",
    "salt",
    "black pepper",
    "oil",
    "olive",
    "olive oil",
    "garlic",
    "baking powder",
}

SKIP_TITLE_SCAN_CANONICAL = {
    *HELPER_PANTRY_CANONICAL,
    "vanilla",
    "herbs",
    "parsley",
    "cilantro",
}


def _canonical_in_list(canon: str, ingredient_list: list[str]) -> bool:
    if not canon:
        return False
    for item in ingredient_list:
        item_canon = canonical_ingredient(strip_quantity_prefix(str(item)))
        if item_canon == canon or ingredients_match(item, canon):
            return True
    return False


def _allowed_helper(canon: str, user_ingredients: list[str]) -> bool:
    if canon in HELPER_PANTRY_CANONICAL:
        return True
    if is_system_pantry_ingredient(canon):
        return True
    return any(ingredients_match(item, canon) for item in get_system_pantry_items(user_ingredients))


def _collect_terms(canon: str) -> list[str]:
    aliases = INGREDIENT_SYNONYMS.get(canon, [])
    terms = [canon, *aliases]
    return [normalize_ingredient(term) for term in terms if term and len(normalize_ingredient(term)) >= 3]


def find_text_ingredient_violations(
    text: str,
    recipe_ingredients: list[str],
    user_ingredients: list[str],
) -> list[dict[str, str]]:
    normalized_text = normalize_ingredient(text or "")
    if not normalized_text:
        return []

    violations: list[dict[str, str]] = []
    for canon in INGREDIENT_SYNONYMS:
        if canon in SKIP_TITLE_SCAN_CANONICAL:
            continue
        matched_term = next((term for term in _collect_terms(canon) if term in normalized_text), None)
        if not matched_term:
            continue
        in_recipe = _canonical_in_list(canon, recipe_ingredients)
        allowed_helper = _allowed_helper(canon, user_ingredients)
        if not in_recipe and not allowed_helper:
            violations.append({"canonical": canon, "matchedTerm": matched_term})
    return violations


def validate_title_grounding(
    title: str,
    recipe_ingredients: list[str],
    user_ingredients: list[str],
) -> dict:
    violations = find_text_ingredient_violations(title, recipe_ingredients, user_ingredients)
    return {"ok": not violations, "violations": violations}


def validate_description_grounding(
    description: str,
    recipe_ingredients: list[str],
    user_ingredients: list[str],
) -> dict:
    violations = find_text_ingredient_violations(description, recipe_ingredients, user_ingredients)
    return {"ok": not violations, "violations": violations}


def validate_recipe_grounding(user_ingredients_raw: str | list[str], recipe: dict) -> dict:
    user_ingredients = (
        user_ingredients_raw
        if isinstance(user_ingredients_raw, list)
        else parse_user_ingredients(user_ingredients_raw)
    )
    if not user_ingredients:
        return {
            "ok": True,
            "titleOk": True,
            "descriptionOk": True,
            "titleViolations": [],
            "descriptionViolations": [],
        }

    recipe_ingredients = recipe.get("ingredients") or []
    title_check = validate_title_grounding(recipe.get("name", ""), recipe_ingredients, user_ingredients)
    description_check = validate_description_grounding(
        recipe.get("description", ""),
        recipe_ingredients,
        user_ingredients,
    )
    return {
        "ok": title_check["ok"] and description_check["ok"],
        "titleOk": title_check["ok"],
        "descriptionOk": description_check["ok"],
        "titleViolations": title_check["violations"],
        "descriptionViolations": description_check["violations"],
    }


def build_grounded_chef_title(
    user_ingredients: list[str],
    recipe_ingredients: list[str],
    language: str = "he",
) -> str:
    source = user_ingredients or recipe_ingredients
    canon = [canonical_ingredient(strip_quantity_prefix(str(item))) for item in source]
    canon = [item for item in canon if item and item not in HELPER_PANTRY_CANONICAL]

    from recipe_title import build_title_from_ingredients

    return build_title_from_ingredients(source or recipe_ingredients, language=language, recipe_type="meal")


def repair_recipe_grounding(recipe: dict, user_ingredients_raw: str, language: str = "he") -> dict:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    if not user_ingredients:
        return recipe

    recipe_ingredients = recipe.get("ingredients") or []
    name = recipe.get("name", "")
    description = recipe.get("description", "")

    if not validate_title_grounding(name, recipe_ingredients, user_ingredients)["ok"]:
        name = build_grounded_chef_title(user_ingredients, recipe_ingredients, language)

    if not validate_description_grounding(description, recipe_ingredients, user_ingredients)["ok"]:
        description = (
            f"מנה פשוטה וטעימה שנבנתה מהמרכיבים שציינתם — {name}."
            if language == "he"
            else f"A simple, tasty dish built from the ingredients you listed — {name}."
        )

    return {**recipe, "name": name, "description": description}
