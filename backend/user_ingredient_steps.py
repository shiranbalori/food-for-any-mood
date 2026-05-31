"""Build natural recipe steps from user-provided ingredients only."""

from __future__ import annotations

import re

from hebrew_step_wording import (
    format_english_step_ingredient_list,
    format_hebrew_step_ingredient_list,
    to_step_ingredient_reference,
)

_MELT_KEYWORDS = ("marshmallow", "מרשמלו", "chocolate", "שוקולד", "שמנת", "cream")
_SUGAR_KEYWORDS = ("sugar", "סוכר", "דבש", "honey")
_DRY_KEYWORDS = ("coconut", "קוקוס", "קמח", "flour", "אבקת", "cocoa", "קקאו", "oats", "שיבולת")


def _bare_name(raw: str) -> str:
    return re.sub(r"^[\d\s/]+(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ\"?ל|כוס(?:ות)?|יח(?:ידה|ידות)?|tsp|tbsp|cup|g|ml)\.?\s*", "", raw.strip(), flags=re.I)


def _matches_any(name: str, keywords: tuple[str, ...]) -> bool:
    lower = _bare_name(name).lower()
    return any(keyword in lower for keyword in keywords)


def _pick_by_keywords(names: list[str], keywords: tuple[str, ...]) -> str | None:
    for name in names:
        if _matches_any(name, keywords):
            return name
    return None


def build_steps_from_user_ingredients(
    display_ingredients: list[str],
    *,
    recipe_type: str = "meal",
    language: str = "he",
    cooking_time: int = 30,
) -> list[str]:
    """Create chef-quality steps that mention only the listed ingredients."""
    names = [item.strip() for item in display_ingredients if item and item.strip()]
    if not names:
        return []

    cook_minutes = min(cooking_time, max(10, cooking_time // 2))
    chill_minutes = min(cooking_time, max(20, int(cooking_time * 0.7)))
    refs = [to_step_ingredient_reference(name, language) for name in names]
    list_phrase = (
        format_hebrew_step_ingredient_list(refs)
        if language == "he"
        else format_english_step_ingredient_list(refs)
    )

    if recipe_type == "dessert":
        melt_name = _pick_by_keywords(names, _MELT_KEYWORDS)
        dry_names = [n for n in names if n != melt_name and _matches_any(n, _DRY_KEYWORDS | _SUGAR_KEYWORDS)]
        other_names = [n for n in names if n != melt_name and n not in dry_names]

        if language == "en":
            if melt_name and len(names) >= 2:
                melt_ref = to_step_ingredient_reference(melt_name, language)
                dry_refs = [to_step_ingredient_reference(n, language) for n in dry_names + other_names]
                dry_phrase = format_english_step_ingredient_list(dry_refs) if dry_refs else list_phrase
                return [
                    "Line a tray with parchment paper and set aside.",
                    f"Melt {melt_ref} in a saucepan over low heat, stirring until smooth.",
                    f"Remove from heat, add {dry_phrase} and stir well until evenly mixed.",
                    "Pour the mixture into the tray and spread evenly with a spoon.",
                    f"Refrigerate for about {chill_minutes} minutes until firm enough to cut.",
                    "Cut into portions and serve.",
                ]
            if len(names) == 1:
                return [
                    f"Place {refs[0]} in a mixing bowl.",
                    f"Mix or heat gently over low heat for about {cook_minutes} minutes until smooth.",
                    "Shape or spread into portions and let set before serving.",
                    "Serve when the texture holds together.",
                ]
            return [
                f"Combine {list_phrase} in a bowl and mix until evenly blended.",
                "Pour into a lined tray and spread evenly with a spoon.",
                f"Chill for about {chill_minutes} minutes until firm enough to shape.",
                "Cut into bite-sized pieces.",
                "Serve when ready.",
            ]

        if melt_name and len(names) >= 2:
            melt_ref = to_step_ingredient_reference(melt_name, language)
            dry_refs = [to_step_ingredient_reference(n, language) for n in dry_names + other_names]
            dry_phrase = format_hebrew_step_ingredient_list(dry_refs) if dry_refs else list_phrase
            return [
                "מרפדים תבנית בנייר אפייה ומניחים בצד.",
                f"ממיסים את {melt_ref} בסיר על אש נמוכה תוך ערבוב עד לקבלת תערובת חלקה.",
                f"מסירים מהאש, מוסיפים את {dry_phrase} ומערבבים היטב עד לקבלת תערובת אחידה.",
                "שופכים את התערובת לתבנית ומשטחים בעזרת כף.",
                f"מקררים כ-{chill_minutes} דקות עד שהמענה מתקשה מספיק לחיתוך.",
                "חותכים ליחידות ומגישים.",
            ]
        if len(names) == 1:
            return [
                f"מניחים את {refs[0]} בקערת ערבוב.",
                f"מערבבים או מחממים בעדינות על אש נמוכה כ-{cook_minutes} דקות עד למרקם חלק.",
                "יוצרים צורה או שכבה אחידה וממתינים שהמענה יתייצב.",
                "מגישים כשהמרקם מחזיק יחד.",
            ]
        return [
            f"מערבבים את {list_phrase} בקערה עד לקבלת תערובת אחידה.",
            "שופכים לתבנית מרופדת ומשטחים בעזרת כף.",
            f"מקררים כ-{chill_minutes} דקות עד שהמענה מתייצב.",
            "חותכים לקוביות קטנות.",
            "מגישים.",
        ]

    if language == "en":
        if len(names) == 1:
            return [
                f"Heat a pan over medium heat and add {refs[0]}.",
                f"Cook gently for about {cook_minutes} minutes, stirring occasionally, until tender and fragrant.",
                "Taste and adjust seasoning if needed.",
                "Serve hot while fresh.",
            ]
        return [
            "Heat a pan or pot over medium heat.",
            f"Add {list_phrase} and cook together, stirring occasionally.",
            f"Continue cooking for about {cook_minutes} minutes until the ingredients are tender and well combined.",
            "Taste and adjust seasoning to your preference.",
            "Serve hot.",
        ]

    if len(names) == 1:
        return [
            f"מחממים מחבת על אש בינונית ומוסיפים את {refs[0]}.",
            f"מבשלים בעדינות כ-{cook_minutes} דקות תוך ערבוב, עד שהמרכיב רך וארоматי.",
            "טועמים ומתבלים לפי הצורך.",
            "מגישים חם.",
        ]
    return [
        "מחממים מחבת או סיר על אש בינונית.",
        f"מוסיפים את {list_phrase} ומבשלים יחד תוך ערבוב מדי פעם.",
        f"ממשיכים לבשל כ-{cook_minutes} דקות עד שהמרכיבים רכים ומשתלבים היטב.",
        "טועמים ומתבלים לפי הטעם.",
        "מגישים חם.",
    ]
