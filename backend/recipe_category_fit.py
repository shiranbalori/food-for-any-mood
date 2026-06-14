"""Input category constraints — output category is enforced after generation.

Users may enter any normal food ingredients for any category.
Only hard conflicts block generation (gluten-free+gluten, meat+dairy together, vegan+animal).
"""

from __future__ import annotations

import re

from ingredient_relevance import canonical_ingredient, normalize_ingredient, parse_user_ingredients

CATEGORY_MISMATCH_MESSAGE = {
    "he": "המרכיבים שהוזנו אינם תואמים לקטגוריה שנבחרה",
    "en": "The ingredients you entered do not match the category you selected",
}

CATEGORY_LABELS = {
    "he": {"dairy": "חלבי", "meat": "בשרי", "parve": "פרווה", "vegan": "טבעוני"},
    "en": {"dairy": "dairy", "meat": "meat", "parve": "parve", "vegan": "vegan"},
}


def build_category_mismatch_message(category: str, *, language: str) -> str:
    """Legacy message — kept for scripts; generation no longer blocks on category mismatch."""
    labels = CATEGORY_LABELS["he" if language == "he" else "en"]
    label = labels.get(category)
    if label:
        if language == "he":
            return f"המרכיבים שהוזנו אינם תואמים לקטגוריה {label}"
        return f"The ingredients you entered do not match the {label} category"
    return CATEGORY_MISMATCH_MESSAGE["he"] if language == "he" else CATEGORY_MISMATCH_MESSAGE["en"]

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

LAND_MEAT_CANON = frozenset(
    {
        "chicken",
        "beef",
        "turkey",
        "lamb",
        "pork",
        "meat",
        "steak",
        "ground beef",
    }
)

FISH_CANON = frozenset({"fish", "salmon", "tuna"})

MEAT_FISH_CANON = LAND_MEAT_CANON | FISH_CANON

GLUTEN_CANON = frozenset({"flour", "pasta", "bread", "wheat", "noodles", "tortilla", "bulgur", "semolina"})

EGG_CANON = frozenset({"egg", "eggs"})
HONEY_CANON = frozenset({"honey"})

DAIRY_TEXT = re.compile(
    r"חלב|גבינ|שמנת|חמאה|יוגורט|קוטג|מוצרל|פרמז|ריקוט|מסקרפונ|"
    r"\bmilk\b|cheese|cream|butter|yogurt",
    re.IGNORECASE,
)
LAND_MEAT_TEXT = re.compile(
    r"עוף|בשר|בקר|כבש|הודו|נקניק|קבב|סטייק|קציצ|"
    r"chicken|beef|turkey|lamb|pork|\bmeat\b|steak|ground beef",
    re.IGNORECASE,
)
FISH_TEXT = re.compile(r"דג|סלמון|טונה|\bfish\b|salmon|tuna", re.IGNORECASE)
MEAT_TEXT = re.compile(
    rf"{LAND_MEAT_TEXT.pattern}|{FISH_TEXT.pattern}",
    re.IGNORECASE,
)
EGG_TEXT = re.compile(r"ביצ|\begg\b|\beggs\b", re.IGNORECASE)
HONEY_TEXT = re.compile(r"דבש|\bhoney\b", re.IGNORECASE)

SPICE_ONLY_CANON = frozenset(
    {
        "salt",
        "pepper",
        "black pepper",
        "cinnamon",
        "vanilla",
        "nutmeg",
        "paprika",
        "cumin",
        "oregano",
        "basil",
        "thyme",
        "ginger",
    }
)


def build_vegan_conflict_message(conflicting_ingredients: list[str], *, language: str) -> str:
    is_he = language == "he"
    sample = ", ".join(conflicting_ingredients[:2])
    if is_he:
        return (
            f"בחרתם טבעוני, אבל הוזנו מרכיבים מן החי ({sample}) — "
            "מתכון טבעוני לא יכול לכלול עוף, בשר, חלב, ביצים או דבש."
            if sample
            else "בחרתם טבעוני, אבל הוזנו מרכיבים מן החי — מתכון טבעוני לא יכול לכלול מוצרים מהחי."
        )
    return (
        f"You selected vegan, but entered animal ingredients ({sample}) — "
        "a vegan recipe cannot include meat, dairy, eggs, or honey."
        if sample
        else "You selected vegan, but entered animal ingredients — a vegan recipe cannot include animal products."
    )


def build_meat_dairy_conflict_message(*, language: str) -> str:
    return (
        "לא ניתן לבחור קטגוריה אחת — יש גם בשר/עוף וגם מוצרי חלב. הסירו קבוצה אחת."
        if language == "he"
        else "Cannot pick one category — you have both meat/poultry and dairy. Remove one group."
    )


def build_gluten_free_conflict_message(*, language: str) -> str:
    return (
        "בחרתם «ללא גלוטן» אבל יש במרכיבים מוצרים עם גלוטן (למשל קמח, פסטה או לחם). "
        "הסירו אותם או בטלו את סימון ללא גלוטן."
        if language == "he"
        else "Gluten-free is selected but your ingredients include gluten (e.g. flour, pasta, or bread). "
        "Remove them or turn off gluten-free."
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
    has_land_meat = bool(canon_set & LAND_MEAT_CANON) or bool(LAND_MEAT_TEXT.search(text_blob))
    has_fish = bool(canon_set & FISH_CANON) or bool(FISH_TEXT.search(text_blob))
    has_meat = has_land_meat or has_fish
    has_eggs = bool(canon_set & EGG_CANON) or bool(EGG_TEXT.search(text_blob))
    has_honey = bool(canon_set & HONEY_CANON) or bool(HONEY_TEXT.search(text_blob))
    has_gluten = bool(canon_set & GLUTEN_CANON)

    return {
        "canons": canons,
        "has_dairy": has_dairy,
        "has_land_meat": has_land_meat,
        "has_fish": has_fish,
        "has_meat": has_meat,
        "has_eggs": has_eggs,
        "has_honey": has_honey,
        "has_gluten": has_gluten,
        "only_spices": bool(canons)
        and all(c in SPICE_ONLY_CANON or c in {"oil", "olive oil", "water"} for c in canon_set),
    }


def _suggest_category(profile: dict) -> str:
    if profile["has_land_meat"] and not profile["has_dairy"]:
        return "meat"
    if profile["has_dairy"] and not profile["has_land_meat"]:
        return "dairy"
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
    """Hard input constraints only — never reject because category lacks matching ingredients."""
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    is_he = language == "he"
    profile = _ingredient_profile(user_ingredients)
    suggested = _suggest_category(profile) if category == "any" else category

    if not user_ingredients:
        return {
            "category_ok": True,
            "reason": "",
            "suggested_category": suggested if category != "any" else "parve",
            "missing_ingredients": [],
        }

    if is_gluten_free and profile["has_gluten"]:
        gluten_items = [item for item in user_ingredients if canonical_ingredient(item) in GLUTEN_CANON]
        return {
            "category_ok": False,
            "reason": build_gluten_free_conflict_message(language=language),
            "suggested_category": _suggest_category(profile),
            "missing_ingredients": gluten_items[:4],
        }

    if profile["has_land_meat"] and profile["has_dairy"]:
        return {
            "category_ok": False,
            "reason": build_meat_dairy_conflict_message(language=language),
            "suggested_category": _suggest_category(profile),
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
            "reason": build_vegan_conflict_message(vegan_conflicts, language=language),
            "suggested_category": "parve",
            "missing_ingredients": vegan_conflicts[:4],
        }

    return {
        "category_ok": True,
        "reason": "",
        "suggested_category": suggested if category != "any" else _suggest_category(profile),
        "missing_ingredients": [],
    }
