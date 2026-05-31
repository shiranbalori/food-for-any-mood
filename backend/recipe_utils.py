"""Shared recipe helpers with no parser/validation dependencies."""

from __future__ import annotations

from ingredient_allowlist import is_system_pantry_ingredient


def is_staple(name: str) -> bool:
    """True when the ingredient is a basic pantry staple (salt, oil, water, etc.)."""
    return is_system_pantry_ingredient(name)
