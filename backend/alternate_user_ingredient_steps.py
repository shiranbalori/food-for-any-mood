"""Alternate step sequences when Gemini is unavailable — mirrors frontend logic."""

from __future__ import annotations

from user_ingredient_steps import build_steps_from_user_ingredients

ONION_KEYWORDS = ("onion", "בצל")
TOMATO_KEYWORDS = ("tomato", "עגבנ", "שרי")
EGG_KEYWORDS = ("egg", "ביצ")


def _bare(name: str) -> str:
    import re

    return re.sub(
        r"^[\d\s/]+(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ\"?ל|כוס(?:ות)?|יח(?:ידה|ידות)?|tsp|tbsp|cup|g|ml)\.?\s*",
        "",
        name.strip(),
        flags=re.I,
    )


def _matches(name: str, keywords: tuple[str, ...]) -> bool:
    lower = _bare(name).lower()
    return any(kw in lower for kw in keywords)


def build_alternate_steps_from_user_ingredients(
    display_ingredients: list[str],
    *,
    recipe_type: str = "meal",
    language: str = "he",
    cooking_time: int = 30,
    variation_index: int = 0,
) -> list[str]:
    names = [item.strip() for item in display_ingredients if item and item.strip()]
    if not names:
        return []

    cook = min(cooking_time, max(8, cooking_time // 2))
    bake = min(cooking_time, max(12, int(cooking_time * 0.65)))

    if recipe_type == "dessert":
        base = build_steps_from_user_ingredients(names, recipe_type=recipe_type, language=language, cooking_time=cooking_time)
        return list(reversed(base)) if variation_index % 2 else base

    from hebrew_step_wording import format_hebrew_step_ingredient_list, to_step_ingredient_reference

    refs = [to_step_ingredient_reference(n, language) for n in names]
    list_phrase = format_hebrew_step_ingredient_list(refs) if language == "he" else ", ".join(refs)

    onion = next((to_step_ingredient_reference(n, language) for n in names if _matches(n, ONION_KEYWORDS)), None)
    tomato = next((to_step_ingredient_reference(n, language) for n in names if _matches(n, TOMATO_KEYWORDS)), None)
    egg = next((to_step_ingredient_reference(n, language) for n in names if _matches(n, EGG_KEYWORDS)), None)

    variants: list[list[str]] = []

    if egg and tomato and language == "he":
        variants.extend(
            [
                [
                    f"מחממים מחבת עם שמן ומטגנים את {onion or 'הירק'} כ-4 דקות." if onion else "מחממים מחבת עם שמן.",
                    f"מוסיפים את {tomato} ומבשלים 3–4 דקות.",
                    f"שוברים את {egg} לקערה, יוצקים למחבת ומבשלים כ-{cook} דקות.",
                    "מתבלים ומגישים חם.",
                ],
                [
                    f"מערבבים את {egg} ואת {tomato} בקערה.",
                    "מחממים תנור ל-180°C.",
                    f"אופים כ-{bake} דקות עד התקבעות.",
                    "מגישים חם.",
                ],
                [
                    f"מבשלים את {tomato} לרוטב כ-5 דקות.",
                    f"מוסיפים את {egg} ומבשלים מכוסה כ-{cook} דקות.",
                    "טועמים ומתבלים.",
                    "מגישים.",
                ],
            ]
        )

    variants.append(
        [
            "מחממים מחבת על אש בינונית.",
            f"מוסיפים את {list_phrase} ומבשלים יחד.",
            f"ממשיכים כ-{cook} דקות.",
            "מגישים חם.",
        ]
    )
    variants.append(
        [
            f"מערבבים את {list_phrase} בקערה.",
            "מחממים מחבת גדולה.",
            f"מטגנים כ-{cook} דקות.",
            "מגישים.",
        ]
    )

    return variants[abs(variation_index) % len(variants)]
