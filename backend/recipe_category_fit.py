"""Validate that user ingredients match the selected kosher category.

Definitions:
- dairy: milk, cheese, yogurt, cream, butter (no meat/fish/poultry).
- meat: meat, chicken, turkey, fish (no dairy).
- parve: neither dairy nor meat.
- any: no user preference; category inferred after generation.
"""

from __future__ import annotations

import re

from category_mismatch_note import build_category_mismatch_note
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

EGG_CANON = frozenset({"egg", "eggs"})
HONEY_CANON = frozenset({"honey"})

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
EGG_TEXT = re.compile(r"ביצ|\begg\b|\beggs\b", re.IGNORECASE)
HONEY_TEXT = re.compile(r"דבש|\bhoney\b", re.IGNORECASE)


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
    has_eggs = bool(canon_set & EGG_CANON) or bool(EGG_TEXT.search(text_blob))
    has_honey = bool(canon_set & HONEY_CANON) or bool(HONEY_TEXT.search(text_blob))
    has_gluten = bool(canon_set & GLUTEN_CANON)

    return {
        "canons": canons,
        "has_dairy": has_dairy,
        "has_meat": has_meat,
        "has_eggs": has_eggs,
        "has_honey": has_honey,
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
        return {"dairy": "dairy", "meat": "meat", "parve": "parve", "vegan": "vegan"}.get(category, category)
    return {"dairy": "חלבי", "meat": "בשרי", "parve": "פרווה", "vegan": "טבעוני"}.get(category, category)


def assess_category_fit(
    user_ingredients_raw: str,
    *,
    category: str = "dairy",
    is_gluten_free: bool = False,
    language: str = "he",
) -> dict:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    if not user_ingredients:
        suggested = "parve" if category == "any" else category
        return {"category_ok": True, "reason": "", "suggested_category": suggested, "missing_ingredients": []}

    profile = _ingredient_profile(user_ingredients)
    is_he = language == "he"
    suggested = _suggest_category(profile)
    selected_label = "ללא העדפה" if category == "any" and is_he else (
        "no preference" if category == "any" else _category_label(category, language=language)
    )
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

    if category == "any":
        return {"category_ok": True, "reason": "", "suggested_category": suggested, "missing_ingredients": []}

    if category == "dairy" and not profile["has_dairy"]:
        return {
            "category_ok": True,
            "category_mismatch": True,
            "category_note": build_category_mismatch_note("dairy", suggested, language=language),
            "reason": "",
            "suggested_category": suggested,
            "missing_ingredients": [],
        }

    if category == "meat" and not profile["has_meat"]:
        return {
            "category_ok": True,
            "category_mismatch": True,
            "category_note": build_category_mismatch_note("meat", suggested, language=language),
            "reason": "",
            "suggested_category": suggested,
            "missing_ingredients": [],
        }

    if category == "parve" and (profile["has_meat"] or profile["has_dairy"]):
        return {
            "category_ok": True,
            "category_mismatch": True,
            "category_note": build_category_mismatch_note("parve", suggested, language=language),
            "reason": "",
            "suggested_category": suggested,
            "missing_ingredients": [],
        }

    if category == "vegan" and (
        profile["has_meat"] or profile["has_dairy"] or profile["has_eggs"] or profile["has_honey"]
    ):
        vegan_conflicts = [
            item
            for item in user_ingredients
            if (
                canonical_ingredient(item) in MEAT_FISH_CANON
                or canonical_ingredient(item) in DAIRY_CANON
                or canonical_ingredient(item) in EGG_CANON
                or canonical_ingredient(item) in HONEY_CANON
                or MEAT_TEXT.search(item)
                or DAIRY_TEXT.search(item)
                or EGG_TEXT.search(item)
                or HONEY_TEXT.search(item)
            )
        ]
        return {
            "category_ok": False,
            "reason": (
                "בחרתם «טבעוני» אבל יש במרכיבים בשר, חלב, ביצים, דבש או מוצרים מן החי. "
                "הסירו אותם או בחרו קטגוריה אחרת."
                if is_he
                else "Vegan is selected but your ingredients include meat, dairy, eggs, honey, or animal products. "
                "Remove them or choose another category."
            ),
            "suggested_category": "parve",
            "missing_ingredients": vegan_conflicts[:4],
        }

    return {
        "category_ok": True,
        "reason": "",
        "suggested_category": category,
        "missing_ingredients": [],
        "category_note": "",
    }
