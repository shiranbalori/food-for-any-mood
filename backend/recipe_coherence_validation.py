"""Recipe coherence: user ingredients in list/title, no generic titles, home cooking."""

from __future__ import annotations

import re

from ingredient_relevance import ingredients_match, parse_user_ingredients
from recipe_grounding import validate_title_grounding
from recipe_dish_patterns import validate_real_world_dish

GENERIC_TITLE_PATTERNS = (
    r"מנה ביתית|קסם במחבת|מהמטבח|חביתה מהירה עם וניל|homestyle|kitchen magic",
    r"quick\s+dish|homemade\s+stew|mixed\s+ingredients|creative\s+combo",
)

UNNATURAL_STEP_PATTERNS = (
    r"אל\s*דנטה|אמולסיה|קרמול\s+עמוק|מקפלים פנימה|emulsify|fold in|al dente",
)


def _is_generic_title(title: str, user_ingredients: list[str]) -> bool:
    text = (title or "").strip()
    if not text:
        return True
    if any(re.search(pattern, text, re.I) for pattern in GENERIC_TITLE_PATTERNS):
        return True
    if user_ingredients and re.search(r"וניל|vanilla", text, re.I):
        if not any(re.search(r"וניל|vanilla", item, re.I) for item in user_ingredients):
            return True
    return False


def _unnatural_steps(steps: list[str]) -> list[str]:
    hits = []
    for step in steps or []:
        if re.search("|".join(UNNATURAL_STEP_PATTERNS), str(step), re.I):
            hits.append(str(step))
    return hits


def validate_recipe_coherence(
    user_ingredients: list[str],
    recipe: dict,
    *,
    language: str = "he",
    recipe_type: str = "meal",
    category: str = "dairy",
) -> dict:
    title = recipe.get("name", "")
    ingredients = list(recipe.get("ingredients") or [])
    steps = list(recipe.get("steps") or [])
    grounding = validate_title_grounding(title, ingredients, user_ingredients)
    missing_in_list = [
        item
        for item in user_ingredients
        if not any(ingredients_match(line, item) for line in ingredients)
    ]
    failures: list[str] = []
    if user_ingredients and missing_in_list:
        failures.append("missing_user_ingredients")
    if user_ingredients and not grounding.get("ok", True):
        failures.append("title_grounding")
    if user_ingredients and _is_generic_title(title, user_ingredients):
        failures.append("generic_title")
    unnatural = _unnatural_steps(steps)
    if unnatural:
        failures.append("unnatural_steps")
    if user_ingredients:
        real_world = validate_real_world_dish(
            recipe,
            user_ingredients,
            recipe_type=recipe_type,
            category=category,
            language=language,
        )
        for failure in real_world.get("failures") or []:
            if failure not in failures:
                failures.append(failure)
    return {
        "ok": not failures,
        "failures": failures,
        "missing_in_list": missing_in_list,
        "unnatural_steps": unnatural,
        "grounding": grounding,
    }
