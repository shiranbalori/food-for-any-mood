"""Normalize recipe ingredients to Hebrew and validate step usage."""

from __future__ import annotations

import re
import unicodedata

from ingredient_relevance import (
    MIN_INGREDIENT_MATCH_RATIO,
    canonical_ingredient,
    ingredient_appears_in_text,
    ingredients_match,
    normalize_ingredient,
    parse_user_ingredients,
    validate_recipe_relevance,
)
from recipe_title import apply_descriptive_dish_title, validate_dish_title
from recipe_quantities import apply_recipe_quantities

LATIN_PATTERN = re.compile(r"[a-z]", re.IGNORECASE)

STAPLE_CANONICAL = {
    "salt",
    "pepper",
    "black pepper",
    "oil",
    "olive",
    "olive oil",
    "water",
    "sugar",
}

SPLIT_PATTERN = re.compile(
    r"\s*(?:,|;|\n|\+|\band\b|\&|\u05d5(?=\s[\u0590-\u05FFa-z]))\s*",
    re.IGNORECASE,
)

QUANTITY_PREFIX = re.compile(
    r"^[\d./]+\s*(?:kg|g|gr|gram|grams|ml|l|cup|cups|tbsp|tsp|oz|lb|pcs|piece|pieces|יח|כף|כפות|כוס|כוסות|גרם|ק)?\s*",
    re.IGNORECASE,
)

PAREN_SUFFIX = re.compile(r"\s*\([^)]*\)\s*$")

HEBREW_LABELS: dict[str, str] = {
    "pasta": "פסטה",
    "cream": "שמנת מתוקה",
    "garlic": "שום",
    "parmesan": "פרמזן",
    "butter": "חמאה",
    "salt": "מלח",
    "pepper": "פלפל שחור",
    "black pepper": "פלפל שחור",
    "olive oil": "שמן זית",
    "olive": "שמן זית",
    "olives": "זיתים",
    "oil": "שמן",
    "eggs": "ביצים",
    "egg": "ביצה",
    "cheese": "גבינה",
    "onion": "בצל",
    "tomato": "עגבניות",
    "tomatoes": "עגבניות",
    "rice": "אורז",
    "chicken": "עוף",
    "beef": "בשר בקר",
    "mushroom": "פטריות",
    "mushrooms": "פטריות",
    "broccoli": "ברוקולי",
    "tofu": "טופו",
    "lemon": "לימון",
    "potato": "תפוחי אדמה",
    "carrot": "גזר",
    "spinach": "תרד",
    "avocado": "אבוקדו",
    "yogurt": "יוגורט",
    "honey": "דבש",
    "ginger": "ג׳ינג׳ר",
    "soy sauce": "רוטב סויה",
    "water": "מים",
    "sugar": "סוכר",
    "flour": "קמח",
    "milk": "חלב",
    "salmon": "סלמון",
    "tuna": "טונה",
    "chickpeas": "גרגרי חומוס",
    "lentils": "עדשים",
    "quinoa": "קינואה",
    "coconut milk": "חלב קוקוס",
    "bell pepper": "פלפל גמבה",
    "cilantro": "כוסברה",
    "parsley": "פטרוזיליה",
    "basil": "בזיליקום",
    "vinegar": "חומץ",
    "stock": "ציר",
    "broth": "ציר",
}

HEBREW_SYNONYMS: dict[str, list[str]] = {
    "chicken": ["עוף", "חזה עוף"],
    "beef": ["בשר בקר", "בקר"],
    "pasta": ["פסטה", "spaghetti", "penne"],
    "rice": ["אורז"],
    "egg": ["ביצה", "ביצים"],
    "cheese": ["גבינה"],
    "cream": ["שמנת", "שמנת מתוקה"],
    "garlic": ["שום"],
    "onion": ["בצל"],
    "tomato": ["עגבניה", "עגבניות"],
    "olive": ["שמן זית", "olive oil"],
    "oil": ["שמן", "שמן זית"],
    "mushroom": ["פטריות"],
    "lemon": ["לימון"],
    "potato": ["תפוח אדמה", "תפוחי אדמה"],
    "tofu": ["טופו"],
    "broccoli": ["ברוקולי"],
    "ginger": ["ג׳ינג׳ר"],
    "soy sauce": ["רוטב סויה"],
}


def contains_latin_text(text: str) -> bool:
    return bool(LATIN_PATTERN.search(text or ""))


def _find_hebrew_synonym(raw: str) -> str | None:
    normalized = normalize_ingredient(raw)
    if not normalized:
        return None

    for canonical, aliases in HEBREW_SYNONYMS.items():
        terms = [normalize_ingredient(canonical), *[normalize_ingredient(a) for a in aliases]]
        if not any(
            term
            and (
                normalized == term
                or normalized in term
                or term in normalized
            )
            for term in terms
        ):
            continue

        label = HEBREW_LABELS.get(canonical)
        if label:
            return label

        for alias in aliases:
            if re.search(r"[\u0590-\u05FF]", alias):
                return alias.strip()

    return None


def to_hebrew_ingredient(raw: str) -> str:
    trimmed = (raw or "").strip()
    if not trimmed:
        return ""

    without_suffix = PAREN_SUFFIX.sub("", trimmed).strip()
    without_qty = QUANTITY_PREFIX.sub("", without_suffix).strip() or without_suffix

    if re.search(r"[\u0590-\u05FF]", without_qty) and not contains_latin_text(without_qty):
        return without_qty

    lower = without_qty.lower()
    for key in sorted(HEBREW_LABELS.keys(), key=len, reverse=True):
        if lower == key or f" {key} " in f" {lower} " or lower.endswith(f" {key}") or lower.startswith(f"{key} "):
            return HEBREW_LABELS[key]

    direct = HEBREW_LABELS.get(lower) or HEBREW_LABELS.get(canonical_ingredient(without_qty) or "")
    if direct:
        return direct

    from_syn = _find_hebrew_synonym(without_qty)
    if from_syn:
        return from_syn

    canon = canonical_ingredient(without_qty)
    if canon and canon in HEBREW_LABELS:
        return HEBREW_LABELS[canon]

    return from_syn or without_qty


def split_ingredient_entry(raw: str) -> list[str]:
    trimmed = (raw or "").strip()
    if not trimmed:
        return []

    parts = []
    for part in SPLIT_PATTERN.split(trimmed):
        cleaned = QUANTITY_PREFIX.sub("", PAREN_SUFFIX.sub("", part).strip()).strip()
        if cleaned:
            parts.append(cleaned)
    return parts


def _dedupe_ingredients(items: list[str]) -> list[str]:
    seen: list[str] = []
    for item in items:
        if not any(ingredients_match(item, existing) for existing in seen):
            seen.append(item)
    return seen


def _is_staple(name: str) -> bool:
    canon = canonical_ingredient(name)
    return canon in STAPLE_CANONICAL if canon else False


def _ingredient_used_in_steps(ingredient: str, steps: list[str]) -> bool:
    steps_text = "\n".join(steps)
    if ingredient_appears_in_text(ingredient, steps_text):
        return True
    return _is_staple(ingredient)


def _hebrewize_steps(steps: list[str], ingredient_labels: list[str]) -> list[str]:
    result = list(steps)
    for label in sorted(ingredient_labels, key=len, reverse=True):
        if not label or re.search(r"[\u0590-\u05FF]", label):
            continue
        hebrew = to_hebrew_ingredient(label)
        if hebrew and hebrew != label:
            pattern = re.compile(rf"\b{re.escape(label)}\b", re.IGNORECASE)
            result = [pattern.sub(hebrew, step) for step in result]

    for canonical, aliases in HEBREW_SYNONYMS.items():
        hebrew = HEBREW_LABELS.get(canonical)
        if not hebrew:
            continue
        for alias in [canonical, *aliases]:
            if re.search(r"[\u0590-\u05FF]", alias):
                continue
            pattern = re.compile(rf"\b{re.escape(alias)}\b", re.IGNORECASE)
            result = [pattern.sub(hebrew, step) for step in result]

    return result


def _ensure_user_ingredients_present(
    user_ingredients: list[str],
    ingredients: list[str],
    steps: list[str],
) -> tuple[list[str], list[str]]:
    next_ingredients = list(ingredients)
    next_steps = list(steps)

    for user_ing in user_ingredients:
        hebrew = (
            user_ing.strip()
            if re.search(r"[\u0590-\u05FF]", user_ing) and not contains_latin_text(user_ing)
            else to_hebrew_ingredient(user_ing)
        )

        if not any(ingredients_match(item, hebrew) for item in next_ingredients):
            next_ingredients.insert(0, hebrew)

        if not _ingredient_used_in_steps(hebrew, next_steps) and next_steps:
            next_steps[0] = f"{next_steps[0]} ({hebrew})"

    return _dedupe_ingredients(next_ingredients), next_steps


def normalize_recipe_ingredients(recipe: dict, user_ingredients_raw: str = "") -> dict:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    raw_entries = recipe.get("ingredients") or []

    expanded = [part for entry in raw_entries for part in split_ingredient_entry(str(entry))]
    hebrewized = [to_hebrew_ingredient(entry) for entry in expanded if entry]
    ingredients = _dedupe_ingredients(hebrewized)
    steps = list(recipe.get("steps") or [])

    ingredients, steps = _ensure_user_ingredients_present(user_ingredients, ingredients, steps)
    steps = _hebrewize_steps(steps, ingredients)
    ingredients = [
        item
        for item in ingredients
        if _is_staple(item) or _ingredient_used_in_steps(item, steps)
    ]
    ingredients, steps = _ensure_user_ingredients_present(user_ingredients, ingredients, steps)

    return {
        **recipe,
        "ingredients": _dedupe_ingredients(ingredients),
        "steps": steps,
    }


def validate_recipe_quality(user_ingredients: list[str], recipe: dict) -> dict:
    relevance = validate_recipe_relevance(user_ingredients, recipe)
    steps_text = "\n".join(recipe.get("steps") or [])

    english_ingredients = [
        item for item in (recipe.get("ingredients") or []) if contains_latin_text(item)
    ]
    unused_in_steps = [
        item
        for item in (recipe.get("ingredients") or [])
        if not _is_staple(item) and not ingredient_appears_in_text(item, steps_text)
    ]
    user_explicit_missing = [
        user_ing
        for user_ing in user_ingredients
        if not any(ingredients_match(item, user_ing) for item in (recipe.get("ingredients") or []))
        or not ingredient_appears_in_text(user_ing, steps_text)
    ]

    ingredient_count = len(recipe.get("ingredients") or [])
    step_score = 1 - (len(unused_in_steps) / ingredient_count) if ingredient_count else 1
    hebrew_score = 1 if not english_ingredients else 0
    ingredient_relevance_score = round(relevance["match_ratio"] * 70 + step_score * 20 + hebrew_score * 10)
    title_validation = validate_dish_title(recipe.get("name", ""), recipe.get("ingredients") or [])

    ok = (
        relevance["ok"]
        and not english_ingredients
        and not unused_in_steps
        and not user_explicit_missing
        and title_validation["ok"]
    )

    return {
        "ok": ok,
        "ingredient_relevance_score": ingredient_relevance_score,
        "match_ratio": relevance["match_ratio"],
        "title_has_ingredient": relevance["title_has_ingredient"],
        "matched": relevance["matched"],
        "unmatched": relevance["unmatched"],
        "english_ingredients": english_ingredients,
        "unused_in_steps": unused_in_steps,
        "user_explicit_missing": user_explicit_missing,
        "title_validation": title_validation,
    }


def apply_recipe_ingredient_parser(
    recipe: dict,
    user_ingredients_raw: str = "",
    *,
    cooking_time: int | None = None,
    style: str | None = None,
    servings: int | None = None,
) -> tuple[dict, dict]:
    normalized = normalize_recipe_ingredients(recipe, user_ingredients_raw)
    titled = apply_descriptive_dish_title(
        normalized,
        cooking_time=cooking_time,
        style=style,
    )
    quantified = apply_recipe_quantities(
        titled,
        servings=servings or (titled.get("nutrition") or {}).get("servings"),
    )
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    validation = validate_recipe_quality(user_ingredients, quantified)
    quantified["matchPercentage"] = validation["ingredient_relevance_score"]
    return quantified, validation


def is_recipe_acceptable(user_ingredients_raw: str, recipe: dict) -> bool:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    validation = validate_recipe_quality(user_ingredients, recipe)
    if not user_ingredients:
        return validation["ok"] and not validation["english_ingredients"]
    return validation["ok"] and validation["match_ratio"] >= MIN_INGREDIENT_MATCH_RATIO
