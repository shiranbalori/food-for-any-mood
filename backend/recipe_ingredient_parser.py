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
from recipe_pre_return_validation import validate_recipe_before_return
from recipe_step_sanitize import light_sanitize_recipe_steps
from recipe_utils import is_staple
from measurement_units import (
    format_hebrew_measurement,
    parse_leading_measurement,
    QUANTITY_UNIT_PREFIX,
    strip_quantity_prefix,
)

LATIN_PATTERN = re.compile(r"[a-z]", re.IGNORECASE)

from ingredient_allowlist import (
    find_unauthorized_recipe_ingredients,
    is_recipe_ingredient_allowed,
)

SPLIT_PATTERN = re.compile(
    r"\s*(?:,|;|\n|\+|\band\b|\&|\u05d5(?=\s[\u0590-\u05FFa-z]))\s*",
    re.IGNORECASE,
)

QUANTITY_PREFIX = QUANTITY_UNIT_PREFIX

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
    "tahini": "טחינה",
    "coconut milk": "חלב קוקוס",
    "bell pepper": "פלפל גמבה",
    "cilantro": "כוסברה",
    "parsley": "פטרוזיליה",
    "basil": "בזיליקום",
    "vinegar": "חומץ",
    "stock": "ציר",
    "broth": "ציר",
    "coffee": "קפה",
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


def _to_hebrew_ingredient_name(raw: str) -> str:
    without_qty = strip_quantity_prefix((raw or "").strip())
    if not without_qty:
        return ""

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


def to_hebrew_ingredient(raw: str) -> str:
    trimmed = (raw or "").strip()
    if not trimmed:
        return ""

    without_suffix = PAREN_SUFFIX.sub("", trimmed).strip()
    measured = parse_leading_measurement(without_suffix)
    if measured:
        return format_hebrew_measurement(
            measured["qty"],
            measured["unit"],
            _to_hebrew_ingredient_name(measured["name"]),
        )

    return _to_hebrew_ingredient_name(without_suffix)


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


def _ingredient_used_in_steps(ingredient: str, steps: list[str]) -> bool:
    steps_text = "\n".join(steps)
    if ingredient_appears_in_text(ingredient, steps_text):
        return True
    return is_staple(ingredient)


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


def _ensure_user_ingredients_in_list(
    user_ingredients: list[str],
    ingredients: list[str],
    language: str = "he",
) -> list[str]:
    next_ingredients = list(ingredients)

    for user_ing in user_ingredients:
        localized = (
            user_ing.strip()
            if re.search(r"[\u0590-\u05FF]", user_ing) and not contains_latin_text(user_ing) and language == "he"
            else to_display_ingredient(user_ing, language)
        )

        if localized and not any(ingredients_match(item, localized) for item in next_ingredients):
            next_ingredients.insert(0, localized)

    return _dedupe_ingredients(next_ingredients)


def to_display_ingredient(raw: str, language: str = "he") -> str:
    trimmed = (raw or "").strip()
    if not trimmed:
        return ""

    without_suffix = PAREN_SUFFIX.sub("", trimmed).strip()
    without_qty = QUANTITY_PREFIX.sub("", without_suffix).strip() or without_suffix

    if language == "en":
        canon = canonical_ingredient(without_qty)
        if canon:
            return canon.replace("-", " ")
        return without_qty

    return to_hebrew_ingredient(raw)


def normalize_recipe_ingredients(
    recipe: dict,
    user_ingredients_raw: str = "",
    language: str = "he",
) -> dict:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    raw_entries = recipe.get("ingredients") or []

    expanded = [part for entry in raw_entries for part in split_ingredient_entry(str(entry))]
    localized = [to_display_ingredient(entry, language) for entry in expanded if entry]
    ingredients = _dedupe_ingredients(localized)
    steps = list(recipe.get("steps") or [])

    ingredients = _ensure_user_ingredients_in_list(user_ingredients, ingredients, language)
    if language == "he":
        steps = _hebrewize_steps(steps, ingredients)
    ingredients = [
        item
        for item in ingredients
        if is_staple(item)
        or _ingredient_used_in_steps(item, steps)
        or any(ingredients_match(item, user_ing) for user_ing in user_ingredients)
        or is_recipe_ingredient_allowed(item, user_ingredients)
    ]
    ingredients = _ensure_user_ingredients_in_list(user_ingredients, ingredients, language)

    return {
        **recipe,
        "ingredients": _dedupe_ingredients(ingredients),
        "steps": steps,
    }


def validate_recipe_quality(
    user_ingredients: list[str],
    recipe: dict,
    language: str = "he",
    *,
    user_ingredients_raw: str = "",
) -> dict:
    relevance = validate_recipe_relevance(user_ingredients, recipe)
    steps_text = "\n".join(recipe.get("steps") or [])

    english_ingredients = [
        item for item in (recipe.get("ingredients") or []) if contains_latin_text(item)
    ]
    hebrew_ingredients = [
        item
        for item in (recipe.get("ingredients") or [])
        if re.search(r"[\u0590-\u05FF]", item) and not contains_latin_text(item)
    ]
    unused_in_steps = [
        item
        for item in (recipe.get("ingredients") or [])
        if not is_staple(item) and not ingredient_appears_in_text(item, steps_text)
    ]
    user_explicit_missing = [
        user_ing
        for user_ing in user_ingredients
        if not any(ingredients_match(item, user_ing) for item in (recipe.get("ingredients") or []))
        or not ingredient_appears_in_text(user_ing, steps_text)
    ]

    ingredient_relevance_score = round(relevance["match_ratio"] * 100)
    title_validation = validate_dish_title(recipe.get("name", ""), recipe.get("ingredients") or [])

    language_ok = not english_ingredients if language == "he" else not hebrew_ingredients

    pre_return = validate_recipe_before_return(recipe, user_ingredients_raw, language=language)
    unauthorized = find_unauthorized_recipe_ingredients(recipe, user_ingredients_raw)
    unauthorized_ok = not user_ingredients or not unauthorized

    ok = (
        relevance["ok"]
        and language_ok
        and not unused_in_steps
        and not user_explicit_missing
        and pre_return["ok"]
        and unauthorized_ok
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
        "pre_return": pre_return,
        "unauthorized_ingredients": unauthorized,
    }


def apply_recipe_ingredient_parser(
    recipe: dict,
    user_ingredients_raw: str = "",
    *,
    cooking_time: int | None = None,
    style: str | None = None,
    servings: int | None = None,
    recipe_type: str | None = None,
    category: str | None = None,
    language: str = "he",
    preserve_original_steps: bool = False,
) -> tuple[dict, dict]:
    normalized = normalize_recipe_ingredients(recipe, user_ingredients_raw, language)
    titled = apply_descriptive_dish_title(
        normalized,
        cooking_time=cooking_time,
        style=style,
        recipe_type=recipe_type,
        category=category,
        language=language,
    )
    quantified = apply_recipe_quantities(
        titled,
        servings=servings or (titled.get("nutrition") or {}).get("servings"),
        language=language,
        preserve_original_steps=preserve_original_steps,
    )
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    quantified["ingredients"] = _dedupe_ingredients(list(quantified.get("ingredients") or []))
    if preserve_original_steps:
        quantified["steps"] = light_sanitize_recipe_steps(quantified.get("steps") or [])
    validation = validate_recipe_quality(
        user_ingredients,
        quantified,
        language,
        user_ingredients_raw=user_ingredients_raw,
    )
    if user_ingredients:
        quantified["matchPercentage"] = round(validation["match_ratio"] * 100)
        quantified["generatedFromPreferences"] = False
    else:
        quantified["generatedFromPreferences"] = True
        quantified["optionalUpgrades"] = []
    return quantified, validation


def is_recipe_acceptable(user_ingredients_raw: str, recipe: dict, language: str = "he") -> bool:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    validation = validate_recipe_quality(user_ingredients, recipe, language)
    if not user_ingredients:
        if language == "en":
            return validation["ok"]
        return validation["ok"] and not validation["english_ingredients"]
    return validation["ok"] and validation["match_ratio"] >= MIN_INGREDIENT_MATCH_RATIO
