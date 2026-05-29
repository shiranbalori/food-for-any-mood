"""Build and validate descriptive Hebrew dish titles (not mood-based)."""

from __future__ import annotations

import re

from ingredient_relevance import canonical_ingredient, ingredient_appears_in_text

STAPLE_CANONICAL = {
    "salt",
    "pepper",
    "black pepper",
    "oil",
    "olive",
    "olive oil",
    "water",
    "sugar",
}

MOOD_TITLE_PATTERNS = [
    re.compile(r"^ארוח(?:ת|ה)\s+"),
    re.compile(r"ארוח(?:ת|ה)?\s+(?:נרות|נוחות|רגוע(?:ה|ים)?|שמ(?:ה|ים)|חמ(?:ה|ים)|מנח(?:ם|מת)|רומנטית?)"),
    re.compile(r"(?:ערב|בוקר|צהריים)\s+(?:רגוע|רומנטי|שמח|נעים|חמים|מיוחד)"),
    re.compile(r"(?:ווייב|וייב|וייב|vibe)", re.IGNORECASE),
    re.compile(r"^מנה\s+(?:נעימ(?:ה|ים)?|אנרגטית|רגועה|שמחה|מנחמת|מרגיעה|מיוחדת|מושלמת|חמ(?:ה|ימה))"),
    re.compile(r"^(?:cozy|comfort|energetic|adventurous|relaxed|happy|romantic|mood)\b", re.IGNORECASE),
    re.compile(r"(?:נוחות|רומנטי|מצב\s+רוח|good\s+vibes|atmosphere)", re.IGNORECASE),
    re.compile(r"^מנה\s+ע(?:ם|ל)\s+(?:מרכיבים|הכל)$"),
    re.compile(r"^(?:ערב|בוקר)\s+"),
]

FORBIDDEN_TITLE_WORDS = [
    "נרות",
    "נוחות",
    "רומנטי",
    "ווייב",
    "וייב",
    "וייב",
    "vibe",
    "vibes",
    "cozy",
    "comfort",
    "energetic",
    "adventurous",
    "relaxed",
    "happy",
    "mood",
    "atmosphere",
    "ארוחה",
    "ארוחת",
]

KNOWN_DISH_PREFIXES = [
    "שקשוקה",
    "מקושקש",
    "חבית",
    "פסטה",
    "סלט",
    "מרק",
    "קארי",
    "אורז",
    "טאקו",
    "קציצ",
    "ריזוטו",
    "מוקפץ",
    "עוף",
    "בשר",
    "טונה",
    "פנקייק",
    "קוביות",
]

GENERIC_DISH_TITLES = {
    "תבשיל ביתי",
    "סלט ירקות טרי",
    "סלט טרי",
    "מנה מהירה",
    "מנה מהתנור",
    "מוקפץ ירקות",
    "עוף בתנור",
    "תבשיל בשר",
    "קארי ביתי",
    "פסטה ביתית",
    "פסטה מהירה",
    "אורז מוקפץ",
}

QTY_PREFIX = re.compile(
    r"^[\d./]+\s*(?:כפית|כפיות|כף|כפות|גרם|מ\"ל|כוס|כוסות|tsp|tbsp|gram|grams|g|ml|cup|cups)?\s*",
    re.IGNORECASE,
)


def _strip_qty_prefix(raw: str) -> str:
    return QTY_PREFIX.sub("", (raw or "").strip()).strip()

HEBREW_LABELS: dict[str, str] = {
    "pasta": "פסטה",
    "cream": "שמנת מתוקה",
    "garlic": "שום",
    "mushroom": "פטריות",
    "tomato": "עגבניות",
    "egg": "ביצים",
    "eggs": "ביצים",
    "rice": "אורז",
    "chicken": "עוף",
    "beef": "בשר בקר",
    "tofu": "טופו",
    "broccoli": "ברוקולי",
    "lentils": "עדשים",
    "curry": "קארי",
    "tuna": "טונה",
    "potato": "תפוחי אדמה",
    "onion": "בצל",
    "cheese": "גבינה",
    "spinach": "תרד",
    "avocado": "אבוקדו",
    "chickpeas": "גרגרי חומוס",
}


def _filter_main_ingredients(ingredients: list[str]) -> list[str]:
    result = []
    for item in ingredients:
        canon = canonical_ingredient(_strip_qty_prefix(item))
        if canon and canon in STAPLE_CANONICAL:
            continue
        result.append(item)
    return result


def _display_ingredient(item: str) -> str:
    bare = _strip_qty_prefix(item)
    if re.search(r"[\u0590-\u05FF]", bare) and not re.search(r"[a-z]", bare, re.IGNORECASE):
        return bare
    canon = canonical_ingredient(bare)
    if canon and canon in HEBREW_LABELS:
        return HEBREW_LABELS[canon]
    return bare


def _main_canon(ingredients: list[str]) -> list[str]:
    return [
        canonical_ingredient(_strip_qty_prefix(item)) or item
        for item in _filter_main_ingredients(ingredients)
    ]


def _is_generic_dish_title(title: str, ingredients: list[str]) -> bool:
    text = (title or "").strip()
    if text not in GENERIC_DISH_TITLES:
        return False
    return len(_main_canon(ingredients)) >= 1


def _has_dish_name_prefix(text: str) -> bool:
    return any(prefix in text for prefix in KNOWN_DISH_PREFIXES)


def _ingredients_support_curry_title(main_canon: list[str]) -> bool:
    return any(item in {"curry", "lentils", "coconut milk", "coconut"} for item in main_canon)


def _ingredients_support_salad_title(main_canon: list[str]) -> bool:
    canon = set(main_canon)
    if "egg" in canon or "eggs" in canon:
        return False
    if {"cucumber", "avocado", "chickpeas"} & canon:
        return True
    return "tomato" in canon and "cucumber" in canon


def _ingredients_support_shakshuka_title(main_canon: list[str]) -> bool:
    canon = set(main_canon)
    return "tomato" in canon and ("egg" in canon or "eggs" in canon) and "onion" in canon


def _infer_cooking_style(
    *,
    cooking_time: int | None,
    steps: list[str],
    tags: list[str],
) -> str | None:
    steps_text = " ".join(steps)
    if re.search(r"תנור|אפ(?:י|ה)", steps_text):
        return "baked"
    if re.search(r"מוקפץ|ווק", steps_text):
        return "stirFry"
    if re.search(r"מרק|ציר|בישול איטי|תבשיל", steps_text):
        return "stew"
    if "סלט" in steps_text:
        return "salad"
    if re.search(r"שקשוק|שקשק", steps_text):
        return "shakshuka"
    if "quick" in tags or (cooking_time and cooking_time <= 25):
        return "quick"
    return None


def _detect_dish_pattern(main_canon: list[str]) -> str:
    canon = set(main_canon)
    if "tomato" in canon and ("egg" in canon or "eggs" in canon):
        return "tomatoEgg"
    if "pasta" in canon:
        return "pasta"
    if "egg" in canon or "eggs" in canon:
        return "omelette"
    if "rice" in canon:
        return "rice"
    if "tuna" in canon and ("egg" in canon or "eggs" in canon):
        return "tunaSalad"
    if {"tofu", "broccoli", "pepper"} & canon:
        return "stirFry"
    if {"lentils", "curry", "coconut milk"} & canon:
        return "curry"
    if "chicken" in canon:
        return "chicken"
    if {"beef", "steak", "lamb"} & canon:
        return "meat"
    if _ingredients_support_salad_title(main_canon):
        return "salad"
    return "generic"


def _build_tomato_egg_title(main_canon: list[str], cooking_style: str | None, steps: list[str]) -> str:
    steps_text = " ".join(steps)
    if (
        _ingredients_support_shakshuka_title(main_canon)
        or re.search(r"שקשוק|שקשק", steps_text)
        or cooking_style == "shakshuka"
    ):
        return "שקשוקה מהירה"
    return "חביתת עגבניות"


def _build_pasta_title(main_canon: list[str], cooking_style: str | None) -> str:
    has_cream = "cream" in main_canon
    has_mushroom = "mushroom" in main_canon
    if has_cream and has_mushroom:
        return "פסטה ברוטב שמנת ופטריות"
    if has_cream:
        return "פסטה ברוטב שמנת"
    return "פסטה מהירה" if cooking_style == "quick" else "פסטה ביתית"


def _build_omelette_title(main_canon: list[str]) -> str:
    if "tomato" in main_canon:
        return "חביתת עגבניות"
    if "spinach" in main_canon:
        return "חביתת תרד"
    if "mushroom" in main_canon:
        return "חביתת פטריות"
    if "cheese" in main_canon:
        return "חביתת גבינה"
    return "חביתה"


def _build_generic_dish_title(main_canon: list[str], cooking_style: str | None, steps: list[str]) -> str:
    if "tomato" in main_canon and ("egg" in main_canon or "eggs" in main_canon):
        return _build_tomato_egg_title(main_canon, cooking_style, steps)
    if "pasta" in main_canon:
        return _build_pasta_title(main_canon, cooking_style)
    if "egg" in main_canon or "eggs" in main_canon:
        return _build_omelette_title(main_canon)
    if "chicken" in main_canon:
        return "עוף בתנור"
    if {"beef", "steak", "lamb"} & set(main_canon):
        return "תבשיל בשר"
    if cooking_style == "stirFry":
        return "מוקפץ ירקות"
    if cooking_style == "salad" and _ingredients_support_salad_title(main_canon):
        return "סלט טרי"
    return "תבשיל ביתי"


def _title_matches_ingredients(title: str, ingredients: list[str]) -> bool:
    text = (title or "").strip()
    main_canon = _main_canon(ingredients)

    if re.search(r"סלט", text) and not _ingredients_support_salad_title(main_canon):
        return False
    if re.search(r"קארי|curry", text, re.IGNORECASE) and not _ingredients_support_curry_title(main_canon):
        return False
    if re.search(r"שקשוק", text) and not _ingredients_support_shakshuka_title(main_canon):
        return False
    if _is_generic_dish_title(text, ingredients):
        return False

    return True


def is_literal_ingredient_title(title: str, ingredients: list[str]) -> bool:
    text = (title or "").strip()
    if not text or _has_dish_name_prefix(text):
        return False

    labels = list(dict.fromkeys(_display_ingredient(item) for item in _filter_main_ingredients(ingredients)))
    labels = [label for label in labels if label]
    if not labels:
        return False

    if len(labels) >= 2:
        matched = [label for label in labels if ingredient_appears_in_text(label, text)]
        if len(matched) >= 2:
            return True
        first, second = labels[0], labels[1]
        if text == f"{first} עם {second}" or text == f"{first} ו{second}":
            return True

    if len(labels) == 1 and text == labels[0]:
        return True

    return False


def build_descriptive_dish_title(
    ingredients: list[str],
    *,
    cooking_time: int | None = None,
    steps: list[str] | None = None,
    style: str | None = None,
    tags: list[str] | None = None,
) -> str:
    steps = steps or []
    tags = tags or []
    main_names = list(dict.fromkeys(_display_ingredient(item) for item in _filter_main_ingredients(ingredients)))[:4]
    main_canon = [canonical_ingredient(_strip_qty_prefix(name)) or name for name in main_names]
    cooking_style = _infer_cooking_style(cooking_time=cooking_time, steps=steps, tags=tags)
    pattern = _detect_dish_pattern(main_canon)

    if pattern == "tomatoEgg":
        return _build_tomato_egg_title(main_canon, cooking_style, steps)
    if pattern == "pasta":
        return _build_pasta_title(main_canon, cooking_style)
    if pattern == "rice":
        return "אורז עם עוף" if "chicken" in main_canon else "אורז מוקפץ"
    if pattern == "omelette":
        return _build_omelette_title(main_canon)
    if pattern == "tunaSalad":
        return "סלט טונה וביצים"
    if pattern == "curry" and _ingredients_support_curry_title(main_canon):
        return "קארי עדשים" if "lentils" in main_canon else "קארי ביתי"
    if pattern == "stirFry":
        return "מוקפץ ירקות"
    if pattern == "chicken":
        return "עוף בתנור"
    if pattern == "meat":
        return "תבשיל בשר"
    if pattern == "salad":
        return "סלט ירקות טרי"

    return _build_generic_dish_title(main_canon, cooking_style, steps)


def is_mood_based_title(title: str) -> bool:
    text = (title or "").strip()
    if not text:
        return True
    if any(pattern.search(text) for pattern in MOOD_TITLE_PATTERNS):
        return True
    lower = text.lower()
    return any(word.lower() in lower for word in FORBIDDEN_TITLE_WORDS)


def title_describes_dish(title: str, ingredients: list[str]) -> bool:
    text = (title or "").strip()
    if not text or is_mood_based_title(text) or is_literal_ingredient_title(title, ingredients):
        return False

    mains = _filter_main_ingredients(ingredients)
    main_canon = [canonical_ingredient(item) or item for item in mains]

    if re.search(r"קארי|curry", text, re.IGNORECASE) and not _ingredients_support_curry_title(main_canon):
        return False

    if _is_generic_dish_title(text, ingredients):
        return False

    if _has_dish_name_prefix(text):
        return True

    if any(ingredient_appears_in_text(item, text) for item in mains):
        return True

    return False


def ensure_descriptive_dish_title(
    title: str,
    ingredients: list[str],
    *,
    cooking_time: int | None = None,
    steps: list[str] | None = None,
    style: str | None = None,
    tags: list[str] | None = None,
) -> str:
    if (
        is_mood_based_title(title)
        or is_literal_ingredient_title(title, ingredients)
        or _is_generic_dish_title(title, ingredients)
        or not _title_matches_ingredients(title, ingredients)
        or not title_describes_dish(title, ingredients)
    ):
        return build_descriptive_dish_title(
            ingredients,
            cooking_time=cooking_time,
            steps=steps,
            style=style,
            tags=tags,
        )
    return (title or "").strip()


def apply_descriptive_dish_title(recipe: dict, *, cooking_time: int | None = None, style: str | None = None) -> dict:
    name = ensure_descriptive_dish_title(
        recipe.get("name", ""),
        recipe.get("ingredients") or [],
        cooking_time=cooking_time,
        steps=recipe.get("steps") or [],
        style=style,
        tags=recipe.get("tags") or [],
    )
    return {**recipe, "name": name}


def validate_dish_title(title: str, ingredients: list[str]) -> dict:
    descriptive = title_describes_dish(title, ingredients)
    return {
        "ok": descriptive,
        "is_mood_based": is_mood_based_title(title),
        "is_literal": is_literal_ingredient_title(title, ingredients),
        "describes_dish": descriptive,
    }
