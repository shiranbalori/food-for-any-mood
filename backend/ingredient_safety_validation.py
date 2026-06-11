"""Lightweight pre-validation for obviously invalid / unsafe ingredient inputs."""

from __future__ import annotations

import re

from ingredient_relevance import parse_user_ingredients

INGREDIENT_SAFETY_REJECTION_HE = (
    "נראה שחלק מהמרכיבים שהוזנו אינם מתאימים למתכון. "
    "נסו להזין מרכיבי אוכל אמיתיים כמו ירקות, פירות, קמח, ביצים, אורז, פסטה או תבלינים."
)

INGREDIENT_SAFETY_REJECTION_EN = (
    "Some of the ingredients you entered do not look suitable for a recipe. "
    "Try real food ingredients such as vegetables, fruit, flour, eggs, rice, pasta, or spices."
)

BLOCKED_INGREDIENT_TERMS: tuple[str, ...] = (
    "חרא",
    "קקי",
    "צואה",
    "shit",
    "poop",
    "feces",
    "crap",
    "סמים",
    "סם",
    "קוקאין",
    "cocaine",
    "הרואין",
    "heroin",
    "מריחואנה",
    "marijuana",
    "קנאביס",
    "cannabis",
    "weed",
    "hashish",
    "חשיש",
    "lsd",
    "mdma",
    "ecstasy",
    "meth",
    "crack",
    "opium",
    "אופיום",
    "אקונומיקה",
    "רעל",
    "poison",
    "bleach",
    "דבק",
    "glue",
    "בנזין",
    "gasoline",
    "petrol",
    "ammonia",
    "אמוניה",
    "detergent",
    "אבקת כביסה",
    "insecticide",
    "הדברה",
    "נעל",
    "shoe",
    "פלסטיק",
    "plastic",
    "זכוכית",
    "glass",
    "battery",
    "סוללה",
    "metal",
    "נייר",
    "paper",
    "rubber",
    "גומי",
    "cardboard",
    "carton",
    "אקדח",
    "gun",
    "pistol",
    "rifle",
    "פצצה",
    "bomb",
    "explosive",
    "נשק",
    "weapon",
    "dynamite",
    "דינמיט",
)

_QTY_PREFIX = re.compile(
    r"^[\d\s/]+(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ\"?ל|כוס(?:ות)?|יח(?:ידה|ידות)?|tsp|tbsp|cup|cups|g|ml|kg|lb|lbs)\.?\s*",
    re.IGNORECASE,
)


def normalize_safety_text(text: str) -> str:
    return " ".join(str(text or "").strip().lower().split())


def strip_quantity_prefix(token: str) -> str:
    return _QTY_PREFIX.sub("", str(token or "").strip()).strip()


def _is_latin_term(term: str) -> bool:
    return bool(re.fullmatch(r"[a-z0-9][a-z0-9\s'-]*", term, flags=re.IGNORECASE))


def _latin_whole_word_match(term: str, text: str) -> bool:
    return bool(re.search(rf"\b{re.escape(term)}\b", text, flags=re.IGNORECASE))


def token_matches_blocked(blocked_term: str, token: str) -> bool:
    blocked = normalize_safety_text(blocked_term)
    normalized_token = normalize_safety_text(strip_quantity_prefix(token))
    if not blocked or not normalized_token:
        return False

    if normalized_token == blocked:
        return True

    words = [word for word in normalized_token.split() if word]
    if any(word == blocked for word in words):
        return True

    if _is_latin_term(blocked):
        return _latin_whole_word_match(blocked, normalized_token)

    if blocked in normalized_token:
        if any(word == blocked or word.startswith(blocked) for word in words):
            return True
        if len(normalized_token) <= len(blocked) + 1:
            return True

    return False


def full_text_matches_blocked(blocked_term: str, raw_text: str) -> bool:
    blocked = normalize_safety_text(blocked_term)
    full = normalize_safety_text(raw_text)
    if not blocked or not full:
        return False

    if _is_latin_term(blocked):
        return _latin_whole_word_match(blocked, full)

    parts = [normalize_safety_text(strip_quantity_prefix(part)) for part in re.split(r"[,;\n]+", full)]
    return any(part == blocked or blocked in part for part in parts if part)


def find_invalid_ingredients(tokens: list[str], raw_text: str = "") -> list[str]:
    invalid: set[str] = set()

    for token in tokens:
        for blocked in BLOCKED_INGREDIENT_TERMS:
            if token_matches_blocked(blocked, token):
                invalid.add(token)
                break

    if not invalid and str(raw_text or "").strip():
        for blocked in BLOCKED_INGREDIENT_TERMS:
            if full_text_matches_blocked(blocked, raw_text):
                invalid.add(blocked)
                break

    return list(invalid)


def assess_ingredient_safety(raw: str, *, language: str = "he") -> dict:
    ingredients = parse_user_ingredients(raw)
    if not ingredients:
        return {"ok": True, "recipe_possible": True, "reason": "", "invalid_ingredients": []}

    invalid_ingredients = find_invalid_ingredients(ingredients, raw)
    if not invalid_ingredients:
        return {"ok": True, "recipe_possible": True, "reason": "", "invalid_ingredients": []}

    return {
        "ok": False,
        "recipe_possible": False,
        "reason": INGREDIENT_SAFETY_REJECTION_EN if language == "en" else INGREDIENT_SAFETY_REJECTION_HE,
        "invalid_ingredients": invalid_ingredients,
    }
