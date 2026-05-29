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

COOKING_STYLE_WORDS = {"מהיר", "מהירה", "מוקפץ", "בתנור", "בסיר", "ברוטב"}

MOOD_TITLE_PATTERNS = [
    re.compile(r"^ארוח(?:ת|ה)\s+"),
    re.compile(r"ארוח(?:ת|ה)?\s+(?:נרות|נוחות|רגוע(?:ה|ים)?|שמ(?:ה|ים)|חמ(?:ה|ים)|מנח(?:ם|מת)|רומנטית?)"),
    re.compile(r"(?:ערב|בוקר|צהריים)\s+(?:רגוע|רומנטי|שמח|נעים|חמים|מיוחד)"),
    re.compile(r"(?:ווייב|וייב|וייב|vibe)", re.IGNORECASE),
    re.compile(
        r"[\s–—-]+(?:חמים|חם|נעים|נעימ(?:ה|ים)?|רגוע(?:ה|ים)?|מנח(?:ם|מת)|אנרגטי(?:ם)?|"
        r"שמ(?:ח(?:ה|ים)?)?|עליז(?:ה|ים)?|הרפתקני(?:ם)?|comfort|cozy)\s*$",
        re.IGNORECASE,
    ),
    re.compile(r"^מנה\s+(?:נעימ(?:ה|ים)?|אנרגטית|רגועה|שמחה|מנחמת|מרגיעה|מיוחדת|מושלמת|חמ(?:ה|ימה))"),
    re.compile(r"^(?:cozy|comfort|energetic|adventurous|relaxed|happy|romantic|mood)\b", re.IGNORECASE),
    re.compile(r"(?:נוחות|רומנטי|נעים(?:ה|ים)?|אנרג(?:יה|ט(?:י|ית))|מצב\s+רוח|good\s+vibes|atmosphere)", re.IGNORECASE),
    re.compile(r"^מנה\s+ע(?:ם|ל)\s+(?:מרכיבים|הכל)$"),
    re.compile(r"^(?:ערב|בוקר)\s+"),
]

FORBIDDEN_TITLE_WORDS = [
    "נרות",
    "נוחות",
    "רומנטי",
    "נעים",
    "נעימה",
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
    "תבשיל",
    "עוף",
    "בשר",
    "טונה",
    "פנקייק",
    "קוביות",
]

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
        canon = canonical_ingredient(item)
        if canon and canon in STAPLE_CANONICAL:
            continue
        result.append(item)
    return result


def _display_ingredient(item: str) -> str:
    if re.search(r"[\u0590-\u05FF]", item) and not re.search(r"[a-z]", item, re.IGNORECASE):
        return item.strip()
    canon = canonical_ingredient(item)
    if canon and canon in HEBREW_LABELS:
        return HEBREW_LABELS[canon]
    return item.strip()


def _join_hebrew_list(items: list[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} ו{items[1]}"
    return f"{', '.join(items[:-1])} ו{items[-1]}"


def _ingredients_support_curry_title(main_canon: list[str]) -> bool:
    return any(item in {"curry", "lentils", "coconut milk", "coconut"} for item in main_canon)


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
    if "quick" in tags or (cooking_time and cooking_time <= 25):
        return "quick"
    return None


def _detect_dish_pattern(main_canon: list[str]) -> str:
    canon = set(main_canon)
    if "tomato" in canon and ("egg" in canon or "eggs" in canon):
        if {"onion", "pepper", "garlic"} & canon:
            return "shakshuka"
        return "tomatoOmelette"
    if "pasta" in canon:
        return "pasta"
    if "rice" in canon:
        return "rice"
    if ("egg" in canon or "eggs" in canon) and len(main_canon) >= 2:
        return "omelette"
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
    if {"cucumber", "tomato", "avocado", "chickpeas"} & canon:
        return "salad"
    return "generic"


def _build_pasta_title(main_names: list[str], main_canon: list[str], cooking_style: str | None) -> str:
    has_cream = "cream" in main_canon
    has_mushroom = "mushroom" in main_canon
    extras = [name for name in main_names if not re.search(r"פסטה|שמנת|פטריות", name)]

    if has_cream and has_mushroom:
        return "פסטה ברוטב שמנת ופטריות"
    if has_cream:
        return f"פסטה ברוטב שמנת ו{_join_hebrew_list(extras)}" if extras else "פסטה ברוטב שמנת"
    if len(main_names) > 1:
        return f"פסטה עם {_join_hebrew_list(main_names[1:])}"
    return "פסטה מהירה" if cooking_style == "quick" else f"פסטה עם {main_names[0]}"


def _build_omelette_title(main_names: list[str], main_canon: list[str]) -> str:
    extras = [name for name in main_names if "ביצ" not in name]
    if "tomato" in main_canon:
        return "חביתת עגבניות"
    if len(extras) == 1:
        return f"חביתת {extras[0]}"
    if len(extras) > 1:
        return f"חביתה עם {_join_hebrew_list(extras)}"
    return "חביתה"


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
    main_names = list(dict.fromkeys(_display_ingredient(item) for item in _filter_main_ingredients(ingredients)))[:3]
    main_canon = [canonical_ingredient(name) or name for name in main_names]
    cooking_style = _infer_cooking_style(cooking_time=cooking_time, steps=steps, tags=tags)

    if not main_names:
        return "תבשיל מהיר" if cooking_style == "quick" else "תבשיל ביתי"

    first, *rest = main_names
    second = rest[0] if rest else None
    pattern = _detect_dish_pattern(main_canon)

    if pattern == "shakshuka":
        return "שקשוקה מהירה" if cooking_style == "quick" else "שקשוקה"
    if pattern == "tomatoOmelette":
        return "חביתת עגבניות"
    if pattern == "pasta":
        return _build_pasta_title(main_names, main_canon, cooking_style)
    if pattern == "rice":
        return f"אורז עם {_join_hebrew_list(main_names[1:])}" if len(main_names) > 1 else f"אורז עם {first}"
    if pattern == "omelette":
        return _build_omelette_title(main_names, main_canon)
    if pattern == "tunaSalad":
        return "סלט טונה וביצים"
    if pattern == "curry" and _ingredients_support_curry_title(main_canon):
        return f"קארי {_join_hebrew_list(main_names)}"
    if pattern == "stirFry":
        return f"מוקפץ {_join_hebrew_list(main_names)}"
    if pattern == "chicken":
        return f"עוף עם {_join_hebrew_list(main_names[1:])}" if len(main_names) > 1 else "עוף בגריל"
    if pattern == "meat":
        return f"{first} עם {_join_hebrew_list(main_names[1:])}" if len(main_names) > 1 else f"{first} בגריל"
    if pattern == "salad":
        return f"סלט {_join_hebrew_list(main_names)}"

    if len(main_names) == 1:
        return f"{first} מהיר" if cooking_style == "quick" else first
    if cooking_style == "stew":
        return f"תבשיל {_join_hebrew_list(main_names)}"
    if cooking_style == "quick":
        return f"{_join_hebrew_list(main_names)} — מהיר"
    return f"{first} עם {second}"


def is_mood_based_title(title: str) -> bool:
    text = (title or "").strip()
    if not text:
        return True
    if any(pattern.search(text) for pattern in MOOD_TITLE_PATTERNS):
        return True
    lower = text.lower()
    return any(
        word.lower() in lower
        for word in FORBIDDEN_TITLE_WORDS
        if word not in COOKING_STYLE_WORDS
    )


def title_describes_dish(title: str, ingredients: list[str]) -> bool:
    text = (title or "").strip()
    if not text or is_mood_based_title(text):
        return False

    mains = _filter_main_ingredients(ingredients)
    main_canon = [canonical_ingredient(item) or item for item in mains]

    if re.search(r"קארי|curry", text, re.IGNORECASE) and not _ingredients_support_curry_title(main_canon):
        return False

    if any(ingredient_appears_in_text(item, text) for item in mains):
        return True

    if not mains:
        return any(text.startswith(prefix) for prefix in KNOWN_DISH_PREFIXES)

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
    if is_mood_based_title(title):
        return build_descriptive_dish_title(
            ingredients,
            cooking_time=cooking_time,
            steps=steps,
            style=style,
            tags=tags,
        )
    if title_describes_dish(title, ingredients):
        return (title or "").strip()
    return build_descriptive_dish_title(
        ingredients,
        cooking_time=cooking_time,
        steps=steps,
        style=style,
        tags=tags,
    )


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
        "describes_dish": descriptive,
    }
