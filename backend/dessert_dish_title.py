"""Build real dessert dish titles — never ingredient lists."""

from __future__ import annotations

import re

from ingredient_relevance import canonical_ingredient, ingredient_appears_in_text

QTY_PREFIX = re.compile(
    r"^[\d./]+\s*(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ\"ל|כוס(?:ות)?|tsp|tbsp|gram|grams|g|ml|cup|cups)?\s*",
    re.IGNORECASE,
)

DESSERT_STAPLE_CANONICAL = {
    "salt",
    "pepper",
    "black pepper",
    "oil",
    "olive",
    "olive oil",
    "water",
    "sugar",
    "egg",
    "eggs",
    "cream",
    "butter",
    "flour",
    "milk",
    "baking powder",
}

FLAVOR_PRIORITY = (
    "vanilla",
    "chocolate",
    "honey",
    "cinnamon",
    "lemon",
    "blueberries",
    "apple",
    "cheese",
    "coconut",
    "marshmallow",
    "strawberry",
    "banana",
    "orange",
    "coffee",
    "caramel",
    "peanut butter",
    "peanut",
)

HEBREW_LABELS: dict[str, str] = {
    "vanilla": "וניל",
    "chocolate": "שוקולד",
    "honey": "דבש",
    "cinnamon": "קינמון",
    "cream": "שמנת",
    "egg": "ביצים",
    "eggs": "ביצים",
    "cheese": "גבינה",
}


def _strip_qty_prefix(raw: str) -> str:
    return QTY_PREFIX.sub("", (raw or "").strip()).strip()


def _filter_flavor_ingredients(ingredients: list[str]) -> list[str]:
    result = []
    for item in ingredients:
        canon = canonical_ingredient(_strip_qty_prefix(item))
        if canon and canon in DESSERT_STAPLE_CANONICAL:
            continue
        result.append(item)
    return result


def _display_label(item: str, language: str) -> str:
    bare = _strip_qty_prefix(item)
    if re.search(r"[\u0590-\u05FF]", bare) and not re.search(r"[a-z]", bare, re.IGNORECASE):
        return re.sub(r"\(.*?\)", "", bare).strip()
    canon = canonical_ingredient(bare)
    if language == "he" and canon and canon in HEBREW_LABELS:
        return HEBREW_LABELS[canon]
    return bare


def count_title_words(title: str) -> int:
    return len([part for part in (title or "").strip().split() if part])


def pick_primary_flavor_label(ingredients: list[str], language: str = "he") -> str:
    filtered = _filter_flavor_ingredients(ingredients)
    canon_list = [canonical_ingredient(_strip_qty_prefix(item)) or item for item in filtered]

    for flavor in FLAVOR_PRIORITY:
        if flavor in canon_list:
            for item in filtered:
                if canonical_ingredient(_strip_qty_prefix(item)) == flavor:
                    return _display_label(item, language)
            if language == "he" and flavor in HEBREW_LABELS:
                return HEBREW_LABELS[flavor]
            return flavor

    if filtered:
        return _display_label(filtered[0], language)
    return "וניל" if language == "he" else "vanilla"


def infer_default_dessert_style_id(main_canon: list[str]) -> str:
    canon = set(main_canon)
    if "flour" in canon and "sugar" in canon:
        return "cream"
    if ("egg" in canon or "eggs" in canon) and ("cream" in canon or "milk" in canon):
        return "baked_custard"
    if "cream" in canon:
        return "mousse"
    if "egg" in canon or "eggs" in canon:
        return "pudding"
    return "pudding"


DESSERT_STYLE_VARIANTS: list[dict] = [
    {
        "id": "baked_custard",
        "category": "baked_custard",
        "method": "baked",
        "title_he": lambda main: f"קרם {main} אפוי",
        "title_en": lambda main: f"Baked {main} custard",
    },
    {
        "id": "mousse",
        "category": "mousse",
        "method": "chilled",
        "title_he": lambda main: f"מוס {main} קטיפתי",
        "title_en": lambda main: f"{main} velvet mousse",
    },
    {
        "id": "pudding",
        "category": "pudding",
        "method": "boiled",
        "title_he": lambda main: f"פודינג {main} ביתי",
        "title_en": lambda main: f"Homemade {main} pudding",
    },
    {
        "id": "cream",
        "category": "cream",
        "method": "chilled",
        "title_he": lambda main: f"קרם {main} ביתי",
        "title_en": lambda main: f"Homemade {main} cream",
    },
    {
        "id": "cups",
        "category": "cream",
        "method": "chilled",
        "title_he": lambda main: f"קינוח כוסות {main}",
        "title_en": lambda main: f"{main} dessert cups",
    },
    {
        "id": "pancake",
        "category": "pancake",
        "method": "fried",
        "title_he": lambda main: f"פנקייק {main}",
        "title_en": lambda main: f"{main} pancakes",
    },
]


def _normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def is_duplicate_dessert_title(title: str, exclude_titles: list[str]) -> bool:
    normalized = _normalize_title(title)
    return any(_normalize_title(item) == normalized for item in exclude_titles)


def build_dessert_dish_title(
    ingredients: list[str],
    *,
    language: str = "he",
    style_id: str | None = None,
    exclude_titles: list[str] | None = None,
    exclude_cooking_methods: list[str] | None = None,
    exclude_dessert_categories: list[str] | None = None,
) -> dict:
    exclude_titles = exclude_titles or []
    exclude_cooking_methods = exclude_cooking_methods or []
    exclude_dessert_categories = exclude_dessert_categories or []
    main = pick_primary_flavor_label(ingredients, language)
    main_canon = [
        canonical_ingredient(_strip_qty_prefix(item)) or item
        for item in _filter_flavor_ingredients(ingredients)
    ]
    preferred_style = style_id or infer_default_dessert_style_id(main_canon)

    available = []
    for variant in DESSERT_STYLE_VARIANTS:
        title = variant["title_he"](main) if language == "he" else variant["title_en"](main)
        if is_duplicate_dessert_title(title, exclude_titles):
            continue
        if variant["method"] in exclude_cooking_methods:
            continue
        if variant["category"] in exclude_dessert_categories:
            continue
        available.append(variant)

    preferred = next((item for item in available if item["id"] == preferred_style), None)
    if preferred is None:
        preferred = available[0] if available else next(
            item for item in DESSERT_STYLE_VARIANTS if item["id"] == preferred_style
        )
    if preferred is None:
        preferred = DESSERT_STYLE_VARIANTS[0]

    name = preferred["title_he"](main) if language == "he" else preferred["title_en"](main)
    return {
        "name": name,
        "style_id": preferred["id"],
        "cooking_method": preferred["method"],
        "dessert_category": preferred["category"],
        "main_flavor": main,
    }


def is_ingredient_list_title(title: str, ingredients: list[str], language: str = "he") -> bool:
    text = (title or "").strip()
    if not text:
        return True
    if re.search(r"^מתכון\s", text, re.IGNORECASE):
        return True
    if count_title_words(text) > 4:
        return True

    labels = list(
        dict.fromkeys(_display_label(item, language) for item in _filter_flavor_ingredients(ingredients))
    )
    labels = [label for label in labels if label]
    if not labels:
        return False

    matched = [label for label in labels if ingredient_appears_in_text(label, text)]
    if len(matched) >= 2:
        return True

    if re.search(r"^קינוח\s", text, re.IGNORECASE) and not re.search(r"^קינוח כוסות", text, re.IGNORECASE):
        rest = re.sub(r"^קינוח\s+", "", text, flags=re.IGNORECASE)
        if count_title_words(rest) >= 2 and matched:
            return True

    if len(labels) >= 2:
        first, second = labels[0], labels[1]
        if text == f"{first} עם {second}" or text == f"{first} ו{second}":
            return True

    if len(labels) == 1 and text == labels[0]:
        return True

    return False
