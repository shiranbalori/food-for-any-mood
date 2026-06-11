"""Friendly chef-style intro: dish options + why this recipe was chosen."""

from __future__ import annotations

import re

from dessert_dish_title import DESSERT_STYLE_VARIANTS, pick_primary_flavor_label
from ingredient_relevance import canonical_ingredient

QTY_PREFIX = re.compile(
    r"^[\d./]+\s*(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ\"ל|כוס(?:ות)?|tsp|tbsp|gram|grams|g|ml|cup|cups)?\s*",
    re.IGNORECASE,
)


def _strip_qty(raw: str) -> str:
    return QTY_PREFIX.sub("", (raw or "").strip()).strip()


def _main_canon(ingredients: list[str]) -> list[str]:
    return [canonical_ingredient(_strip_qty(item)) or item for item in ingredients]


def _unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def suggest_dish_options(
    ingredients: list[str],
    *,
    language: str = "he",
    recipe_type: str = "meal",
    category: str = "dairy",
) -> list[str]:
    from recipe_dish_patterns import get_dish_suggestions

    suggestions = get_dish_suggestions(
        ingredients,
        language=language,
        recipe_type=recipe_type,
        category=category,
    )
    if suggestions:
        return suggestions

    if recipe_type == "dessert":
        main = pick_primary_flavor_label(ingredients, language)
        options = [
            variant["title_he"](main) if language == "he" else variant["title_en"](main)
            for variant in DESSERT_STYLE_VARIANTS
        ]
        return _unique(options)[:4]

    canon = set(_main_canon(ingredients))
    flavor = pick_primary_flavor_label(ingredients, language)

    if "cinnamon" in canon and ("cream" in canon or "milk" in canon):
        return (
            ["קרם קינמון חם", "פודינג קינמון", "רוטב קינמון מתוק"]
            if language == "he"
            else ["Warm cinnamon cream", "Cinnamon pudding", "Sweet cinnamon sauce"]
        )
    if "chicken" in canon:
        return (
            ["עוף במחבת", "עוף בתנור", "מרק עוף קל"]
            if language == "he"
            else ["Pan-seared chicken", "Oven-baked chicken", "Light chicken soup"]
        )
    if "pasta" in canon:
        return (
            ["פסטה ברוטב שמנת", "פסטה עם ירקות", "פסטה מהירה"]
            if language == "he"
            else ["Creamy pasta", "Vegetable pasta", "Quick pasta skillet"]
        )
    if "tomato" in canon and ("egg" in canon or "eggs" in canon):
        return (
            ["שקשוקה", "חביתת עגבניות", "ביצים ברוטב עגבניות"]
            if language == "he"
            else ["Shakshuka", "Tomato omelette", "Eggs in tomato sauce"]
        )
    if "rice" in canon:
        return (
            ["אורז מוקפץ", "תבשיל אורז", "אורז עם ירקות"]
            if language == "he"
            else ["Fried rice", "Rice pilaf", "Vegetable rice"]
        )

    label = flavor or "מנה"
    return (
        [f"{label} במחבת", f"תבשיל {label}", f"מנה חמה עם {label}"]
        if language == "he"
        else [f"{label} skillet", f"{label} stew", f"Warm {label} dish"]
    )


def _build_choice_reason(
    chosen_name: str,
    options: list[str],
    *,
    language: str = "he",
    cooking_time: int = 30,
) -> str:
    chosen = (chosen_name or "").strip()
    if not chosen:
        return (
            "בחרתי מנה שמתאימה למרכיבים שיש לך."
            if language == "he"
            else "I picked a dish that fits what you have on hand."
        )

    if language == "he":
        if len(options) <= 1:
            return (
                f"{chosen} מתאימה במיוחד למרכיבים שיש לך — "
                f"פשוטה, טעימה, ובזמן של כ-{cooking_time} דקות."
            )
        return (
            f"האפשרות הכי פשוטה וטעימה היא {chosen} — "
            f"מתאימה לזמן של כ-{cooking_time} דקות ולמרכיבים שיש לך."
        )

    if len(options) <= 1:
        return (
            f"{chosen} is a great fit for your ingredients — "
            f"simple, tasty, and ready in about {cooking_time} minutes."
        )
    return (
        f"The simplest and most appealing option is {chosen} — "
        f"it fits your ingredients and about {cooking_time} minutes of cooking time."
    )


def build_chef_intro(
    ingredients: list[str],
    *,
    chosen_name: str = "",
    language: str = "he",
    recipe_type: str = "meal",
    cooking_time: int = 30,
) -> str:
    options = suggest_dish_options(ingredients, language=language, recipe_type=recipe_type)
    if chosen_name:
        options = _unique([chosen_name, *[item for item in options if item != chosen_name]])
    options = options[:4]
    if not options and chosen_name:
        options = [chosen_name]

    intro = (
        "עם המרכיבים שיש לך אפשר להכין:"
        if language == "he"
        else "With the ingredients you have, you could make:"
    )
    bullets = "\n".join(f"• {item}" for item in options)
    reason = _build_choice_reason(chosen_name or (options[0] if options else ""), options, language=language, cooking_time=cooking_time)
    return f"{intro}\n{bullets}\n\n{reason}"
