"""Ingredient relevance validation and fallback recipe builder."""

from __future__ import annotations

import random
import re
import unicodedata
from typing import Literal

MIN_INGREDIENT_MATCH_RATIO = 0.7

Category = Literal["dairy", "meat", "parve"]
MusicPlatform = Literal["spotify", "youtube"]
Mood = Literal["happy", "cozy", "energetic", "relaxed", "adventurous", "comfort"]

# Subset of frontend INGREDIENT_SYNONYMS for backend matching
INGREDIENT_SYNONYMS: dict[str, list[str]] = {
    "chicken": ["עוף", "chicken breast", "חזה עוף"],
    "beef": ["בקר", "בשר בקר", "ground beef"],
    "pasta": ["פסטה", "spaghetti", "penne"],
    "rice": ["אורז", "basmati"],
    "egg": ["eggs", "ביצה", "ביצים"],
    "cheese": ["גבינה", "mozzarella", "cheddar"],
    "cream": ["שמנת", "שמנת מתוקה", "heavy cream"],
    "garlic": ["שום"],
    "onion": ["בצל"],
    "tomato": ["עגבניה", "עגבניות", "tomatoes"],
    "potato": ["תפוח אדמה", "תפוחי אדמה"],
    "mushroom": ["פטריות", "mushrooms"],
    "tofu": ["טופו"],
    "broccoli": ["ברוקולי"],
    "pepper": ["פלפל גמבה", "bell pepper"],
    "lemon": ["לימון"],
    "spinach": ["תרד"],
    "salmon": ["סלמון"],
    "avocado": ["אבוקדו"],
    "chickpeas": ["חומוס", "גרגרי חומוס"],
    "lentils": ["עדשים"],
    "yogurt": ["יוגורט"],
    "butter": ["חמאה"],
    "oil": ["שמן", "שמן זית", "olive oil"],
}

MOOD_DESCRIPTIONS: dict[Mood, str] = {
    "happy": "שמחים ומרוממים",
    "cozy": "חמים ומנחמים",
    "energetic": "נועזים ומלאי אנרגיה",
    "relaxed": "רגועים ומאוזנים",
    "adventurous": "מלאי אופי וגיוון",
    "comfort": "מספקים ומוכרים",
}


def parse_user_ingredients(raw: str) -> list[str]:
    if not raw.strip():
        return []
    parts = [part.strip() for part in raw.replace("\n", ",").split(",")]
    return [part for part in parts if part]


def normalize_ingredient(value: str) -> str:
    text = unicodedata.normalize("NFKC", value.lower().strip())
    text = re.sub(r"[^\w\s]", "", text, flags=re.UNICODE)
    return " ".join(text.split())


def canonical_ingredient(raw: str) -> str | None:
    normalized = normalize_ingredient(raw)
    if not normalized:
        return None

    for canonical, aliases in INGREDIENT_SYNONYMS.items():
        terms = [normalize_ingredient(canonical), *[normalize_ingredient(a) for a in aliases]]
        for term in terms:
            if not term:
                continue
            if normalized == term or normalized in term or term in normalized:
                return canonical

    return normalized.split()[0] if normalized else None


def ingredients_match(user_ing: str, recipe_ing: str) -> bool:
    user = normalize_ingredient(user_ing)
    recipe = normalize_ingredient(recipe_ing)
    if not user or not recipe:
        return False

    if user == recipe or user in recipe or recipe in user:
        return True

    user_canon = canonical_ingredient(user)
    recipe_canon = canonical_ingredient(recipe)
    if user_canon and recipe_canon and user_canon == recipe_canon:
        return True

    user_words = user.split()
    recipe_words = recipe.split()
    return any(
        len(uw) > 2
        and len(rw) > 2
        and (uw in rw or rw in uw)
        for uw in user_words
        for rw in recipe_words
    )


def ingredient_appears_in_text(user_ing: str, text: str) -> bool:
    if not user_ing or not text:
        return False
    if ingredients_match(user_ing, text):
        return True

    normalized_text = normalize_ingredient(text)
    normalized_user = normalize_ingredient(user_ing)
    if not normalized_user or not normalized_text:
        return False

    if normalized_user in normalized_text or normalized_text in normalized_user:
        return True

    user_words = [word for word in normalized_user.split() if len(word) > 2]
    return any(word in normalized_text for word in user_words)


def count_recipe_matches(user_ingredients: list[str], recipe: dict) -> dict:
    if not user_ingredients:
        return {
            "matched": [],
            "unmatched": [],
            "match_ratio": 1.0,
            "matched_count": 0,
            "total": 0,
        }

    recipe_texts = [
        recipe.get("name", ""),
        recipe.get("description", ""),
        *recipe.get("ingredients", []),
        *recipe.get("steps", []),
    ]

    matched: list[str] = []
    unmatched: list[str] = []

    for user_ing in user_ingredients:
        if any(ingredient_appears_in_text(user_ing, text) for text in recipe_texts):
            matched.append(user_ing)
        else:
            unmatched.append(user_ing)

    total = len(user_ingredients)
    return {
        "matched": matched,
        "unmatched": unmatched,
        "match_ratio": len(matched) / total,
        "matched_count": len(matched),
        "total": total,
    }


def title_contains_user_ingredient(user_ingredients: list[str], recipe_name: str) -> bool:
    if not user_ingredients:
        return True
    if not recipe_name:
        return False
    return any(ingredient_appears_in_text(ui, recipe_name) for ui in user_ingredients)


def validate_recipe_relevance(user_ingredients: list[str], recipe: dict) -> dict:
    if not user_ingredients:
        return {
            "ok": True,
            "match_ratio": 1.0,
            "title_has_ingredient": True,
            "matched": [],
            "unmatched": [],
        }

    counts = count_recipe_matches(user_ingredients, recipe)
    title_has_ingredient = title_contains_user_ingredient(
        user_ingredients, recipe.get("name", "")
    )
    ok = (
        counts["match_ratio"] >= MIN_INGREDIENT_MATCH_RATIO
        and title_has_ingredient
    )

    return {
        "ok": ok,
        "match_ratio": counts["match_ratio"],
        "title_has_ingredient": title_has_ingredient,
        "matched": counts["matched"],
        "unmatched": counts["unmatched"],
    }


def _build_playlist_url(platform: MusicPlatform, query: str) -> str:
    encoded = query.replace(" ", "%20")
    if platform == "youtube":
        return f"https://www.youtube.com/results?search_query={encoded}"
    return f"https://open.spotify.com/search/{encoded}"


def build_ingredient_fallback_recipe(
    *,
    user_ingredients: list[str],
    category: Category,
    mood: Mood,
    cooking_time: int,
    is_gluten_free: bool,
    music_platform: MusicPlatform,
    build_playlist,
    recipe_type: str = "meal",
    servings: int = 4,
) -> dict:
    """Build a Hebrew recipe centered on the user's ingredients."""
    from recipe_title import build_guaranteed_dessert_title, build_descriptive_dish_title

    display = list(user_ingredients)
    if is_gluten_free:
        display = [
            item.replace("פסטה", "פסטה ללא גלוטן")
            if "פסטה" in item and "ללא גלוטן" not in item
            else item
            for item in display
        ]

    mood_text = MOOD_DESCRIPTIONS.get(mood, "טעימים")
    match_ratio = len(display) / max(len(user_ingredients), 1)

    mismatch_note = ""
    if len(user_ingredients) > 1 and match_ratio < MIN_INGREDIENT_MATCH_RATIO:
        mismatch_note = (
            " שילוב המרכיבים לא לגמרי קלאסי — "
            "המנה משתמשת ברוב מה שציינתם ומתאימה את השאר בצורה פשוטה."
        )
    elif len(user_ingredients) >= 3 and match_ratio >= MIN_INGREDIENT_MATCH_RATIO:
        mismatch_note = " המנה נבנתה סביב המרכיבים שציינתם."

    description = (
        f"קינוח שנבנה בעיקר מהמרכיבים שלכם, עם ניחוחות {mood_text}, "
        f"מותאם לכ-{cooking_time} דקות הכנה.{mismatch_note}"
        if recipe_type == "dessert"
        else f"מנה שנבנתה בעיקר מהמרכיבים שלכם, עם ניחוחות {mood_text}, "
        f"מותאמת לכ-{cooking_time} דקות בישול.{mismatch_note}"
    )
    if is_gluten_free:
        description += " מותאמת במלואה לתזונה ללא גלוטן."

    if recipe_type == "dessert":
        ingredients = [*display, "סוכר", "וניל", "חמאה"]
    else:
        ingredients = [*display, "מלח", "פלפל שחור", "שמן זית"]
    if is_gluten_free and not any("ללא גלוטן" in item for item in ingredients):
        ingredients.append("מותאם ללא גלוטן")

    ingredient_phrase = ", ".join(display[:4])
    cook_minutes = min(cooking_time, max(15, cooking_time // 2))

    if recipe_type == "dessert":
        steps = [
            f"מכינים ומסדרים את {ingredient_phrase} לקינוח.",
            "מערבבים את המרכיבים המתוקים עם סוכר, וניל וחמאה עד תערובת אחידה.",
            f"אופים או מקררים לפי סוג הקינוח — כ-{cook_minutes} דקות.",
            "מקשטים בפירות, שוקולד או אבקת סוכר לפי הטעם.",
            "מגישים קר או חם כקינוח.",
        ]
    else:
        steps = [
            f"מכינים ומסדרים את {ingredient_phrase}.",
            "מחממים מחבת או סיר עם שמן זית על אש בינונית.",
            f"מבשלים את המרכיבים העיקריים עד שהם מוכנים — כ-{cook_minutes} דקות.",
            "מתבלים במלח ופלפל לפי הטעם ומערבבים בעדינות.",
            "מגישים חם ונהנים מהמנה.",
        ]

    tags: list[str] = ["quick"] if cooking_time <= 25 else []
    if category == "parve":
        tags.append("vegetarian")

    if recipe_type == "dessert":
        if category == "meat":
            name = "קציצות בשר ביתיות"
            steps = [
                "מערבבים בשר, בצל, שום, ביצה, מלח ופלפל עד תערובת דביקה.",
                "יוצרים קציצות בגודל אחיד.",
                "מחממים שמן במחבת וצורבים את הקציצות מכל הצדדים.",
                f"מבשלים על אש נמוכה כ-{cook_minutes} דקות עד שהן מוכנות.",
                "מגישים חם — קינוח אינו מתאים לארוחה בשרית.",
            ]
            ingredients = [*display, "בשר בקר טחון", "בצל", "שום", "שמן זית", "מלח", "פלפל שחור"]
        else:
            name = build_guaranteed_dessert_title(
                ingredients,
                category=category,
                ingredient_phrase=ingredient_phrase or None,
            )
    else:
        name = build_descriptive_dish_title(
            ingredients,
            cooking_time=cooking_time,
            steps=steps,
            style="quick",
            tags=tags or ["comfortFood"],
        )

    match_percentage = min(99, max(72, round(match_ratio * 100)))
    playlist = build_playlist(music_platform, match_percentage)

    return {
        "name": name,
        "description": description,
        "ingredients": ingredients,
        "steps": steps,
        "matchPercentage": match_percentage,
        "spiceLevel": 0 if recipe_type == "dessert" else (1 if category == "parve" else 0),
        "nutrition": {
            "calories": 360 + len(display) * 25,
            "protein": 14 + len(display) * 2,
            "carbs": 30 + len(display) * 3,
            "fat": 16 + len(display),
            "servings": servings,
        },
        "healthScore": min(92, 70 + len(display) * 3),
        "tags": tags or ["comfortFood"],
        "playlist": playlist,
    }
