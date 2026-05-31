"""Suggest optional ingredient upgrades not in the user's pantry."""

from __future__ import annotations

from ingredient_relevance import ingredients_match, normalize_ingredient

UPGRADE_CATALOG: list[tuple[str, str, str, str]] = [
    ("butter", "חמאה", "butter", "Adds richness and helps bind the mixture"),
    ("vanilla", "וניל", "vanilla", "Enhances sweetness and aroma"),
    ("oil", "שמן", "oil", "Helps prevent sticking and improves texture"),
    ("flour", "קמח", "flour", "Adds structure for baking"),
    ("baking powder", "אבקת אפייה", "baking powder", "Helps desserts rise and stay light"),
    ("egg", "ביצה", "egg", "Binds ingredients and improves texture"),
    ("milk", "חלב", "milk", "Softens and enriches the mixture"),
    ("cocoa", "אבקת קקאו", "cocoa powder", "Deepens chocolate flavor"),
    ("honey", "דבש", "honey", "Adds natural sweetness and moisture"),
    ("salt", "מלח", "salt", "Balances sweetness and enhances flavor"),
]

UPGRADE_REASONS_HE: dict[str, str] = {
    "butter": "מוסיפה עשירות ומחברת את התערובת",
    "vanilla": "מעצימה את הניחוח והמתיקות",
    "oil": "מונע הידבקות ומשפר מרקם",
    "flour": "מוסיפה מבנה לאפייה",
    "baking powder": "מסייעת לקינוחים להתרומם",
    "egg": "מחברת מרכיבים ומשפרת מרקם",
    "milk": "מרככת ומעשירה את התערובת",
    "cocoa": "מעמיקה טעם שוקולד",
    "honey": "מוסיפה מתיקות טבעית ולחות",
    "salt": "מאזנת מתיקות ומבליטה טעמים",
}


def build_optional_upgrades(
    user_ingredients: list[str],
    *,
    language: str = "he",
    recipe_type: str = "meal",
    limit: int = 3,
) -> list[dict[str, str]]:
    """Return up to `limit` optional upgrades not already in the user's list."""
    normalized_user = {normalize_ingredient(item) for item in user_ingredients if item}
    upgrades: list[dict[str, str]] = []

    for canon, he_label, en_label, _en_reason in UPGRADE_CATALOG:
        if any(ingredients_match(canon, user) for user in user_ingredients):
            continue
        if canon in normalized_user:
            continue
        if recipe_type == "dessert" and canon in {"salt"} and language == "he":
            pass  # salt still useful in desserts

        label = he_label if language == "he" else en_label
        reason = UPGRADE_REASONS_HE.get(canon, _en_reason)
        if language == "en":
            reason = _en_reason

        upgrades.append({"ingredient": label, "reason": reason})
        if len(upgrades) >= limit:
            break

    return upgrades
