"""English → Hebrew measurement unit translation for recipe ingredients."""

from __future__ import annotations

import re

ENGLISH_UNIT_ALTERNATIVES = (
    "tablespoons|tablespoon|teaspoons|teaspoon|cups|cup|grams|gram|pieces|piece|tbsp|tsp|g|ml|pcs"
)

QUANTITY_UNIT_PREFIX = re.compile(
    rf"^([\d./]+(?:\s+\d+/\d+)?)\s*(?:{ENGLISH_UNIT_ALTERNATIVES})\.?\s*",
    re.IGNORECASE,
)

MEASURED_UNIT_TOKEN = re.compile(
    rf"(?:כפית|כפיות|כף|כפות|גרם|מ\"ל|כוס|כוסות|יחידה|יחידות|\b(?:{ENGLISH_UNIT_ALTERNATIVES})\b)",
    re.IGNORECASE,
)

HEBREW_UNITS = {
    "cup": {"singular": "כוס", "plural": "כוסות"},
    "tbsp": {"singular": "כף", "plural": "כפות"},
    "tsp": {"singular": "כפית", "plural": "כפיות"},
    "gram": {"singular": "גרם", "plural": "גרם"},
    "ml": {"singular": 'מ"ל', "plural": 'מ"ל'},
    "piece": {"singular": "יחידה", "plural": "יחידות"},
}

ENGLISH_UNIT_ALIASES = {
    "cup": "cup",
    "cups": "cup",
    "tablespoon": "tbsp",
    "tablespoons": "tbsp",
    "tbsp": "tbsp",
    "teaspoon": "tsp",
    "teaspoons": "tsp",
    "tsp": "tsp",
    "gram": "gram",
    "grams": "gram",
    "g": "gram",
    "ml": "ml",
    "piece": "piece",
    "pieces": "piece",
    "pcs": "piece",
}

UNIT_LABELS = {
    "he": {
        "tsp": HEBREW_UNITS["tsp"]["singular"],
        "tbsp": HEBREW_UNITS["tbsp"]["singular"],
        "gram": HEBREW_UNITS["gram"]["singular"],
        "ml": HEBREW_UNITS["ml"]["singular"],
        "cup": HEBREW_UNITS["cup"]["singular"],
        "piece": HEBREW_UNITS["piece"]["singular"],
    },
    "en": {
        "tsp": "tsp",
        "tbsp": "tbsp",
        "gram": "gram",
        "ml": "ml",
        "cup": "cup",
        "piece": "piece",
    },
}


def normalize_unit_key(unit: str) -> str:
    return ENGLISH_UNIT_ALIASES.get((unit or "").lower(), (unit or "").lower())


def parse_amount(value: str | float | int) -> float:
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value or "").strip()
    if not text:
        return 0.0

    mixed = re.match(r"^(\d+)\s+(\d+/\d+)$", text)
    if mixed:
        whole = int(mixed.group(1))
        num, den = mixed.group(2).split("/")
        return whole + int(num) / int(den)

    if "/" in text:
        num, den = text.split("/", 1)
        if int(den):
            return int(num) / int(den)

    try:
        return float(text)
    except ValueError:
        return 0.0


def _format_quantity(amount: float) -> str:
    rounded = round(amount * 4) / 4
    whole = int(rounded)
    frac = int(round((rounded - whole) * 4))
    frac_map = {1: "1/4", 2: "1/2", 3: "3/4"}

    if whole == 0 and frac > 0:
        return frac_map.get(frac, str(rounded))
    if frac == 0:
        return str(whole)
    if whole == 0:
        return frac_map[frac]
    return f"{whole} {frac_map[frac]}"


def get_hebrew_unit_label(unit_key: str, amount: float) -> str:
    key = normalize_unit_key(unit_key)
    labels = HEBREW_UNITS.get(key)
    if not labels:
        return unit_key
    return labels["singular"] if abs(amount - 1) < 0.001 else labels["plural"]


def format_hebrew_measurement(qty: str | float, unit_key: str, ingredient_name: str) -> str:
    name = (ingredient_name or "").strip()
    amount = qty if isinstance(qty, (int, float)) else parse_amount(qty)
    unit_word = get_hebrew_unit_label(unit_key, amount)

    if not name:
        return unit_word if abs(amount - 1) < 0.001 else f"{_format_quantity(amount)} {unit_word}"

    if abs(amount - 1) < 0.001:
        return f"{unit_word} {name}"

    return f"{_format_quantity(amount)} {unit_word} {name}"


def parse_leading_measurement(raw: str) -> dict | None:
    text = (raw or "").strip()
    match = re.match(
        rf"^([\d./]+(?:\s+\d+/\d+)?)\s*({ENGLISH_UNIT_ALTERNATIVES})\.?\s+(.+)$",
        text,
        re.IGNORECASE,
    )
    if not match:
        return None
    return {
        "qty": match.group(1),
        "unit": normalize_unit_key(match.group(2)),
        "name": match.group(3).strip(),
    }


def strip_quantity_prefix(raw: str) -> str:
    text = (raw or "").strip()
    without = QUANTITY_UNIT_PREFIX.sub("", text).strip()
    return without or text
