"""Validate themed meal menus and provide concrete fallback templates."""

from __future__ import annotations

import re
from typing import Any

Category = str

QUANTITY_PATTERN = re.compile(
    r"(\d+|חצי|רבע|שליש|כף|כפות|כפית|כפיות|גרם|ק[\"']?ג|מ[\"']?ל|ליטר|יחיד|יחידות|כוס|כוסות)",
    re.IGNORECASE,
)

PREP_PATTERN = re.compile(
    r"(מרכיבים|הכנה|אופ|מבשל|מקפ|מערב|חתכ|קל|טג|מר|מג|מקר|מייבש|מצ|מעב|מנ|בלנ|מחמ|מייצ)",
    re.IGNORECASE,
)

PLACEHOLDER_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.IGNORECASE)
    for p in (
        r"מנה\s+פרווה\s+מרכזית",
        r"מנה\s+עיקרית\s+בשרית",
        r"מנה\s+חלבית\s+עשירה",
        r"מנה\s+בשרית\s*\(",
        r"מנה\s+עיקרית\b(?!\s*[:—])",
        r"תוספת\s+ירקות/?פחמימה",
        r"תוספת\s+מתאימה",
        r"תוספת\s+ירקות\s+מתאימה",
        r"קינוח\s+פרווה\s+מתוק",
        r"קינוח\s+פרווה\b(?!\s*[:—])",
        r"קינוח\s+חלבי\s+מפנק",
        r"קינוח\s+מתוק\b(?!\s*[:—])",
        r"פרי\s+עונה\s+או",
        r"לפי\s+הנושא",
        r"משקה\s+קל\s+או",
        r"לחם\s+או\s+מנה",
        r"פסטה\s*/\s*מנה",
        r"קוסקוס\s+או\s+אורז",
        r"עוף/בקר",
        r"מארז\s+גבינות",
        r"סלט\s+ירקות\s+טרי\s+עם\s+עשבי\s+תיבול$",
        r"סלט\s+ירקות\s+צבעוני$",
        r"מנה\s+ראשונה\b(?!\s*[:—])",
    )
]

THEMED_MEAL_PROMPT_RULES = """
כללי תפריט (חובה — אסור להפר):
- כל מנה חייבת שם מנה ספציפי אמיתי — לא קטגוריה ולא תבנית.
- אסור לחלוטין: "מנה פרווה מרכזית", "תוספת מתאימה", "קינוח פרווה מתוק", "מנה עיקרית", "לפי הנושא".
- כל שדה (starter, main, sides[], dessert) חייב בפורmat:
  "שם המנה — מרכיבים: [רשימה עם כמויות]. הכנה: [סיכום הכנה קצר]."
- כל מנה חייבת לפחות 3 מרכיבים עם כמויות (גרם, כפות, יחידות).
- משקאות: שם ספציפי + מרכיבים + הכנה (לא "משקה קל").
- דוגמה טובה: "פילה סלמון בתנור עם לימון — מרכיבים: 4 פילי סלמון, 2 לימונים, 3 כפות שמן זית, 1 כף רוזמרין. הכנה: אופים 180 מעלות 18 דקות."
- דוגמה רעה: "מנה עיקרית: מנה פרווה מרכזית".
"""

REGENERATION_PROMPT_SUFFIX = """
התשובה הקודמת נדחתה — היא הכילה תבניות גנריות במקום מנות אמיתיות.
החזר/י שוב JSON מלא. כל מנה חייבת שם ספציפי + מרכיבים עם כמויות + סיכום הכנה.
אסור להחזיר קטegorיות, תיאורים כלליים, או מילים כמו "מתאימה", "מרכזית", "מפנק".
"""


def is_placeholder_dish(text: str) -> bool:
    cleaned = " ".join(str(text or "").split())
    if len(cleaned) < 22:
        return True
    lowered = cleaned.lower()
    for pattern in PLACEHOLDER_PATTERNS:
        if pattern.search(lowered):
            return True
    if "/" in cleaned and not QUANTITY_PATTERN.search(cleaned):
        return True
    return False


def is_concrete_dish(text: str) -> bool:
    cleaned = " ".join(str(text or "").split())
    if is_placeholder_dish(cleaned):
        return False
    has_quantity = bool(QUANTITY_PATTERN.search(cleaned))
    has_prep = bool(PREP_PATTERN.search(cleaned))
    has_ingredients_marker = "מרכיבים" in cleaned
    has_prep_marker = "הכנה" in cleaned
    if has_ingredients_marker and has_prep_marker and has_quantity:
        return True
    return has_quantity and has_prep and len(cleaned) >= 35


def is_valid_themed_meal(meal: Any) -> bool:
    if meal is None:
        return False
    data = meal.model_dump() if hasattr(meal, "model_dump") else meal
    if not isinstance(data, dict):
        return False

    required_strings = ("mealTitle", "description", "starter", "main", "dessert")
    for key in required_strings:
        if not str(data.get(key, "")).strip():
            return False

    for key in ("starter", "main", "dessert"):
        if not is_concrete_dish(str(data.get(key, ""))):
            return False

    sides = data.get("sides") or []
    if not isinstance(sides, list) or len(sides) < 2:
        return False
    if not all(is_concrete_dish(str(item)) for item in sides if str(item).strip()):
        return False

    drinks = data.get("drinks") or []
    if not isinstance(drinks, list) or not drinks:
        return False
    if not all(is_concrete_dish(str(item)) for item in drinks if str(item).strip()):
        return False

    for key in ("servingIdeas", "hostingTips"):
        items = data.get(key) or []
        if not isinstance(items, list) or not any(str(item).strip() for item in items):
            return False

    return True


def _gf_suffix(is_gluten_free: bool) -> str:
    return " (ללא גלוטן)" if is_gluten_free else ""


def _build_parve_menu(theme_label: str, gf: str) -> dict[str, Any]:
    return {
        "starter": (
            "חומוס ביתי עם טחינה ופפריקה — מרכיבים: 400 גרם חומוס, 3 כפות טחינה, "
            "2 שיני שום, מיץ מלימון אחד, חצי כפית כמון. "
            "הכנה: מעבדים בבלנדר עד קרמי, מגישים עם 2 כפות שמן זית ופפריקה."
            f"{gf}"
        ),
        "main": (
            "פילה סלמון בתנור עם לימון ועשבי תיבול — מרכיבים: 4 פילי סלמון (600 גרם), "
            "2 לימונים, 3 כפות שמן זית, 1 כף שמיר, 1 כפית מלח. "
            "הכנה: מניחים על תבנית, אופים 180 מעלות 18 דקות עד שהדג מתפורר."
            f"{gf}"
        ),
        "sides": [
            (
                "תפוחי אדמה צלויים ברוזמרין — מרכיבים: 800 גרם תפוחי אדמה, 3 כפות שמן זית, "
                "1 כפית רוזמרין יבש, 1 כפית מלח. "
                "הכנה: חותכים לקוביות, אופים 200 מעלות 35 דקות עד זהוב."
                f"{gf}"
            ),
            (
                "סלט ירקות ישראלי — מרכיבים: 3 עגבניות, 2 מלפפונים, 1 בצל סגול, "
                "2 כפות שמן זית, 1 כף מיץ לימון. "
                "הכנה: חותכים קוביות, מתבלים ומערבבים לפני ההגשה."
                f"{gf}"
            ),
        ],
        "dessert": (
            "מוס שוקולד מריר עם פירות יער — מרכיבים: 200 גרם שוקולד מריר, "
            "400 מ\"ל קצפת צמחית, 2 כפות אבקת סוכר, 150 גרם פירות יער. "
            "הכנה: ממיסים שוקולד, מקפלים לקצפת, מקררים 4 שעות ומגישים עם פירות."
            f"{gf}"
        ),
        "drinks": [
            (
                "לימונדה ביתית — מרכיבים: 1 ליטר מים, מיץ מ-4 לימונים, 4 כפות סוכר, "
                "עלי נענע. הכנה: מערבבים עד שהסוכר נמס, מקררים 30 דקות."
            ),
            (
                "תה קר עם לימון ודבש — מרכיבים: 1 ליטר מים, 4 שקיקי תה, 2 כפות דבש, "
                "3 פרוסות לימון. הכנה: חוממים 5 דקות, מצננים ומגישים עם לימון."
            ),
        ],
        "description": (
            f"תפריט פרווה מלא ל{theme_label}: חומוס ביתי, סלמון בתנור, "
            "תפוחי אדמה צלויים, סלט ירקות, מוס שוקולד ומשקאות מרעננים."
        ),
    }


def _build_meat_menu(theme_label: str, gf: str) -> dict[str, Any]:
    return {
        "starter": (
            "חצילים בטחינה — מרכיבים: 2 חצילים, 3 כפות טחינה, 2 שיני שום, "
            "מיץ מלימון, 2 כפות שמן זית. "
            "הכנה: קולים על להבה, מורחים טחינה ושום, מגישים חם."
            f"{gf}"
        ),
        "main": (
            "צלי כתף בקר בתנור — מרכיבים: 1.2 ק\"ג כתף בקר, 3 בצלים, 6 שיני שום, "
            "3 כפות שמן זית, 1 כף פפריקה, 1 כפית כמון. "
            "הכנה: מניחים בתבנית, אופים 160 מעלות 3 שעות עד רך."
            f"{gf}"
        ),
        "sides": [
            (
                "אורז עם שקדים — מרכיבים: 2 כוסות אורז, 3 כפות שמן, "
                "50 גרם שקדים קלויים, 1 כפית מלח. "
                "הכנה: מטגנים אורז 2 דקות, מוסיפים מים, מבשלים 18 דקות."
                f"{gf}"
            ),
            (
                "סלט ירקות קיצי — מרכיבים: 2 עגבניות, 2 מלפפונים, 1 גמבה, "
                "2 כפות שמן, מיץ לימון. "
                "הכנה: חותכים, מתבלים ומגישים קר."
                f"{gf}"
            ),
        ],
        "dessert": (
            "עוגת תפוחים בדבש — מרכיבים: 3 תפוחים, 2 ביצים, 100 גרם קמח, "
            "80 גרם סוכר, 3 כפות דבש. "
            "הכנה: מערבבים, אופים 170 מעלות 35 דקות."
            f"{gf}"
        ),
        "drinks": [
            (
                "מיץ רימונים — מרכיבים: 4 רימונים, 1 ליטר מים, 3 כפות סוכר. "
                "הכנה: סוחטים, מסננים ומקררים."
            ),
            (
                "מים מינרליים עם לימון — מרכיבים: 1.5 ליטר מים, 2 לימונים, "
                "עלי נענע. הכנה: מקררים עם פרוסות לימון."
            ),
        ],
        "description": (
            f"תפריט בשרי ל{theme_label}: חצילים בטחינה, צלי כתף, אורז עם שקדים, "
            "סלט ירקות ועוגת תפוחים."
        ),
    }


def _build_dairy_menu(theme_label: str, gf: str) -> dict[str, Any]:
    return {
        "starter": (
            "לחם קלוי עם עגבניות וגבינת עיזים — מרכיבים: 8 פרוסות לחם, "
            "3 עגבניות, 100 גרם גבינת עיזים, 2 כפות שמן זית, 2 שיני שום. "
            "הכנה: קולים לחם, מעלים עגבניות וגבינה."
            f"{gf}"
        ),
        "main": (
            "פסטה ברוטב שמנת ופטריות — מרכיבים: 400 גרם פסטה, 300 מ\"ל שמנת, "
            "250 גרם פטריות, 3 שיני שום, 80 גרם פרמזן. "
            "הכנה: מבשלים פסטה, מקפיצים פטריות, מערבבים עם שמנת ופרמזן."
            f"{gf}"
        ),
        "sides": [
            (
                "סלט ירוק עם אגוזי מלך — מרכיבים: 200 גרם עלי חסה, 3 כפות אגוזי מלך, "
                "2 כפות שמן זית, 1 כף חומץ בלסמי. "
                "הכנה: מערבבים ומגישים מיד."
                f"{gf}"
            ),
            (
                "לחם פוקאצ'ה — מרכיבים: 1 יחיד לחם פוקאצ'ה, 3 כפות שמן זית, "
                "1 כפית מלח גס, 1 כף רוזמרין. "
                "הכנה: מחממים בתנור 180 מעלות 8 דקות."
                f"{gf}"
            ),
        ],
        "dessert": (
            "טירמיסו קלאסי — מרכיבים: 250 גרם מסקרפונה, 3 ביצים, 3 כפות סוכר, "
            "200 מ\"ל קפה קר, 150 גרם ביסקוויטים. "
            "הכנה: מקפלים, שכבות ביסקוויטים ומסקרפונה, מקררים 6 שעות."
            f"{gf}"
        ),
        "drinks": [
            (
                "שייק מנגו — מרכיבים: 2 מנגו, 400 מ\"ל חלב, 2 כפות דבש, "
                "8 קוביות קרח. הכנה: בלנדר עד חלק."
            ),
            (
                "משקה יוגורט עם פירות — מרכיבים: 500 מ\"ל יוגורט, 200 גרם תותים, "
                "2 כפות דבש. הכנה: מעורבבים בבלנדר."
            ),
        ],
        "description": (
            f"תפריט חלבי ל{theme_label}: לחם קלוי עם עגבניות, פסטה בשמנת, "
            "סלט ירוק, פוקאצ'ה, טירמיסו ומשקאות."
        ),
    }


def build_fallback_themed_meal(
    theme_label: str,
    category: Category = "parve",
    is_gluten_free: bool = False,
) -> dict[str, Any]:
    gf = _gf_suffix(is_gluten_free)
    if category == "meat":
        menu = _build_meat_menu(theme_label, gf)
    elif category == "dairy":
        menu = _build_dairy_menu(theme_label, gf)
    else:
        menu = _build_parve_menu(theme_label, gf)

    return {
        "mealTitle": f"ארוחת {theme_label}",
        "description": menu["description"],
        "starter": menu["starter"],
        "main": menu["main"],
        "sides": menu["sides"],
        "dessert": menu["dessert"],
        "drinks": menu["drinks"],
        "servingIdeas": [
            "הגישו מנה ראשונה ב-6 קעריות — 120 מ\"ל בכל קערית.",
            "העיקרית ב-4 צלחות חמות — 1 כף שמן מעל כל מנה לפני יציאה מהמטבח.",
        ],
        "hostingTips": [
            "הכינו תוספות 40 דקות לפני האורחים — חימום 5 דקות בלבד.",
            "הציבו קערית 200 מ\"ל עם 150 גרם חמאה ו-100 גרם מלח גס ליד הלחם.",
        ],
    }
