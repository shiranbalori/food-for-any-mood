"""Match user ingredients to familiar real-world dish patterns."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from ingredient_relevance import canonical_ingredient, parse_user_ingredients

RecipeType = str
Category = str

REAL_WORLD_GROUNDING_RULES_HE = """
בסיס מתכון (חובה):
- בחר/י סוג מנה מוכרת מהעולם האמיתי שמתאימה למרכיבים — לא המצאה אקראית.
- התאם/י את המנה למרכיבים, לקטגוריה, לזמן, למצב רוח, לסוג הארוחה ולגלוטן.
- כתוב/י ניסוח מקורי — אל תעתיק/י מתכונים מאתרים מילה במילה.
- Base the recipe on familiar real-world dishes and cooking patterns. Do not invent unrealistic recipes.
- אם אין התאמה מושלמת — בחר/י את סגנון הבישול הקרוב ביותר (תבשיל, אפייה, סלט, מוקפץ, חביתה) והתאם/י בבירור.
- אסור שילובים מוזרים שלא קיימים במטבח הבית (למשל טונה עם קינמון לקינוח).
"""

REAL_WORLD_GROUNDING_RULES_EN = """
REAL-WORLD DISH GROUNDING (mandatory):
- Identify a familiar real-world dish type that fits the user's ingredients and constraints.
- Adapt it to their ingredients, category, time, mood, meal type, and gluten-free choice.
- Write original wording — do NOT copy full recipes from websites word-for-word.
- Base the recipe on familiar real-world dishes and cooking patterns. Do not invent unrealistic recipes.
- If there is no perfect match, choose the closest real cooking style (stew, bake, salad, stir-fry, omelette) and adapt clearly.
- Do NOT invent strange combinations that no one would actually cook at home.
"""

KNOWN_DISH_STYLE_MARKERS_HE = (
    "שקשוק",
    "חבית",
    "פסטה",
    "סלט",
    "מרק",
    "תבשיל",
    "מוקפץ",
    "אפוי",
    "בתנור",
    "במחבת",
    "בשמנת",
    "גרatin",
    "גרטן",
    "קציצ",
    "עוף",
    "אורז",
    "טונה",
    "עוג",
    "עוגיות",
    "קינוח",
    "מוס",
    "פנקייק",
    "פודינג",
    "בראונ",
    "מאפ",
    "קארי",
    "ריזוטו",
    "לזנ",
)

KNOWN_DISH_STYLE_MARKERS_EN = (
    "shakshuka",
    "omelette",
    "omelet",
    "pasta",
    "salad",
    "soup",
    "stew",
    "stir-fry",
    "stir fry",
    "baked",
    "roast",
    "skillet",
    "creamy",
    "gratin",
    "patty",
    "patties",
    "rice",
    "chicken",
    "tuna",
    "cake",
    "cookie",
    "cookies",
    "brownie",
    "muffin",
    "pudding",
    "curry",
    "risotto",
    "lasagna",
    "frittata",
)

GENERIC_UNREALISTIC_TITLE_PATTERNS = (
    r"מנה\s+(?:מהירה|ביתית|מיוחדת|מושלמת|חמה|נעימה)",
    r"תבשיל\s+ביתי",
    r"קסם\s+במחבת",
    r"מהמטבח",
    r"quick\s+dish",
    r"homemade\s+(?:stew|dish|recipe)",
    r"comfort\s+food\s+bowl",
    r"ingredient\s+mix",
    r"mixed\s+ingredients",
    r"creative\s+combo",
    r"surprise\s+dish",
    r"מנה\s+עם\s+מרכיבים",
)


@dataclass(frozen=True)
class DishPattern:
    id: str
    required: frozenset[str]
    any_of: tuple[frozenset[str], ...] = ()
    exclude: frozenset[str] = frozenset()
    recipe_type: str = "meal"
    categories: frozenset[str] | None = None
    name_he: str = ""
    name_en: str = ""
    alt_names_he: tuple[str, ...] = ()
    alt_names_en: tuple[str, ...] = ()
    title_keywords_he: tuple[str, ...] = ()
    title_keywords_en: tuple[str, ...] = ()
    method_hint_he: str = ""
    method_hint_en: str = ""


@dataclass
class MatchedPattern:
    pattern: DishPattern
    score: float
    matched_required: list[str] = field(default_factory=list)


DISH_PATTERNS: tuple[DishPattern, ...] = (
    DishPattern(
        id="creamy_mushroom_pasta",
        required=frozenset({"pasta", "cream", "mushroom"}),
        recipe_type="meal",
        categories=frozenset({"dairy"}),
        name_he="פסטה בשמנת ופטריות",
        name_en="Creamy Mushroom Pasta",
        alt_names_he=("פסטה פטריות", "רוטב שמנת ופטריות"),
        alt_names_en=("Mushroom Cream Pasta", "Cream Sauce Pasta with Mushrooms"),
        title_keywords_he=("פסטה", "פטריות", "שמנת"),
        title_keywords_en=("pasta", "mushroom", "cream"),
        method_hint_he="מטגנים פטריות בשמנת ומערבבים עם פסטה מבושלת.",
        method_hint_en="Sauté mushrooms in cream sauce and toss with cooked pasta.",
    ),
    DishPattern(
        id="shakshuka",
        required=frozenset({"egg", "tomato"}),
        any_of=(frozenset({"onion", "garlic"}),),
        recipe_type="meal",
        categories=frozenset({"parve", "meat"}),
        name_he="שקשוקה",
        name_en="Shakshuka",
        alt_names_he=("ביצים ברוטב עגבניות", "חביתת עגבניות"),
        alt_names_en=("Eggs in Tomato Sauce", "Tomato Shakshuka"),
        title_keywords_he=("שקשוק", "ביצ", "עגבנ"),
        title_keywords_en=("shakshuka", "egg", "tomato"),
        method_hint_he="מבשלים רוטב עגבניות ושוברים ביצים לתוכו עד שהלבן מתקשה.",
        method_hint_en="Simmer tomato sauce and poach eggs in it until whites set.",
    ),
    DishPattern(
        id="chicken_rice_bake",
        required=frozenset({"rice", "chicken"}),
        recipe_type="meal",
        categories=frozenset({"meat"}),
        name_he="תבשיל אורז ועוף",
        name_en="Chicken and Rice Bake",
        alt_names_he=("אורז עם עוף", "עוף ואורז בתנור"),
        alt_names_en=("Chicken Rice Casserole", "Baked Chicken with Rice"),
        title_keywords_he=("עוף", "אורז"),
        title_keywords_en=("chicken", "rice"),
        method_hint_he="מטגנים עוף, מוסיפים אורז ונוזלים ומבשלים/אופים יחד.",
        method_hint_en="Sear chicken, add rice and liquid, then bake or simmer together.",
    ),
    DishPattern(
        id="potato_gratin",
        required=frozenset({"potato", "cheese"}),
        recipe_type="meal",
        categories=frozenset({"dairy"}),
        name_he="תבשיל תפוחי אדמה וגבינה",
        name_en="Potato Gratin",
        alt_names_he=("תפוחי אדמה עם גבינה", "תבשיל תפוחי אדמה וגבינה"),
        alt_names_en=("Cheesy Potato Bake", "Potato Cheese Gratin"),
        title_keywords_he=("תפוח", "גבינ", "גרatin", "גרטן", "תבשיל"),
        title_keywords_en=("potato", "cheese", "gratin"),
        method_hint_he="שכבות תפוחי אדמה עם גבינה ואפייה עד רכות וזהוב.",
        method_hint_en="Layer sliced potatoes with cheese and bake until tender and golden.",
    ),
    DishPattern(
        id="tuna_salad",
        required=frozenset({"tuna", "egg"}),
        recipe_type="meal",
        categories=frozenset({"meat", "parve"}),
        name_he="סלט טונה וביצים",
        name_en="Tuna and Egg Salad",
        alt_names_he=("סלט טונה", "טונה עם ביצים"),
        alt_names_en=("Tuna Salad", "Tuna Egg Salad"),
        title_keywords_he=("טונה", "סלט", "ביצ"),
        title_keywords_en=("tuna", "salad", "egg"),
        method_hint_he="מערבבים טונה, ביצים וירקות לסלט או קציצות.",
        method_hint_en="Combine tuna, eggs, and vegetables into a salad or patties.",
    ),
    DishPattern(
        id="tuna_patties",
        required=frozenset({"tuna"}),
        any_of=(frozenset({"egg", "potato", "flour"}),),
        recipe_type="meal",
        categories=frozenset({"meat", "parve"}),
        name_he="קציצות טונה",
        name_en="Tuna Patties",
        alt_names_he=("לביבות טונה", "טונה מטוגנת"),
        alt_names_en=("Pan-Fried Tuna Cakes", "Crispy Tuna Patties"),
        title_keywords_he=("טונה", "קציצ", "לביב"),
        title_keywords_en=("tuna", "patty", "patties", "cake"),
        method_hint_he="מערבבים טונה עם מחייה, יוצרים קציצות ומטגנים.",
        method_hint_en="Bind tuna with egg or potato, shape patties, and pan-fry.",
    ),
    DishPattern(
        id="butter_cinnamon_cookies",
        required=frozenset({"flour", "sugar", "cinnamon", "butter"}),
        recipe_type="dessert",
        name_he="עוגיות חמאה וקינמון",
        name_en="Butter Cinnamon Cookies",
        alt_names_he=("עוגת קינמון", "עוגת קפה וקינמון", "בצק פריך עם קינמון", "עוגיות קינמון"),
        alt_names_en=("Cinnamon Cake", "Cinnamon Coffee Cake", "Crisp Cinnamon Dough", "Cinnamon Cookies"),
        title_keywords_he=("עוג", "קינמון", "חמאה", "בצק"),
        title_keywords_en=("cookie", "cake", "cinnamon", "butter", "dough"),
        method_hint_he="מערבבים בצק חמאה עם קמח, סוכר וקינמון — עוגיות או עוגה קטנה.",
        method_hint_en="Mix a butter dough with flour, sugar, and cinnamon — cookies or a small cake.",
    ),
    DishPattern(
        id="cinnamon_cookies",
        required=frozenset({"flour", "sugar", "cinnamon"}),
        any_of=(frozenset({"butter", "oil"}),),
        recipe_type="dessert",
        name_he="עוגיות קינמון",
        name_en="Cinnamon Cookies",
        alt_names_he=("עוגיות קינמון וסוכר", "ביסקוויט קינמון", "עוגיות חמאה וקינמון"),
        alt_names_en=("Cinnamon Sugar Cookies", "Snickerdoodle-Style Cookies", "Butter Cinnamon Cookies"),
        title_keywords_he=("עוג", "קינמון"),
        title_keywords_en=("cookie", "cinnamon"),
        method_hint_he="מערבבים בצק, יוצרים עוגיות ואופים עד פריך.",
        method_hint_en="Mix dough, shape cookies, and bake until crisp.",
    ),
    DishPattern(
        id="cinnamon_coffee_cake",
        required=frozenset({"flour", "sugar", "cinnamon"}),
        any_of=(frozenset({"butter", "oil", "milk", "cream"}),),
        recipe_type="dessert",
        name_he="עוגת קינמון",
        name_en="Cinnamon Coffee Cake",
        alt_names_he=("עוגת קפה וקינמון", "עוגה עם קינמון", "עוגת קינמון בחושה"),
        alt_names_en=("Cinnamon Cake", "Butter Cinnamon Cake", "Moist Cinnamon Cake"),
        title_keywords_he=("עוג", "קינמון"),
        title_keywords_en=("cake", "cinnamon"),
        method_hint_he="מכינים בצק עם קינמון וסוכר ואופים לעוגה רכה.",
        method_hint_en="Make a batter with cinnamon and sugar and bake into a soft cake.",
    ),
    DishPattern(
        id="pasta_tomato",
        required=frozenset({"pasta", "tomato"}),
        exclude=frozenset({"cream"}),
        recipe_type="meal",
        name_he="פסטה ברוטב עגבניות",
        name_en="Tomato Pasta",
        alt_names_he=("פסטה עם עגבניות", "פסטה ברוטב אדום"),
        alt_names_en=("Pasta Pomodoro", "Tomato Sauce Pasta"),
        title_keywords_he=("פסטה", "עגבנ"),
        title_keywords_en=("pasta", "tomato"),
        method_hint_he="מבשלים רוטב עגבניות ומערבבים עם פסטה.",
        method_hint_en="Simmer tomato sauce and toss with cooked pasta.",
    ),
    DishPattern(
        id="chicken_potato",
        required=frozenset({"chicken", "potato"}),
        recipe_type="meal",
        categories=frozenset({"meat"}),
        name_he="עוף ותפוחי אדמה בתנור",
        name_en="Roasted Chicken and Potatoes",
        alt_names_he=("תבשיל עוף ותפוחי אדמה",),
        alt_names_en=("Chicken Potato Bake",),
        title_keywords_he=("עוף", "תפוח"),
        title_keywords_en=("chicken", "potato"),
        method_hint_he="אופים עוף ותפוחי אדמה יחד בתנור עם תבלינים.",
        method_hint_en="Roast chicken and potatoes together with seasoning.",
    ),
    DishPattern(
        id="vegetable_omelette",
        required=frozenset({"egg"}),
        any_of=(frozenset({"tomato", "onion", "mushroom", "pepper", "spinach", "broccoli"}),),
        recipe_type="meal",
        name_he="חביתת ירקות",
        name_en="Vegetable Omelette",
        alt_names_he=("חביתה", "חביתה עם ירקות"),
        alt_names_en=("Veggie Omelette", "Egg and Vegetable Skillet"),
        title_keywords_he=("חבית", "ביצ"),
        title_keywords_en=("omelette", "omelet", "frittata", "egg"),
        method_hint_he="מקציפים ביצים, מוסיפים ירקות ומטגנים לחביתה.",
        method_hint_en="Beat eggs, add vegetables, and cook as an omelette.",
    ),
    DishPattern(
        id="creamy_cinnamon_dessert",
        required=frozenset({"cinnamon"}),
        any_of=(frozenset({"cream", "milk", "sugar"}),),
        recipe_type="dessert",
        name_he="קרם קינמון",
        name_en="Warm Cinnamon Cream",
        alt_names_he=("פודינג קינמון", "קינוח קינמון"),
        alt_names_en=("Cinnamon Pudding", "Cinnamon Dessert Cream"),
        title_keywords_he=("קינמון", "קרם", "פודינג"),
        title_keywords_en=("cinnamon", "cream", "pudding"),
        method_hint_he="מחממים שמנת/חלב עם סוכר וקינמון לקינוח רך.",
        method_hint_en="Warm cream or milk with sugar and cinnamon for a soft dessert.",
    ),
)


def canonicalize_ingredients(user_ingredients: list[str]) -> set[str]:
    canons: set[str] = set()
    for item in user_ingredients:
        canon = canonical_ingredient(item)
        if canon:
            canons.add(canon)
        elif item.strip():
            canons.add(item.strip().lower())
    return canons


def _pattern_matches(
    pattern: DishPattern,
    canons: set[str],
    *,
    recipe_type: str,
    category: str,
) -> MatchedPattern | None:
    if pattern.recipe_type != recipe_type:
        return None
    if recipe_type == "dessert" and pattern.recipe_type == "meal":
        return None
    if pattern.categories and category != "any" and category not in pattern.categories:
        return None
    if pattern.exclude & canons:
        return None
    if not pattern.required <= canons:
        return None

    score = float(len(pattern.required)) * 10.0
    matched_required = sorted(pattern.required)

    for group in pattern.any_of:
        if group & canons:
            score += 5.0
        else:
            score -= 3.0

    extra = canons - pattern.required - pattern.exclude
    if len(extra) <= 2:
        score += 2.0
    elif len(extra) > 4:
        score -= 2.0

    return MatchedPattern(pattern=pattern, score=score, matched_required=matched_required)


def match_dish_patterns(
    user_ingredients: list[str],
    *,
    recipe_type: str = "meal",
    category: str = "dairy",
) -> list[MatchedPattern]:
    if not user_ingredients:
        return []
    canons = canonicalize_ingredients(user_ingredients)
    matches: list[MatchedPattern] = []
    for pattern in DISH_PATTERNS:
        matched = _pattern_matches(pattern, canons, recipe_type=recipe_type, category=category)
        if matched:
            matches.append(matched)
    matches.sort(key=lambda item: item.score, reverse=True)
    return matches


def get_best_dish_pattern(
    user_ingredients: list[str],
    *,
    recipe_type: str = "meal",
    category: str = "dairy",
    min_score: float = 20.0,
) -> MatchedPattern | None:
    matches = match_dish_patterns(user_ingredients, recipe_type=recipe_type, category=category)
    if not matches or matches[0].score < min_score:
        return None
    return matches[0]


def get_dish_suggestions(
    user_ingredients: list[str],
    *,
    language: str = "he",
    recipe_type: str = "meal",
    category: str = "dairy",
    limit: int = 4,
) -> list[str]:
    matches = match_dish_patterns(user_ingredients, recipe_type=recipe_type, category=category)
    suggestions: list[str] = []
    for match in matches[:limit]:
        pattern = match.pattern
        name = pattern.name_he if language == "he" else pattern.name_en
        if name and name not in suggestions:
            suggestions.append(name)
        alts = pattern.alt_names_he if language == "he" else pattern.alt_names_en
        for alt in alts:
            if alt and alt not in suggestions:
                suggestions.append(alt)
            if len(suggestions) >= limit:
                return suggestions[:limit]
    return suggestions[:limit]


def build_real_world_prompt_section(
    user_ingredients: list[str],
    *,
    language: str = "he",
    recipe_type: str = "meal",
    category: str = "dairy",
) -> str:
    base = REAL_WORLD_GROUNDING_RULES_HE if language == "he" else REAL_WORLD_GROUNDING_RULES_EN
    matches = match_dish_patterns(user_ingredients, recipe_type=recipe_type, category=category)
    if not matches:
        return base

    if language == "he":
        lines = ["התאמות מנות מוכרות לפי המרכיבים (בחר/י אחת והתאם/י):"]
        for idx, match in enumerate(matches[:4], start=1):
            pattern = match.pattern
            lines.append(
                f"{idx}. {pattern.name_he} — {pattern.method_hint_he}"
            )
        lines.append(
            "שם המנה חייב להישמע כמו מנה מוכרת (למשל «פסטה בשמנת ופטריות», «שקשוקה») — לא שילוב מרכיבים אקראי."
        )
        return f"{base}\n" + "\n".join(lines)

    lines = ["Familiar dish styles that fit these ingredients (pick one and adapt):"]
    for idx, match in enumerate(matches[:4], start=1):
        pattern = match.pattern
        lines.append(f"{idx}. {pattern.name_en} — {pattern.method_hint_en}")
    lines.append(
        "The dish name must sound like a real known dish (e.g. «Creamy Mushroom Pasta», «Shakshuka») — not a random ingredient mashup."
    )
    return f"{base}\n" + "\n".join(lines)


def _normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def _is_generic_unrealistic_title(title: str) -> bool:
    text = _normalize_title(title)
    if not text:
        return True
    return any(re.search(pattern, text, re.I) for pattern in GENERIC_UNREALISTIC_TITLE_PATTERNS)


def _title_matches_pattern(title: str, pattern: DishPattern, *, language: str) -> bool:
    text = _normalize_title(title)
    keywords = pattern.title_keywords_he if language == "he" else pattern.title_keywords_en
    names = [pattern.name_he, pattern.name_en, *pattern.alt_names_he, *pattern.alt_names_en]
    if any(name and _normalize_title(name) in text or text in _normalize_title(name) for name in names):
        return True
    hits = sum(1 for keyword in keywords if keyword and keyword.lower() in text)
    return hits >= 1


def _title_has_dish_style_marker(title: str, *, language: str) -> bool:
    text = _normalize_title(title)
    markers = KNOWN_DISH_STYLE_MARKERS_HE if language == "he" else KNOWN_DISH_STYLE_MARKERS_EN
    return any(marker in text for marker in markers)


def validate_real_world_dish(
    recipe: dict,
    user_ingredients_raw: str | list[str],
    *,
    recipe_type: str = "meal",
    category: str = "dairy",
    language: str = "he",
) -> dict:
    user_ingredients = (
        user_ingredients_raw
        if isinstance(user_ingredients_raw, list)
        else parse_user_ingredients(user_ingredients_raw)
    )
    title = recipe.get("name", "")
    failures: list[str] = []

    if _is_generic_unrealistic_title(title):
        failures.append("generic_title")

    if not user_ingredients:
        return {"ok": not failures, "failures": failures, "best_pattern": None}

    matches = match_dish_patterns(user_ingredients, recipe_type=recipe_type, category=category)
    best = matches[0] if matches else None

    if best and best.score >= 25:
        if not _title_matches_pattern(title, best.pattern, language=language):
            if not _title_has_dish_style_marker(title, language=language):
                failures.append("not_real_dish")
    elif len(user_ingredients) >= 2:
        if not _title_has_dish_style_marker(title, language=language):
            failures.append("not_real_dish")

    return {"ok": not failures, "failures": failures, "best_pattern": best}


def build_pattern_steps(
    pattern: DishPattern,
    display_ingredients: list[str],
    *,
    language: str = "he",
    cooking_time: int = 30,
) -> list[str] | None:
    """Return pattern-specific steps when we have a strong template."""
    from user_ingredient_steps import build_steps_from_user_ingredients

    names = [item.strip() for item in display_ingredients if item and item.strip()]
    if not names:
        return None

    cook = min(cooking_time, max(12, cooking_time // 2))
    bake = min(cooking_time, max(25, int(cooking_time * 0.85)))

    templates: dict[str, dict[str, list[str]]] = {
        "creamy_mushroom_pasta": {
            "he": [
                "מרתיחים סיר עם מים מומלחים ומבשלים את הפסטה עד al dente.",
                "מחממים מחבת, מטגנים פטריות עד הזהבה.",
                f"מוסיפים שמנת ומבשלים {cook} דקות עד רוטב סמיך.",
                "מערבבים את הפסטה עם הרוטב ומגישים חם.",
            ],
            "en": [
                "Boil salted water and cook the pasta until al dente.",
                "Sauté mushrooms in a pan until golden.",
                f"Add cream and simmer for about {cook} minutes until thickened.",
                "Toss the pasta with the sauce and serve hot.",
            ],
        },
        "shakshuka": {
            "he": [
                "מחממים שמן במחבת ומטגנים בצל/שום אם יש.",
                "מוסיפים עגבניות ומבשלים רוטב עד סמיכות.",
                f"שוברים ביצים לתוך הרוטב ומכסים {cook} דקות.",
                "מגישים ישר מהמחבת.",
            ],
            "en": [
                "Warm oil in a skillet and sauté onion or garlic if using.",
                "Add tomatoes and simmer until the sauce thickens.",
                f"Crack eggs into the sauce, cover, and cook about {cook} minutes.",
                "Serve straight from the pan.",
            ],
        },
        "potato_gratin": {
            "he": [
                "קוצצים תפוחי אדמה לפרוסות דקות.",
                "מסדרים שכבות עם גבינה במנה.",
                f"אופים בתנור {bake} דקות עד רכות וזהוב.",
                "ממתינים דקה ומגישים.",
            ],
            "en": [
                "Slice the potatoes thinly.",
                "Layer potatoes with cheese in a baking dish.",
                f"Bake for about {bake} minutes until tender and golden.",
                "Rest briefly and serve.",
            ],
        },
        "cinnamon_cookies": {
            "he": [
                "מערבבים קמח, סוכר, קינמון וחמאה לבצק אחיד.",
                "יוצרים עוגיות קטנות על תבנית מרופדת.",
                f"אופים בתנור {bake} דקות עד פריך וזהוב.",
                "מצננים מעט ומגישים.",
            ],
            "en": [
                "Mix flour, sugar, cinnamon, and butter into a uniform dough.",
                "Shape small cookies on a lined tray.",
                f"Bake for about {bake} minutes until crisp and golden.",
                "Cool slightly and serve.",
            ],
        },
        "butter_cinnamon_cookies": {
            "he": [
                "מחממים תנור ל-180 מעלות לפני שאופים את העוגיות.",
                "מרככים חמאה ומערבבים עם סוכר וקינמון בקערה עד לתערובת אחידה.",
                "מוסיפים קמח ולשים עד לקבלת בצק רך.",
                f"יוצרים עוגיות, מסדרים על תבנית ואופים בתנור {bake} דקות עד פריך וזהוב.",
                "מקררים על רשת כמה דקות לפני ההגשה.",
                "מקררים לגמרי ומגישים עם תה או קפה.",
            ],
            "en": [
                "Preheat the oven to 180°C.",
                "Soften butter and mix with sugar and cinnamon until evenly combined.",
                "Add flour and mix until a soft dough forms.",
                f"Shape cookies, arrange on a tray, and bake for about {bake} minutes until crisp and golden.",
                "Cool on a rack before serving.",
                "Serve with tea or coffee.",
            ],
        },
        "cinnamon_coffee_cake": {
            "he": [
                "מערבבים קמח, סוכר, קינמון וחמאה לבצק.",
                "מעבירים לתבנית קטנה או יוצרים עוגיות גדולות.",
                f"אופים בתנור {bake} דקות עד ריח ונמוך זהוב.",
                "מצננים מעט ומגישים.",
            ],
            "en": [
                "Mix flour, sugar, cinnamon, and butter into a dough or batter.",
                "Transfer to a small pan or shape into large cookies.",
                f"Bake for about {bake} minutes until fragrant and lightly golden.",
                "Cool slightly and serve.",
            ],
        },
    }

    steps = templates.get(pattern.id, {}).get(language)
    if steps:
        return steps
    return build_steps_from_user_ingredients(
        names,
        recipe_type=pattern.recipe_type,
        language=language,
        cooking_time=cooking_time,
    )
