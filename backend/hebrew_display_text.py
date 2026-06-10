"""Normalize Hebrew display text — remove English/mixed ingredient words."""

from __future__ import annotations

import re
from typing import Any

HEBREW_CHAR = re.compile(r"[\u0590-\u05FF]")
LATIN_CHAR = re.compile(r"[A-Za-z]")

# Order matters: longer / more specific patterns first.
REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"olive\s+oil", re.IGNORECASE), "שמן זית"),
    (re.compile(r"black\s+pepper", re.IGNORECASE), "פלפל שחור"),
    (re.compile(r"heavy\s+cream", re.IGNORECASE), "שמנת מתוקה"),
    (re.compile(r"sour\s+cream", re.IGNORECASE), "חמאה חמוצה"),
    (re.compile(r"lemon\s+juice", re.IGNORECASE), "מיץ לימון"),
    (re.compile(r"pine\s+nuts", re.IGNORECASE), "צנוברים"),
    (re.compile(r"(?:tahini|tehina|thina|tahina|tahin)", re.IGNORECASE), "טחינה"),
    (
        re.compile(r"(?:חטina|טחina|חטינa|טחינa|חטin|טחin|חטina|טחina)", re.IGNORECASE),
        "טחינה",
    ),
    (re.compile(r"(?:balsamico|balsamic|alsamico)", re.IGNORECASE), "בלסמי"),
    (re.compile(r"\u05d1[a-zA-Z]*(?:samic|samico)", re.IGNORECASE), "בלסמי"),
    (re.compile(r"oregano", re.IGNORECASE), "אורגנו"),
    (re.compile(r"parsley", re.IGNORECASE), "פטרוזיליה"),
    (re.compile(r"basil", re.IGNORECASE), "בזיליקום"),
    (re.compile(r"mozzarella", re.IGNORECASE), "מוצרלה"),
    (re.compile(r"parmesan|parmezan", re.IGNORECASE), "פרמזן"),
    (re.compile(r"\bfeta\b", re.IGNORECASE), "גבינת פטה"),
    (re.compile(r"ricotta", re.IGNORECASE), "ריקוטה"),
    (re.compile(r"chilli?", re.IGNORECASE), "צ'ילי"),
    (re.compile(r"cumin", re.IGNORECASE), "כמון"),
    (re.compile(r"paprika", re.IGNORECASE), "פפריקה"),
    (re.compile(r"\bhoney\b", re.IGNORECASE), "דבש"),
    (re.compile(r"\blemon\b", re.IGNORECASE), "לימון"),
    (re.compile(r"thyme", re.IGNORECASE), "טימין"),
    (re.compile(r"\bherbs\b", re.IGNORECASE), "עשבי תיבול"),
    (re.compile(r"\bgarlic\b", re.IGNORECASE), "שום"),
    (re.compile(r"\bonion\b", re.IGNORECASE), "בצל"),
    (re.compile(r"\btomato(?:es)?\b", re.IGNORECASE), "עגבניות"),
    (re.compile(r"\bcheese\b", re.IGNORECASE), "גבינה"),
    (re.compile(r"\bbutter\b", re.IGNORECASE), "חמאה"),
    (re.compile(r"\bsalt\b", re.IGNORECASE), "מלח"),
    (re.compile(r"\bpepper\b", re.IGNORECASE), "פלפל"),
    (re.compile(r"\boil\b", re.IGNORECASE), "שמן"),
    (re.compile(r"\bwater\b", re.IGNORECASE), "מים"),
    (re.compile(r"\bsugar\b", re.IGNORECASE), "סוכר"),
    (re.compile(r"\bflour\b", re.IGNORECASE), "קמח"),
    (re.compile(r"\bmilk\b", re.IGNORECASE), "חלב"),
    (re.compile(r"\beggs?\b", re.IGNORECASE), "ביצים"),
    (re.compile(r"\bchicken\b", re.IGNORECASE), "עוף"),
    (re.compile(r"\bbeef\b", re.IGNORECASE), "בשר"),
    (re.compile(r"\bfish\b", re.IGNORECASE), "דג"),
    (re.compile(r"\brice\b", re.IGNORECASE), "אורז"),
    (re.compile(r"\bpasta\b", re.IGNORECASE), "פסטה"),
    (re.compile(r"\bcream\b", re.IGNORECASE), "שמנת"),
    (re.compile(r"\byogurt\b", re.IGNORECASE), "יוגורט"),
    (re.compile(r"\bvinegar\b", re.IGNORECASE), "חומץ"),
    (re.compile(r"\bcinnamon\b", re.IGNORECASE), "קינמון"),
    (re.compile(r"\bnuts\b", re.IGNORECASE), "אגוזים"),
    (re.compile(r"\bwalnuts\b", re.IGNORECASE), "אגוזי מלך"),
    (re.compile(r"\bhummus\b", re.IGNORECASE), "חומוס"),
    (re.compile(r"\btbsp\b", re.IGNORECASE), "כפות"),
    (re.compile(r"\btsp\b", re.IGNORECASE), "כפיות"),
    (re.compile(r"\bkcal\b", re.IGNORECASE), "קלוריות"),
    (re.compile(r"\bcal\b", re.IGNORECASE), "קלוריות"),
]

LATIN_WORD = re.compile(r"[A-Za-z]{2,}")

MIXED_WORD = re.compile(
    r"(?<![\u0590-\u05FFa-zA-Z])([\u0590-\u05FF]+[a-zA-Z]+|[a-zA-Z]+[\u0590-\u05FF]+)(?![\u0590-\u05FFa-zA-Z])"
)


def has_mixed_script(text: str) -> bool:
    return bool(HEBREW_CHAR.search(text) and LATIN_CHAR.search(text))


def _apply_replacements(text: str) -> str:
    result = text
    for pattern, replacement in REPLACEMENTS:
        result = pattern.sub(replacement, result)
    return result


def _fix_mixed_token(token: str) -> str:
    if not has_mixed_script(token):
        return token
    lowered = token.lower()
    for pattern, replacement in REPLACEMENTS:
        if pattern.search(token) or pattern.search(lowered):
            return replacement
    hebrew_only = HEBREW_CHAR.findall(token)
    if hebrew_only:
        joined = "".join(hebrew_only)
        if len(joined) >= 2:
            return joined
    latin_only = "".join(LATIN_CHAR.findall(token))
    if latin_only:
        for pattern, replacement in REPLACEMENTS:
            if pattern.search(latin_only):
                return replacement
    return ""


def _fix_mixed_words(text: str) -> str:
    if not text or not has_mixed_script(text):
        return text

    def repl(match: re.Match[str]) -> str:
        fixed = _fix_mixed_token(match.group(1))
        return fixed if fixed else ""

    cleaned = MIXED_WORD.sub(repl, text)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    cleaned = re.sub(r"\s+,", ",", cleaned)
    cleaned = re.sub(r",\s*,+", ", ", cleaned)
    return cleaned.strip()


def _strip_unknown_latin_words(text: str) -> str:
    if not HEBREW_CHAR.search(text):
        return text

    def repl(match: re.Match[str]) -> str:
        token = match.group(0)
        for pattern, replacement in REPLACEMENTS:
            if pattern.search(token):
                return replacement
        return ""

    cleaned = LATIN_WORD.sub(repl, text)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip()


def normalize_hebrew_display_text(text: Any, language: str = "he") -> str:
    if language != "he" or text is None:
        return "" if text is None else str(text)
    raw = str(text).strip()
    if not raw:
        return raw
    result = _apply_replacements(raw)
    result = _fix_mixed_words(result)
    result = _strip_unknown_latin_words(result)
    return result.strip()


def _normalize_string_list(items: Any, language: str) -> list[str]:
    if not isinstance(items, list):
        return []
    return [
        normalize_hebrew_display_text(item, language)
        for item in items
        if str(item or "").strip()
    ]


def normalize_hebrew_recipe_content(recipe: dict[str, Any], language: str = "he") -> dict[str, Any]:
    if language != "he" or not isinstance(recipe, dict):
        return recipe
    out = dict(recipe)
    for key in ("name", "description", "categoryNote"):
        if key in out and out[key]:
            out[key] = normalize_hebrew_display_text(out[key], language)
    if "ingredients" in out:
        out["ingredients"] = _normalize_string_list(out["ingredients"], language)
    if "steps" in out:
        out["steps"] = _normalize_string_list(out["steps"], language)
    upgrades = out.get("optionalUpgrades")
    if isinstance(upgrades, list):
        normalized_upgrades = []
        for upgrade in upgrades:
            if not isinstance(upgrade, dict):
                continue
            normalized_upgrades.append(
                {
                    **upgrade,
                    "ingredient": normalize_hebrew_display_text(upgrade.get("ingredient"), language),
                    "reason": normalize_hebrew_display_text(upgrade.get("reason"), language),
                }
            )
        out["optionalUpgrades"] = normalized_upgrades
    return out


def _normalize_dict_fields(
    data: dict[str, Any],
    *,
    string_keys: tuple[str, ...],
    list_keys: tuple[str, ...],
    language: str,
) -> dict[str, Any]:
    out = dict(data)
    for key in string_keys:
        if key in out and out[key]:
            out[key] = normalize_hebrew_display_text(out[key], language)
    for key in list_keys:
        if key in out:
            out[key] = _normalize_string_list(out.get(key), language)
    return out


def normalize_themed_meal_content(meal: dict[str, Any], language: str = "he") -> dict[str, Any]:
    if language != "he" or not isinstance(meal, dict):
        return meal
    return _normalize_dict_fields(
        meal,
        string_keys=("mealTitle", "description", "starter", "main", "dessert"),
        list_keys=("sides", "drinks", "servingIdeas", "hostingTips"),
        language=language,
    )


def normalize_recipe_upgrade_content(upgrade: dict[str, Any], language: str = "he") -> dict[str, Any]:
    if language != "he" or not isinstance(upgrade, dict):
        return upgrade
    return _normalize_dict_fields(
        upgrade,
        string_keys=("upgradedTitle", "servingSuggestion", "premiumTouch", "nutritionImpact"),
        list_keys=("changes", "upgradedIngredients", "preparationNotes"),
        language=language,
    )


def normalize_themed_meal_upgrade_content(upgrade: dict[str, Any], language: str = "he") -> dict[str, Any]:
    if language != "he" or not isinstance(upgrade, dict):
        return upgrade
    return _normalize_dict_fields(
        upgrade,
        string_keys=("upgradedMealTitle",),
        list_keys=(
            "upgradedMenu",
            "dishUpgrades",
            "servingIdeas",
            "atmosphereIdeas",
            "specialAdditions",
            "impressiveTips",
        ),
        language=language,
    )
