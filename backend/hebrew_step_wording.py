"""Natural Hebrew wording for recipe cooking steps."""

from __future__ import annotations

import re

from home_cooking_language import sanitize_home_cooking_step

from measurement_units import (
    ENGLISH_UNIT_ALTERNATIVES,
    parse_leading_measurement,
    strip_quantity_prefix,
)

HEBREW_UNITS = r"כפית|כפיות|כף|כפות|גרם|מ\"ל|כוס|כוסות|יחידה|יחידות"
ALL_UNITS = f"{HEBREW_UNITS}|{ENGLISH_UNIT_ALTERNATIVES}"
QTY = r"\d+(?:\s+\d+/\d+)?"

HEBREW_LABELS: dict[str, str] = {
    "sugar": "סוכר",
    "vanilla": "וניל",
    "butter": "חמאה",
    "salt": "מלח",
    "pepper": "פלפל שחור",
    "black pepper": "פלפל שחור",
    "olive oil": "שמן זית",
    "oil": "שמן",
    "coffee": "קפה",
    "tahini": "טחינה",
    "marshmallow": "מרשמלו",
    "marshmallows": "מרשמלו",
    "coconut": "קוקוס",
    "coconut milk": "חלב קוקוס",
    "strawberry": "תות",
    "strawberries": "תותים",
}


def with_hebrew_definite_article(name: str) -> str:
    word = (name or "").strip()
    if not word:
        return word
    if word.startswith("ה") and len(word) > 2:
        return word
    if word.startswith("אבקת "):
        return word
    if word.startswith("ו") and len(word) > 1:
        return f"ה{word}"
    if " " in word:
        first, second, *rest = word.split()
        if first == "שמן" and second:
            tail = f" {' '.join(rest)}" if rest else ""
            return f"שמן ה{second}{tail}"
        return f"ה{word}"
    return f"ה{word}"


def _parse_step_measurement(raw: str) -> dict | None:
    measured = parse_leading_measurement(raw)
    if measured:
        return measured
    match = re.match(
        rf"^({QTY})\s*({HEBREW_UNITS})\.?\s+(.+)$",
        (raw or "").strip(),
    )
    if not match:
        return None
    return {"qty": match.group(1), "unit": match.group(2), "name": match.group(3).strip()}


def to_step_ingredient_reference(name_or_display: str, language: str = "he") -> str:
    raw = (name_or_display or "").strip()
    if not raw:
        return ""
    if language != "he":
        bare = raw
        measured = _parse_step_measurement(raw)
        if measured:
            bare = measured["name"].strip()
        else:
            bare = strip_quantity_prefix(raw).strip() or raw
        label = bare.lower()
        return label if label.startswith("the ") else f"the {label}"

    bare = raw
    measured = _parse_step_measurement(raw)
    if measured:
        bare = measured["name"].strip()
    else:
        bare = strip_quantity_prefix(raw).strip() or raw

    label = HEBREW_LABELS.get(bare.lower(), bare)
    return with_hebrew_definite_article(label)


def format_hebrew_step_ingredient_list(references: list[str]) -> str:
    items = [item.strip() for item in references if item and item.strip()]
    if not items:
        return "המרכיבים"
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        first, second = items
        a = first if first.startswith("ה") else f"ה{first}"
        b = second if second.startswith("ה") else f"ה{second}"
        return f"{a} ו{b.removeprefix('ה')}"
    last = items[-1]
    head = ", ".join(items[:-1])
    return f"{head} ו{last.removeprefix('ה')}"


def strip_quantities_from_step_text(text: str, language: str = "he") -> str:
    if language != "he":
        return (text or "").strip()

    line = text or ""
    line = re.sub(
        rf"(אבקת\s+){QTY}\s*(?:{ALL_UNITS})\.?\s+",
        r"\1",
        line,
        flags=re.IGNORECASE,
    )
    line = re.sub(
        rf"{QTY}\s*(?:{ALL_UNITS})\.?\s+([\u0590-\u05FF][\u0590-\u05FF\s\"']*)",
        lambda match: with_hebrew_definite_article(match.group(1).strip()),
        line,
        flags=re.IGNORECASE,
    )
    line = re.sub(
        rf"(את\s+){QTY}\s+([\u0590-\u05FF][\u0590-\u05FF]+)",
        lambda match: f"{match.group(1)}{with_hebrew_definite_article(match.group(2))}",
        line,
    )
    line = re.sub(
        rf"(?<=(?:^|[\s(,])){QTY}\s+([\u0590-\u05FF][\u0590-\u05FF]+)(?=[\s,.)]|$)",
        lambda match: with_hebrew_definite_article(match.group(1)),
        line,
    )
    line = re.sub(
        r"([\u0590-\u05FF]+),\s+(ו?[\u0590-\u05FF]+)",
        lambda match: (
            f"{with_hebrew_definite_article(match.group(1).removeprefix('ה'))} "
            f"ו{with_hebrew_definite_article(match.group(2).lstrip('ו')).removeprefix('ה')}"
        ),
        line,
    )
    line = line.replace("מכינים ומסדרים את", "מסדרים את")
    return re.sub(r"\s{2,}", " ", line).strip()


def format_english_step_ingredient_list(references: list[str]) -> str:
    items = [item.strip() for item in references if item and item.strip()]
    if not items:
        return "the ingredients"
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])}, and {items[-1]}"


def naturalize_hebrew_steps(steps: list[str], ingredient_names: list[str] | None = None, language: str = "he") -> list[str]:
    if language != "he":
        return list(steps or [])

    refs = [
        to_step_ingredient_reference(name, "he")
        for name in (ingredient_names or [])
        if name
    ]

    updated: list[str] = []
    for step in steps or []:
        text = strip_quantities_from_step_text(step, "he")
        for ref in refs:
            bare = ref.removeprefix("ה")
            if bare and ref not in text:
                text = re.sub(rf"\b{re.escape(bare)}\b", ref, text)
        updated.append(sanitize_home_cooking_step(strip_quantities_from_step_text(text, "he"), "he"))
    return updated


def naturalize_recipe_steps(steps: list[str], ingredient_names: list[str] | None = None, language: str = "he") -> list[str]:
    return naturalize_hebrew_steps(steps, ingredient_names, language)
