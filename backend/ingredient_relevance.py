"""Ingredient relevance validation and fallback recipe builder."""

from __future__ import annotations

import random
import re
import unicodedata
from typing import Literal

from user_ingredient_steps import build_steps_from_user_ingredients

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
    "baking powder": ["אבקת אפייה"],
    "vanilla": ["vanilla extract", "תמצית וניל", "וניל"],
    "milk": ["חלב"],
    "strawberry": ["strawberries", "תות", "תותים"],
    "strawberries": ["strawberry", "תות", "תותים"],
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
    language: str = "he",
    exclude_titles: list[str] | None = None,
    exclude_cooking_methods: list[str] | None = None,
    exclude_dessert_categories: list[str] | None = None,
) -> dict:
    """Build a localized recipe centered on the user's ingredients."""
    from recipe_copy import get_recipe_copy
    from recipe_diversity import pick_alternate_dessert_variant
    from recipe_title import build_descriptive_dish_title, build_title_from_ingredients

    copy = get_recipe_copy(language)
    mood_text = copy["mood_flavor"].get(mood, copy["default_mood"])

    display = list(user_ingredients)
    if is_gluten_free:
        if language == "en":
            display = [
                item.replace("pasta", "gluten-free pasta")
                if "pasta" in item.lower() and "gluten-free" not in item.lower()
                else item
                for item in display
            ]
        else:
            display = [
                item.replace("פסטה", "פסטה ללא גלוטן")
                if "פסטה" in item and "ללא גלוטן" not in item
                else item
                for item in display
            ]

    match_ratio = len(display) / max(len(user_ingredients), 1)

    mismatch_note = ""
    if len(user_ingredients) > 1 and match_ratio < MIN_INGREDIENT_MATCH_RATIO:
        mismatch_note = (
            " The ingredient combo is not fully classic — the dish uses most of what you listed."
            if language == "en"
            else " שילוב המרכיבים לא לגמרי קלאסי — "
            "המנה משתמשת ברוב מה שציינתם ומתאימה את השאר בצורה פשוטה."
        )
    elif len(user_ingredients) >= 3 and match_ratio >= MIN_INGREDIENT_MATCH_RATIO:
        mismatch_note = (
            " Built around the ingredients you listed."
            if language == "en"
            else " המנה נבנתה סביב המרכיבים שציינתם."
        )

    ingredients = list(display)
    tags: list[str] = ["quick"] if cooking_time <= 25 else []
    if category == "parve":
        tags.append("vegetarian")

    if recipe_type == "dessert" and category == "meat":
        name = build_title_from_ingredients(
            ingredients,
            language=language,
            recipe_type="meal",
        )
        steps = build_steps_from_user_ingredients(
            display,
            recipe_type="meal",
            language=language,
            cooking_time=cooking_time,
        )
    elif recipe_type == "dessert":
        has_regeneration_constraints = bool(
            (exclude_titles or [])
            + (exclude_cooking_methods or [])
            + (exclude_dessert_categories or [])
        )
        if has_regeneration_constraints:
            variant = pick_alternate_dessert_variant(
                ingredients=ingredients,
                language=language,
                cooking_time=cooking_time,
                exclude_titles=exclude_titles,
                exclude_cooking_methods=exclude_cooking_methods,
                exclude_dessert_categories=exclude_dessert_categories,
            )
            name = variant["name"]
            steps = variant["steps"]
        else:
            name = build_title_from_ingredients(
                ingredients,
                language=language,
                recipe_type="dessert",
            )
            steps = build_steps_from_user_ingredients(
                display,
                recipe_type="dessert",
                language=language,
                cooking_time=cooking_time,
            )
    else:
        steps = build_steps_from_user_ingredients(
            display,
            recipe_type="meal",
            language=language,
            cooking_time=cooking_time,
        )
        if language == "en":
            name = build_descriptive_dish_title(
                ingredients,
                cooking_time=cooking_time,
                steps=steps,
                style="quick",
                tags=tags or ["comfortFood"],
                language=language,
            )
        else:
            name = build_descriptive_dish_title(
                ingredients,
                cooking_time=cooking_time,
                steps=steps,
                style="quick",
                tags=tags or ["comfortFood"],
                language=language,
            )

    from chef_intro import build_chef_intro
    from nutrition_score import calculate_health_score_from_recipe
    from optional_upgrades import build_optional_upgrades

    description = build_chef_intro(
        ingredients,
        chosen_name=name,
        language=language,
        recipe_type=recipe_type,
        cooking_time=cooking_time,
    )
    if mismatch_note:
        description += mismatch_note
    if is_gluten_free:
        description += copy["gf_suffix"]

    match_percentage = min(99, max(72, round(match_ratio * 100)))
    playlist = build_playlist(music_platform, match_percentage)
    optional_upgrades = build_optional_upgrades(
        user_ingredients,
        language=language,
        recipe_type=recipe_type,
    )
    nutrition = {
        "calories": 360 + len(display) * 25,
        "protein": 14 + len(display) * 2,
        "carbs": 30 + len(display) * 3,
        "fat": 16 + len(display),
        "servings": servings,
    }
    health_score = calculate_health_score_from_recipe(
        ingredients=ingredients,
        calories=nutrition["calories"],
        protein=nutrition["protein"],
        carbs=nutrition["carbs"],
        servings=servings,
    )

    return {
        "name": name,
        "description": description,
        "ingredients": ingredients,
        "steps": steps,
        "matchPercentage": match_percentage,
        "spiceLevel": 0 if recipe_type == "dessert" else (1 if category == "parve" else 0),
        "nutrition": nutrition,
        "healthScore": health_score,
        "tags": tags or ["comfortFood"],
        "playlist": playlist,
        "optionalUpgrades": optional_upgrades,
    }
