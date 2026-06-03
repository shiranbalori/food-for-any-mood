"""Validate that user ingredients match the selected kosher category."""

from __future__ import annotations

import re

from ingredient_relevance import canonical_ingredient, normalize_ingredient, parse_user_ingredients

DAIRY_CANON = frozenset(
    {
        "milk",
        "cheese",
        "cream",
        "butter",
        "yogurt",
        "ricotta",
        "parmesan",
        "feta",
        "cottage cheese",
        "mozzarella",
    }
)

MEAT_FISH_CANON = frozenset(
    {
        "chicken",
        "beef",
        "fish",
        "salmon",
        "tuna",
        "turkey",
        "lamb",
        "pork",
        "meat",
        "steak",
        "ground beef",
    }
)

GLUTEN_CANON = frozenset({"flour", "pasta", "bread", "wheat", "noodles", "tortilla", "bulgur", "semolina"})

DAIRY_TEXT = re.compile(
    r"חלב|גבינ|שמנת|חמאה|יוגורט|קוטג|מוצרל|פרמז|ריקוט|מסקרפונ|"
    r"\bmilk\b|cheese|cream|butter|yogurt",
    re.IGNORECASE,
)
MEAT_TEXT = re.compile(
    r"עוף|בשר|בקר|כבש|הודו|דג|סלמון|טונה|נקניק|קבב|סטייק|"
    r"chicken|beef|fish|salmon|tuna|turkey|lamb|pork|\bmeat\b|steak",
    re.IGNORECASE,
)


def _ingredient_profile(user_ingredients: list[str]) -> dict:
    canons: list[str] = []
    for item in user_ingredients:
        canon = canonical_ingredient(item) or normalize_ingredient(item)
        if canon:
            canons.append(canon)

    canon_set = set(canons)
    text_blob = " ".join(user_ingredients)

    has_dairy = bool(canon_set & DAIRY_CANON) or bool(DAIRY_TEXT.search(text_blob))
    has_meat = bool(canon_set & MEAT_FISH_CANON) or bool(MEAT_TEXT.search(text_blob))
    has_gluten = bool(canon_set & GLUTEN_CANON)

    return {
        "canons": canons,
        "has_dairy": has_dairy,
        "has_meat": has_meat,
        "has_gluten": has_gluten,
    }


def _suggest_category(profile: dict) -> str:
    if profile["has_meat"] and not profile["has_dairy"]:
        return "meat"
    if profile["has_dairy"] and not profile["has_meat"]:
        return "dairy"
    if not profile["has_meat"] and not profile["has_dairy"]:
        return "parve"
    return "parve"


def _category_label(category: str, *, language: str) -> str:
    if language == "en":
        return {"dairy": "dairy", "meat": "meat", "parve": "parve"}.get(category, category)
    return {"dairy": "חלבי", "meat": "בשרי", "parve": "פרווה"}.get(category, category)


def assess_category_fit(
    user_ingredients_raw: str,
    *,
    category: str = "dairy",
    is_gluten_free: bool = False,
    language: str = "he",
) -> dict:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    if not user_ingredients:
        return {"category_ok": True, "reason": "", "suggested_category": category, "missing_ingredients": []}

    profile = _ingredient_profile(user_ingredients)
    is_he = language == "he"
    suggested = _suggest_category(profile)
    selected_label = _category_label(category, language=language)
    suggested_label = _category_label(suggested, language=language)

    if is_gluten_free and profile["has_gluten"]:
        gluten_items = [item for item in user_ingredients if canonical_ingredient(item) in GLUTEN_CANON]
        return {
            "category_ok": False,
            "reason": (
                "בחרתם «ללא גלוטן» אבל יש במרכיבים מוצרים עם גלוטן (למשל קמח, פסטה או לחם). "
                "הסירו אותם או בטלו את סימון ללא גלוטן."
                if is_he
                else "Gluten-free is selected but your ingredients include gluten (e.g. flour, pasta, or bread). "
                "Remove them or turn off gluten-free."
            ),
            "suggested_category": suggested,
            "missing_ingredients": gluten_items[:4],
        }

    if profile["has_meat"] and profile["has_dairy"]:
        return {
            "category_ok": False,
            "reason": (
                "לא ניתן לבחור קטגוריה אחת — יש גם בשר/עוף/דג וגם מוצרי חלב. "
                f"הסירו קבוצה אחת, או נסו קטגוריה «{_category_label('parve', language=language)}» רק אם אין בשר וחלב יחד."
                if is_he
                else "Cannot pick one category — you have both meat/fish and dairy. Remove one group."
            ),
            "suggested_category": suggested,
            "missing_ingredients": [],
        }

    if category == "dairy" and not profile["has_dairy"]:
        missing = ["חלב, גבינה, שמנת, חמאה או יוגורט"] if is_he else ["milk, cheese, cream, butter, or yogurt"]
        return {
            "category_ok": False,
            "reason": (
                f"הקטגוריה «{selected_label}» דורשת מרכיב חלבי אמיתי (גבינה, חלב, שמנת, חמאה, יוגורט). "
                f"מה שיש לכם מתאים יותר ל«{suggested_label}» — הוסיפו מוצר חלב או שנו קטגוריה."
                if is_he
                else f"Category «{selected_label}» needs a real dairy ingredient. Try «{suggested_label}» instead."
            ),
            "suggested_category": suggested,
            "missing_ingredients": missing,
        }

    if category == "meat" and not profile["has_meat"]:
        missing = ["עוף, בשר, דג או טונה"] if is_he else ["chicken, beef, fish, or tuna"]
        return {
            "category_ok": False,
            "reason": (
                f"הקטגוריה «{selected_label}» דורשת בשר, עוף או דג. "
                f"מה שיש לכם מתאים יותר ל«{suggested_label}» — הוסיפו חלבון מהבשר או שנו קטגוריה."
                if is_he
                else f"Category «{selected_label}» needs meat, chicken, or fish. Try «{suggested_label}» instead."
            ),
            "suggested_category": suggested,
            "missing_ingredients": missing,
        }

    if category == "parve" and (profile["has_meat"] or profile["has_dairy"]):
        parts = []
        if profile["has_meat"]:
            parts.append("בשר/עוף/דג" if is_he else "meat/fish")
        if profile["has_dairy"]:
            parts.append("מוצרי חלב" if is_he else "dairy")
        joined = " ו".join(parts) if is_he else " and ".join(parts)
        return {
            "category_ok": False,
            "reason": (
                f"הקטגוריה «{selected_label}» אינה כוללת {joined}. "
                f"הסירו אותם או בחרו «{suggested_label}»."
                if is_he
                else f"Category «{selected_label}» cannot include {joined}. Choose «{suggested_label}»."
            ),
            "suggested_category": suggested,
            "missing_ingredients": [],
        }

    return {"category_ok": True, "reason": "", "suggested_category": category, "missing_ingredients": []}
