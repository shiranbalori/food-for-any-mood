"""Detect and enforce genuinely different recipes on regeneration."""

from __future__ import annotations

import re

COOKING_METHOD_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("baked", (r"קרם אפוי", r"\bbaked\b", r"בתנור", r"אופ", r"\boven\b")),
    ("chilled", (r"מוס", r"\bmousse\b", r"קר(?:ה|ים)", r"ללא אפייה", r"\bno[- ]?bake\b", r"\bchill")),
    ("pancake", (r"פנקייק", r"חבית", r"\bpancake")),
    ("pudding", (r"פודינג", r"\bpudding")),
    ("fried", (r"מטוג", r"\bfry", r"\bfried", r"במחבת")),
    ("boiled", (r"מרתיח", r"מבשל", r"\bboil", r"\bsimmer")),
    ("cream", (r"קרם(?! אפוי)", r"\bcream\b")),
]

DESSERT_CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("baked_custard", (r"קרם אפוי", r"flan", r"crème brûlée")),
    ("mousse", (r"מוס", r"\bmousse")),
    ("pancake", (r"פנקייק", r"חבית", r"\bpancake")),
    ("pudding", (r"פודינג", r"\bpudding")),
    ("cake", (r"עוג", r"\bcake")),
    ("cookies", (r"עוגיות", r"ביסקוויט", r"\bcookie")),
    ("cream", (r"קרם", r"\bcream")),
    ("brownie", (r"בראוניז", r"\bbrownie")),
    ("ice_cream", (r"גלידה", r"\bice cream")),
]


def _normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def _match_rule(text: str, rules: list[tuple[str, tuple[str, ...]]]) -> str | None:
    for rule_id, patterns in rules:
        if any(re.search(pattern, text, flags=re.I) for pattern in patterns):
            return rule_id
    return None


def detect_cooking_method(recipe: dict) -> str:
    text = f"{recipe.get('name', '')}\n" + "\n".join(recipe.get("steps") or [])
    return _match_rule(text, COOKING_METHOD_RULES) or "general"


def detect_dessert_category(recipe: dict) -> str:
    text = f"{recipe.get('name', '')}\n" + "\n".join(recipe.get("steps") or [])
    return _match_rule(text, DESSERT_CATEGORY_RULES) or "general"


def is_duplicate_title(title: str, exclude_titles: list[str]) -> bool:
    normalized = _normalize_title(title)
    return any(_normalize_title(item) == normalized for item in exclude_titles)


def validate_recipe_diversity(
    recipe: dict,
    *,
    recipe_type: str = "meal",
    exclude_titles: list[str] | None = None,
    exclude_cooking_methods: list[str] | None = None,
    exclude_dessert_categories: list[str] | None = None,
) -> dict:
    exclude_titles = exclude_titles or []
    exclude_cooking_methods = exclude_cooking_methods or []
    exclude_dessert_categories = exclude_dessert_categories or []
    failures: list[str] = []
    cooking_method = detect_cooking_method(recipe)
    dessert_category = detect_dessert_category(recipe) if recipe_type == "dessert" else None

    if exclude_titles and is_duplicate_title(recipe.get("name", ""), exclude_titles):
        failures.append("duplicate_title")
    if (
        exclude_cooking_methods
        and cooking_method in exclude_cooking_methods
        and cooking_method != "general"
    ):
        failures.append("duplicate_cooking_method")
    if (
        recipe_type == "dessert"
        and exclude_dessert_categories
        and dessert_category in exclude_dessert_categories
        and dessert_category != "general"
    ):
        failures.append("duplicate_dessert_category")

    return {
        "ok": not failures,
        "failures": failures,
        "cooking_method": cooking_method,
        "dessert_category": dessert_category,
    }


def build_regeneration_prompt_section(
    *,
    language: str = "he",
    exclude_titles: list[str] | None = None,
    exclude_cooking_methods: list[str] | None = None,
    exclude_dessert_categories: list[str] | None = None,
) -> str:
    exclude_titles = exclude_titles or []
    exclude_cooking_methods = exclude_cooking_methods or []
    exclude_dessert_categories = exclude_dessert_categories or []
    if not exclude_titles and not exclude_cooking_methods and not exclude_dessert_categories:
        return ""

    titles = ", ".join(item for item in exclude_titles if item)
    methods = ", ".join(item for item in exclude_cooking_methods if item)
    categories = ", ".join(item for item in exclude_dessert_categories if item)

    if language == "he":
        return f"""
כללי יצירת מתכון חדש (חובה — לא לחזור על מתכון קודם):
- צור מנה שונה לגמרי — לא אותו מתכון עם שם אחר.
- אל תחזור על שמות: {titles or '(אין)'}.
- אל תחזור על שיטת הכנה: {methods or '(אין)'}.
- אל תחזור על סוג קינוח: {categories or '(אין)'}.
- השתמש באותם מרכיבים זמינים בלבד, אך בנה מנה אחרת (למשל: אם היה "קרם וניל אפוי" — אפשר "מוס וניל קר", "פנקייק וניל" או "פודינג וניל", אך לא אותה מנה).
- החזר מתכון אחד חדש בלבד.
"""

    return f"""
NEW RECIPE RULES (mandatory — do not repeat a previous dish):
- Create a genuinely different dish — not the same recipe with a new title.
- Do NOT repeat titles: {titles or '(none)'}.
- Do NOT repeat cooking methods: {methods or '(none)'}.
- Do NOT repeat dessert categories: {categories or '(none)'}.
- Use the same available ingredients only, but build a different dish.
- Return one new recipe only.
"""


def _main_ingredient_label(ingredients: list[str], language: str) -> str:
    first = (ingredients or [""])[0]
    bare = re.sub(
        r"^[\d\s/]+(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ\"ל|כוס(?:ות)?|יח(?:ידה|ידות)?)\.?\s*",
        "",
        str(first),
        flags=re.I,
    ).strip()
    if not bare:
        return "מתוק" if language == "he" else "sweet"
    return re.sub(r"\(.*?\)", "", bare).strip()


DESSERT_STYLE_VARIANTS: list[dict] = [
    {
        "id": "mousse",
        "category": "mousse",
        "method": "chilled",
        "title_he": lambda main: f"מוס {main}",
        "title_en": lambda main: f"{main} mousse",
        "steps_he": lambda main, mins: [
            f"מכניסים את {main} לקערה ומקציפים בעזרת מערבל ידני עד לתערובת קלילה.",
            "מוסיפים את שאר המרכיבים ומערבבים בעדינות עד לקבלת מרקם אחיד.",
            f"מעבירים לקערות הגשה ומקררים במקרר כ-{mins} דקות עד שהמוס מתייצב.",
            "מגישים קר.",
        ],
        "steps_en": lambda main, mins: [
            f"Whip {main} in a bowl until light and airy.",
            "Fold in the remaining ingredients gently until smooth.",
            f"Chill in serving cups for about {mins} minutes until set.",
            "Serve cold.",
        ],
    },
    {
        "id": "pancake",
        "category": "pancake",
        "method": "fried",
        "title_he": lambda main: f"פנקייק {main}",
        "title_en": lambda main: f"{main} pancakes",
        "steps_he": lambda main, mins: [
            f"מערבבים את {main} עם שאר המרכיבים בקערה עד לבלילה חלקה.",
            "מחממים מחבת על אש בינונית ומשמנים קלות.",
            f"מוזגים כף גדולה לכל פנקייק ומטגנים כ-{max(2, round(mins / 4))} דקות מכל צד עד להזהבה.",
            "מגישים חם.",
        ],
        "steps_en": lambda main, mins: [
            f"Mix {main} with the remaining ingredients until smooth.",
            "Warm a lightly oiled pan over medium heat.",
            f"Cook each pancake for about {max(2, round(mins / 4))} minutes per side until golden.",
            "Serve warm.",
        ],
    },
    {
        "id": "pudding",
        "category": "pudding",
        "method": "boiled",
        "title_he": lambda main: f"פודינג {main}",
        "title_en": lambda main: f"{main} pudding",
        "steps_he": lambda main, mins: [
            f"מערבבים את {main} עם שאר המרכיבים בסיר על אש נמוכה.",
            f"מבשלים תוך ערבוב רציף כ-{mins} דקות עד שהתערובת מסמיכה.",
            "מעבירים לקערות הגשה ומצננים מעט לפני ההגשה.",
            "מגישים בטמפרטורת החדר או מעט פושר.",
        ],
        "steps_en": lambda main, mins: [
            f"Combine {main} with the remaining ingredients in a saucepan over low heat.",
            f"Cook, stirring constantly, for about {mins} minutes until thickened.",
            "Pour into serving bowls and cool slightly before serving.",
            "Serve at room temperature or slightly warm.",
        ],
    },
    {
        "id": "baked_custard",
        "category": "baked_custard",
        "method": "baked",
        "title_he": lambda main: f"קרם {main} אפוי",
        "title_en": lambda main: f"Baked {main} custard",
        "steps_he": lambda main, mins: [
            f"מערבבים את {main} עם שאר המרכיבים עד לתערובת חלקה.",
            "יוצקים לתבניות קטנות ומניחים בתוך תבנית עם מים (אמבט מים).",
            f"אופים בתנור ב-170°C כ-{mins} דקות עד שהקרם מוצק אך רך.",
            "מצננים מעט ומגישים.",
        ],
        "steps_en": lambda main, mins: [
            f"Whisk {main} with the remaining ingredients until smooth.",
            "Pour into ramekins and place in a water bath.",
            f"Bake at 340°F for about {mins} minutes until set but tender.",
            "Cool slightly and serve.",
        ],
    },
    {
        "id": "cream",
        "category": "cream",
        "method": "chilled",
        "title_he": lambda main: f"קרם {main}",
        "title_en": lambda main: f"{main} cream",
        "steps_he": lambda main, mins: [
            f"מערבבים את {main} עם שאר המרכיבים עד לקרם אחיד.",
            "מעבירים לקערת הגשה ומיישרים את פני השטח.",
            f"מקררים כ-{mins} דקות עד שהקרם מתייצב.",
            "מגישים קר.",
        ],
        "steps_en": lambda main, mins: [
            f"Mix {main} with the remaining ingredients until creamy and smooth.",
            "Transfer to a serving dish and level the top.",
            f"Refrigerate for about {mins} minutes until set.",
            "Serve chilled.",
        ],
    },
]


def pick_alternate_dessert_variant(
    *,
    ingredients: list[str] | None = None,
    language: str = "he",
    cooking_time: int = 30,
    exclude_titles: list[str] | None = None,
    exclude_cooking_methods: list[str] | None = None,
    exclude_dessert_categories: list[str] | None = None,
) -> dict:
    from dessert_dish_title import build_dessert_dish_title, pick_primary_flavor_label

    exclude_titles = exclude_titles or []
    exclude_cooking_methods = exclude_cooking_methods or []
    exclude_dessert_categories = exclude_dessert_categories or []
    main = pick_primary_flavor_label(ingredients or [], language)
    mins = min(cooking_time, max(15, round(cooking_time * 0.6)))

    available = []
    for variant in DESSERT_STYLE_VARIANTS:
        built = build_dessert_dish_title(
            ingredients or [],
            language=language,
            style_id=variant["id"],
            exclude_titles=exclude_titles,
            exclude_cooking_methods=exclude_cooking_methods,
            exclude_dessert_categories=exclude_dessert_categories,
        )
        if is_duplicate_title(built["name"], exclude_titles):
            continue
        if variant["method"] in exclude_cooking_methods:
            continue
        if variant["category"] in exclude_dessert_categories:
            continue
        available.append(variant)

    variant = available[0] if available else DESSERT_STYLE_VARIANTS[0]
    built = build_dessert_dish_title(
        ingredients or [],
        language=language,
        style_id=variant["id"],
        exclude_titles=exclude_titles,
        exclude_cooking_methods=exclude_cooking_methods,
        exclude_dessert_categories=exclude_dessert_categories,
    )
    steps = (
        variant["steps_he"](main, mins) if language == "he" else variant["steps_en"](main, mins)
    )
    return {
        "name": built["name"],
        "steps": steps,
        "cooking_method": variant["method"],
        "dessert_category": variant["category"],
        "style_id": variant["id"],
    }
