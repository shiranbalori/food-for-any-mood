"""Localized recipe description copy (mirrors frontend src/i18n/recipeCopy.js)."""

from __future__ import annotations

RECIPE_COPY = {
    "he": {
        "mood_flavor": {
            "happy": "שמחים ומרוממים",
            "cozy": "חמים ומנחמים",
            "energetic": "נועזים ומלאי אנרגיה",
            "relaxed": "רגועים ומאוזנים",
            "adventurous": "מלאי אופי וגיוון",
            "comfort": "מספקים ומוכרים",
        },
        "default_mood": "טעימים",
        "dessert_description": "קינוח מותאם ל{mood}, בזמן הכנה של כ-{minutes} דקות. {name} — מתוק ומפנק.",
        "meal_description": "מנה מותאמת ל{mood}, בזמן הכנה של כ-{minutes} דקות. {name} — ארוחה ביתית מלאת טעם ונוחות.",
        "gf_suffix": " מותאמת במלואה לתזונה ללא גלוטן.",
    },
    "en": {
        "mood_flavor": {
            "happy": "bright and uplifting",
            "cozy": "warm and soul-soothing",
            "energetic": "bold and energizing",
            "relaxed": "calm and balanced",
            "adventurous": "exciting and full of character",
            "comfort": "deeply satisfying and familiar",
        },
        "default_mood": "delicious",
        "dessert_description": "A {mood} dessert ready in about {minutes} minutes. {name} — sweet and indulgent.",
        "meal_description": "A {mood} dish ready in about {minutes} minutes. {name} — a comforting homemade meal.",
        "gf_suffix": " Fully adapted for a gluten-free diet.",
    },
}


def get_recipe_copy(language: str = "he") -> dict:
    return RECIPE_COPY["en" if language == "en" else "he"]
