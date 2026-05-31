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

FORBIDDEN_GENERIC_TITLES = {
    "תבשיל ביתי",
    "קינוח גבינה",
    "עוגה ביתית",
    "עוגת שוקולד ביתית",
    "עוגיות מהירות",
    "מאפינס וניל",
    "בראוניז מהיר",
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
    "homemade beef patties",
    "cheesecake dessert",
    "homemade chocolate cake",
    "quick cookies",
    "vanilla muffins",
    "quick brownies",
    "creamy home-cooked dish",
    "quick vegetable stir-fry",
}


def _is_forbidden_generic_title(title: str) -> bool:
    text = (title or "").strip()
    if not text:
        return True
    if text in FORBIDDEN_GENERIC_TITLES:
        return True
    return text.lower() in FORBIDDEN_GENERIC_TITLES


def _title_reflects_ingredients(title: str, ingredients: list[str]) -> bool:
    if _is_forbidden_generic_title(title):
        return False
    mains = _filter_main_ingredients(ingredients)
    if not mains:
        return True
    return any(ingredient_appears_in_text(item, title) for item in mains)


def _join_hebrew_names(names: list[str]) -> str:
    unique = list(dict.fromkeys(name for name in names if name))
    if not unique:
        return ""
    if len(unique) == 1:
        return unique[0]
    if len(unique) == 2:
        return f"{unique[0]} עם {unique[1]}"
    return f"{', '.join(unique[:-1])} ו{unique[-1]}"


def _join_english_names(names: list[str]) -> str:
    unique = list(dict.fromkeys(name for name in names if name))
    if not unique:
        return ""
    if len(unique) == 1:
        return unique[0]
    if len(unique) == 2:
        return f"{unique[0]} with {unique[1]}"
    return f"{', '.join(unique[:-1])} and {unique[-1]}"


def _infer_hebrew_dessert_prefix(main_canon: list[str]) -> str:
    canon = set(main_canon)
    if {"chocolate", "flour", "sugar"} & canon:
        return "עוגת"
    if {"blueberries", "honey"} & canon:
        return "עוגת"
    return "קינוח"


def _infer_english_dessert_suffix(main_canon: list[str]) -> str:
    canon = set(main_canon)
    if "chocolate" in canon and ({"flour", "sugar"} & canon):
        return "Cake"
    if "chocolate" in canon:
        return "Brownies"
    if {"flour", "sugar"} <= canon or ("flour" in canon and "sugar" in canon):
        return "Cookies"
    return "Dessert"


def build_title_from_ingredients(
    ingredients: list[str],
    *,
    language: str = "he",
    recipe_type: str = "meal",
) -> str:
    """Build a dish title — real dish names only, never ingredient lists."""
    if recipe_type == "dessert":
        from dessert_dish_title import build_dessert_dish_title

        return build_dessert_dish_title(ingredients, language=language)["name"]

    main_names = list(
        dict.fromkeys(_display_ingredient(item) for item in _filter_main_ingredients(ingredients))
    )[:2]
    main_names = [name for name in main_names if name]
    main_canon = _main_canon(ingredients)

    if not main_names:
        return "Homemade Dish" if language == "en" else "מנה ביתית מהמטבח"
    if "chicken" in main_canon:
        return "Homemade Chicken Dish" if language == "en" else "עוף ביתי"
    if {"beef", "steak"} & set(main_canon):
        return "Homemade Beef Dish" if language == "en" else "בשר בקר ביתי"
    if "pasta" in main_canon:
        return "Creamy Pasta" if language == "en" else "פסטה ביתית"
    if "rice" in main_canon:
        return "Homemade Rice Dish" if language == "en" else "אורז ביתי"

    first = main_names[0]
    return f"{first} Skillet" if language == "en" else f"{first} במחבת"


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
    if _is_forbidden_generic_title(text):
        return True
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


def _build_pasta_title(
    main_canon: list[str],
    cooking_style: str | None,
    ingredients: list[str],
    *,
    language: str = "he",
) -> str:
    has_cream = "cream" in main_canon
    has_mushroom = "mushroom" in main_canon
    if has_cream and has_mushroom:
        return "פסטה ברוטב שמנת ופטריות"
    if has_cream:
        return "פסטה ברוטב שמנת"
    return build_title_from_ingredients(ingredients, language=language, recipe_type="meal")


def _build_omelette_title(
    main_canon: list[str],
    ingredients: list[str],
    *,
    language: str = "he",
) -> str:
    if "tomato" in main_canon:
        return "חביתת עגבניות"
    if "spinach" in main_canon:
        return "חביתת תרד"
    if "mushroom" in main_canon:
        return "חביתת פטריות"
    if "cheese" in main_canon:
        return "חביתת גבינה"
    return build_title_from_ingredients(ingredients, language=language, recipe_type="meal")


def _build_generic_dish_title(
    main_canon: list[str],
    cooking_style: str | None,
    steps: list[str],
    ingredients: list[str],
    *,
    language: str = "he",
) -> str:
    if "tomato" in main_canon and ("egg" in main_canon or "eggs" in main_canon):
        return _build_tomato_egg_title(main_canon, cooking_style, steps)
    if "pasta" in main_canon:
        return _build_pasta_title(main_canon, cooking_style, ingredients, language=language)
    if "egg" in main_canon or "eggs" in main_canon:
        return _build_omelette_title(main_canon, ingredients, language=language)
    return build_title_from_ingredients(ingredients, language=language, recipe_type="meal")


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
    from dessert_dish_title import is_ingredient_list_title

    if is_ingredient_list_title(title, ingredients):
        return True

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
    language: str = "he",
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
        return _build_pasta_title(main_canon, cooking_style, ingredients, language=language)
    if pattern == "omelette":
        return _build_omelette_title(main_canon, ingredients, language=language)
    if pattern == "tunaSalad":
        return "סלט טונה וביצים"
    if pattern == "curry" and _ingredients_support_curry_title(main_canon):
        if "lentils" in main_canon:
            return "קארי עדשים"
        return build_title_from_ingredients(ingredients, language=language, recipe_type="meal")

    return _build_generic_dish_title(
        main_canon,
        cooking_style,
        steps,
        ingredients,
        language=language,
    )


CATEGORY_GUARANTEED_DESSERT_TITLES = {
    "dairy": {"he": "קינוח גבינה", "en": "Cheesecake Dessert"},
    "parve": {"he": "עוגיות מהירות", "en": "Quick Chocolate Cookies"},
}

DESSERT_FALLBACK_TITLES = (
    "עוגת שוקולד ביתית",
    "עוגיות מהירות",
    "מאפינס וניל",
    "קינוח גבינה",
    "בראוניז מהיר",
)

DESSERT_FALLBACK_TITLES_EN = (
    "Homemade Chocolate Cake",
    "Quick Cookies",
    "Vanilla Muffins",
    "Cheesecake Dessert",
    "Quick Brownies",
)


def build_guaranteed_dessert_title(
    ingredients: list[str],
    *,
    category: str = "dairy",
    ingredient_phrase: str | None = None,
    language: str = "he",
) -> str:
    """Return a dessert title as a real dish name."""
    from dessert_dish_title import build_dessert_dish_title

    _ = category, ingredient_phrase
    return build_dessert_dish_title(ingredients, language=language)["name"]


def is_mood_based_title(title: str) -> bool:
    text = (title or "").strip()
    if not text:
        return True
    if any(pattern.search(text) for pattern in MOOD_TITLE_PATTERNS):
        return True
    lower = text.lower()
    return any(word.lower() in lower for word in FORBIDDEN_TITLE_WORDS)


def title_describes_dish(title: str, ingredients: list[str]) -> bool:
    from dessert_dish_title import count_title_words, is_ingredient_list_title

    text = (title or "").strip()
    if not text or is_mood_based_title(text) or _is_forbidden_generic_title(text):
        return False
    if count_title_words(text) > 4:
        return False
    if is_ingredient_list_title(text, ingredients):
        return False

    if _title_reflects_ingredients(text, ingredients):
        return True

    if is_literal_ingredient_title(title, ingredients):
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
    language: str = "he",
) -> str:
    if (
        is_mood_based_title(title)
        or _is_forbidden_generic_title(title)
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
            language=language,
        )
    return (title or "").strip()


def apply_descriptive_dish_title(
    recipe: dict,
    *,
    cooking_time: int | None = None,
    style: str | None = None,
    recipe_type: str | None = None,
    category: str | None = None,
    language: str | None = None,
) -> dict:
    lang = language or "he"

    if recipe_type == "dessert":
        from recipe_quality import is_invalid_recipe_selection, validate_recipe_type

        name = (recipe.get("name") or "").strip()
        if is_invalid_recipe_selection("dessert", category or "dairy"):
            return {
                **recipe,
                "name": build_title_from_ingredients(
                    recipe.get("ingredients") or [],
                    language=lang,
                    recipe_type="meal",
                ),
            }

        probe = {**recipe, "name": name}
        from dessert_dish_title import is_ingredient_list_title

        if (
            validate_recipe_type("dessert", probe)
            and _title_reflects_ingredients(name, recipe.get("ingredients") or [])
            and not is_ingredient_list_title(name, recipe.get("ingredients") or [], lang)
        ):
            return {**recipe, "name": name}

        return {
            **recipe,
            "name": build_guaranteed_dessert_title(
                recipe.get("ingredients") or [],
                category=category or "dairy",
                language=lang,
            ),
        }

    name = ensure_descriptive_dish_title(
        recipe.get("name", ""),
        recipe.get("ingredients") or [],
        cooking_time=cooking_time,
        steps=recipe.get("steps") or [],
        style=style,
        tags=recipe.get("tags") or [],
        language=lang,
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
