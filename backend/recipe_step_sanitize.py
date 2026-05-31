"""Minimal step cleanup for Gemini output — no ingredient injection."""

from __future__ import annotations

import re

PLACEHOLDER_PATTERNS = (
    r"\(strawberry\)",
    r"\[ingredient\]",
    r"ingredient_name",
    r"\bTODO\b",
    r"\bplaceholder\b",
    r"\{\{.*?\}\}",
    r"<.*?>",
    r"\bxxx\b",
    r"lorem ipsum",
)

REPEATED_PAREN = re.compile(r"(\([^)]+\))(?:\s+\1)+")
DUPLICATE_WORD = re.compile(r"\b([\u0590-\u05FFa-z]+)\s+\1\b", re.IGNORECASE)
DUPLICATE_QTY = re.compile(r"(\d+(?:\s+\d+/\d+)?)\s+\1(?=\s|[\u0590-\u05FFa-zA-Z]|$)")


def has_repeated_parenthetical_ingredients(text: str) -> bool:
    return bool(REPEATED_PAREN.search(text or ""))


def light_sanitize_step_text(text: str) -> str:
    line = (text or "").strip()
    line = DUPLICATE_QTY.sub(r"\1", line)
    line = REPEATED_PAREN.sub(r"\1", line)
    line = DUPLICATE_WORD.sub(r"\1", line)
    for pattern in PLACEHOLDER_PATTERNS:
        line = re.sub(pattern, "", line, flags=re.IGNORECASE)
    return re.sub(r"\s{2,}", " ", line).strip()


def light_sanitize_recipe_steps(steps: list[str]) -> list[str]:
    return [step for step in (light_sanitize_step_text(s) for s in (steps or [])) if step]
