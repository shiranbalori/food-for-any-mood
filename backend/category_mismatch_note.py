"""User-facing note when selected kosher category does not match listed ingredients."""

from __future__ import annotations


def build_category_mismatch_note(
    selected_category: str,
    suggested_category: str,
    *,
    language: str = "he",
) -> str:
    if selected_category == suggested_category or selected_category == "any":
        return ""

    is_he = language == "he"
    if is_he:
        if selected_category == "dairy" and suggested_category == "parve":
            return (
                "המרכיבים שהוזנו לא כוללים מוצרי חלב, לכן נוצר מתכון קרוב יותר מסוג פרווה."
            )
        if selected_category == "meat" and suggested_category == "parve":
            return (
                "המרכיבים שהוזנו לא כוללים בשר, עוף או דג, לכן נוצר מתכון קרוב יותר מסוג פרווה."
            )
        if selected_category == "parve" and suggested_category == "dairy":
            return (
                "המרכיבים כוללים מוצרי חלב, לכן המתכון מסווג כחלבי ולא כפרווה."
            )
        if selected_category == "parve" and suggested_category == "meat":
            return (
                "המרכיבים כוללים בשר, עוף או דג, לכן המתכון מסווג כבשרי ולא כפרווה."
            )
        if selected_category == "dairy" and suggested_category == "meat":
            return "המרכיבים מתאימים יותר למתכון בשרי מאשר חלבי."
        if selected_category == "meat" and suggested_category == "dairy":
            return "המרכיבים מתאימים יותר למתכון חלבי מאשר בשרי."
        return ""

    if selected_category == "dairy" and suggested_category == "parve":
        return (
            "Your ingredients do not include dairy, so we created a parve-style recipe instead."
        )
    if selected_category == "meat" and suggested_category == "parve":
        return (
            "Your ingredients do not include meat or fish, so we created a parve-style recipe instead."
        )
    if selected_category == "parve" and suggested_category == "dairy":
        return "Your ingredients include dairy, so the recipe is classified as dairy."
    if selected_category == "parve" and suggested_category == "meat":
        return "Your ingredients include meat or fish, so the recipe is classified as meat."
    return ""
