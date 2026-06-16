"""Category-based validation for offensive, nonsense, and non-food recipe inputs."""

from __future__ import annotations

import re

from ingredient_relevance import parse_user_ingredients

RECIPE_INPUT_REJECTION_HE = "אנא הזינו מרכיבי מזון או שם מנה תקין."
RECIPE_INPUT_REJECTION_EN = "Please enter valid food ingredients or a dish name."

INGREDIENT_SAFETY_REJECTION_HE = RECIPE_INPUT_REJECTION_HE
INGREDIENT_SAFETY_REJECTION_EN = RECIPE_INPUT_REJECTION_EN

BLOCKED_INGREDIENT_TERMS: tuple[str, ...] = ()
BLOCKED_OFFENSIVE_TERMS: tuple[str, ...] = ()
BLOCKED_NON_FOOD_OBJECT_TERMS: tuple[str, ...] = ()

_OFFENSIVE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"ח+ר+א+"),
    re.compile(r"ק+ק+י+"),
    re.compile(r"צ+ו+א+ה"),
    re.compile(r"(?:sh|s)[\W_]*[i1!][\W_]*t", re.I),
    re.compile(r"(?:po+?p|feces|crap)", re.I),
    re.compile(r"ז+ו+נ+ה"),
    re.compile(r"בן(?:\s+של)?\s*זונה"),
    re.compile(r"בת(?:\s+של)?\s*זונה"),
    re.compile(r"(?:ת)?ז+י+נ+"),
    re.compile(r"מ+ט+ו*מ+ט+"),
    re.compile(r"מ+נ+י+א+ק"),
    re.compile(r"מ+פ+ג+ר"),
    re.compile(r"f[\W_]*u[\W_]*c[\W_]*k", re.I),
    re.compile(r"f[\W_*-]{0,3}c[\W_*-]{0,3}k", re.I),
    re.compile(r"s[\W_]*h[\W_]*[i1][\W_]*t", re.I),
    re.compile(r"s[\W_*-]{0,3}h[\W_*-]{0,3}t", re.I),
    re.compile(r"b[\W_]*i[\W_]*t[\W_]*c[\W_]*h", re.I),
    re.compile(r"a[\W_]*s[\W_]*s[\W_]*h[\W_]*o[\W_]*l[\W_]*e", re.I),
    re.compile(r"c[\W_]*u[\W_]*n[\W_]*t", re.I),
    re.compile(r"(?:cocaine|heroin|marijuana|cannabis|meth|ecstasy)", re.I),
    re.compile(r"(?:קוקאין|הרואין|מריחואנה|קנאביס|חשיש|סמים)"),
    re.compile(r"(?:bleach|poison|gasoline|ammonia|detergent)", re.I),
    re.compile(r"(?:אקונומיקה|רעל|בנזין|אמוניה|אבקת\s*כביסה|הדברה)"),
    re.compile(r"(?:gun|pistol|rifle|bomb|explosive|weapon)", re.I),
    re.compile(r"(?:אקדח|פצצה|נשק|דינמיט)"),
)

_NON_FOOD_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?:מכונ(?:ית|יות)|אוט(?:ו|ו)|car|truck|bus|train|airplane|plane|motorcycle|scooter)", re.I),
    re.compile(r"(?:מחשב(?:ים)?|computer|laptop|tablet|keyboard|מקלדת|מסך|screen|monitor|television|tv)", re.I),
    re.compile(r"(?:טל(?:פון|פונים)|phone|smartphone|iphone|android)", re.I),
    re.compile(r"(?:שולח(?:ן|נות)|כיס(?:א|אות)|ספ(?:ה|ות)|מיט(?:ה|ות)|chair|sofa|bed|table|desk|closet|ארון)", re.I),
    re.compile(r"^(?:בית|דיר(?:ה|ות)|house|home|apartment|building|office)$", re.I),
    re.compile(r"(?:כדור(?:גל|סל)|football|soccer|basketball|tennis|volleyball|baseball|sport)", re.I),
    re.compile(r"(?:נע(?:ל|י)?(?:יים)?|shoe|boot|shirt|pants|trousers|jacket|hat|כובע|חולצ(?:ה|ות)|מכנס(?:יים)?)", re.I),
    re.compile(r"(?:מפתח(?:ות)?|hammer|drill|screwdriver|wrench|plastic|cardboard|battery|סול(?:לה|ות))", re.I),
    re.compile(r"(?:נייר|paper|rubber|גומי|פלסטיק|זכוכית|metal|glass)(?:\s|$)", re.I),
)

_NONSENSE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^(?:asdf|qwerty|zxcv|hjkl|qwer|ytrewq)$", re.I),
    re.compile(r"^(.)\1{3,}$"),
    re.compile(r"^[b-df-hj-np-tv-xz]{5,}$", re.I),
    re.compile(r"^[xX]{3,}$"),
)

_QTY_PREFIX = re.compile(
    r"^[\d\s/]+(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ\"?ל|כוס(?:ות)?|יח(?:ידה|ידות)?|tsp|tbsp|cup|cups|g|ml|kg|lb|lbs)\.?\s*",
    re.IGNORECASE,
)


def normalize_safety_text(text: str) -> str:
    return " ".join(str(text or "").strip().lower().split())


def strip_quantity_prefix(token: str) -> str:
    return _QTY_PREFIX.sub("", str(token or "").strip()).strip()


def deobfuscate_text(text: str) -> str:
    value = normalize_safety_text(text)
    return (
        value.replace("@", "a")
        .replace("4", "a")
        .replace("3", "e")
        .replace("1", "i")
        .replace("!", "i")
        .replace("|", "i")
        .replace("0", "o")
        .replace("5", "s")
        .replace("$", "s")
        .replace("7", "t")
    )


def compact_text(text: str) -> str:
    return re.sub(r"[\W_]+", "", deobfuscate_text(text))


def _token_variants(token: str) -> list[str]:
    raw = strip_quantity_prefix(token)
    variants = {
        normalize_safety_text(raw),
        deobfuscate_text(raw),
        compact_text(raw),
        compact_text(deobfuscate_text(raw)),
    }
    return [item for item in variants if item]


def _matches_patterns(variants: list[str], patterns: tuple[re.Pattern[str], ...]) -> bool:
    return any(pattern.search(variant) for pattern in patterns for variant in variants)


def detect_input_violation(text: str) -> dict:
    trimmed = str(text or "").strip()
    if not trimmed:
        return {"blocked": False}

    variants = _token_variants(trimmed) + [compact_text(trimmed), deobfuscate_text(trimmed)]
    if _matches_patterns(variants, _OFFENSIVE_PATTERNS):
        return {"blocked": True, "category": "offensive"}
    if _matches_patterns(variants, _NON_FOOD_PATTERNS):
        return {"blocked": True, "category": "non_food"}
    if _matches_patterns(variants, _NONSENSE_PATTERNS):
        return {"blocked": True, "category": "nonsense"}
    return {"blocked": False}


def _validate_field(raw_text: str, *, mode: str = "ingredient") -> dict:
    text = str(raw_text or "").strip()
    if not text:
        return {"blocked": False}

    violation = detect_input_violation(text)
    if violation["blocked"]:
        return violation

    tokens = [text.strip()] if mode == "dish" else parse_user_ingredients(text)
    if not tokens:
        tokens = [text]

    for token in tokens:
        token_violation = detect_input_violation(token)
        if token_violation["blocked"]:
            return token_violation
        variants = _token_variants(token)
        if mode == "ingredient" and _matches_patterns(variants, _NON_FOOD_PATTERNS):
            return {"blocked": True, "category": "non_food"}
        if mode == "dish" and _matches_patterns(variants, _NON_FOOD_PATTERNS):
            return {"blocked": True, "category": "non_food"}

    return {"blocked": False}


def assess_recipe_input_safety(
    *,
    ingredients: str = "",
    dish_idea: str = "",
    language: str = "he",
) -> dict:
    ingredient_check = _validate_field(ingredients, mode="ingredient")
    if ingredient_check["blocked"]:
        return {
            "ok": False,
            "recipe_possible": False,
            "input_validation_failed": True,
            "blocked_category": ingredient_check.get("category"),
            "reason": RECIPE_INPUT_REJECTION_EN if language == "en" else RECIPE_INPUT_REJECTION_HE,
            "invalid_terms": [],
            "invalid_ingredients": [],
            "missing_ingredients": [],
        }

    dish_check = _validate_field(dish_idea, mode="dish")
    if dish_check["blocked"]:
        return {
            "ok": False,
            "recipe_possible": False,
            "input_validation_failed": True,
            "blocked_category": dish_check.get("category"),
            "reason": RECIPE_INPUT_REJECTION_EN if language == "en" else RECIPE_INPUT_REJECTION_HE,
            "invalid_terms": [],
            "invalid_ingredients": [],
            "missing_ingredients": [],
        }

    return {
        "ok": True,
        "recipe_possible": True,
        "input_validation_failed": False,
        "reason": "",
        "invalid_terms": [],
        "invalid_ingredients": [],
        "missing_ingredients": [],
    }


def assess_ingredient_safety(raw: str, *, language: str = "he") -> dict:
    return assess_recipe_input_safety(ingredients=raw, dish_idea="", language=language)


def find_invalid_ingredients(tokens: list[str], raw_text: str = "") -> list[str]:
    void = tokens
    del void
    result = assess_recipe_input_safety(ingredients=raw_text, dish_idea="", language="he")
    return [] if result["ok"] else ["blocked"]


def token_matches_blocked(*_args, **_kwargs) -> bool:
    return False


def token_matches_non_food_object(*_args, **_kwargs) -> bool:
    return False


def full_text_matches_blocked(*_args, **_kwargs) -> bool:
    return False
