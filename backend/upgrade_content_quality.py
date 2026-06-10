"""Validate and sanitize upgrade text — reject vague phrases without concrete details."""

from __future__ import annotations

import re
from hebrew_display_text import (
    normalize_recipe_upgrade_content,
    normalize_themed_meal_upgrade_content,
)
from typing import Any

VAGUE_WORDS = (
    "מיוחד",
    "משודרג",
    "איכותי",
    "נימוח",
    "מפנק",
    "חגיגי",
    "עשיר",
    "מרשים",
    "מעוצב",
    "תיבול",
    "טאץ'",
    "טאץ",
    "פרימיום",
    "מושקע",
    "מעודנ",
    "ויזואל",
    "אווירה",
    "מוזיקת רקע",
)

QUANTITY_PATTERN = re.compile(
    r"(\d+|חצי|רבע|שליש|כף|כפות|כפית|כפיות|גרם|ק[\"']?ג|מ[\"']?ל|ליטר|יחיד|יחידות|→)",
    re.IGNORECASE,
)

ACTION_PATTERN = re.compile(
    r"(הוסיפ|מוסיפ|חתכ|קלו|מערב|בשל|אפ|טג|מר|פזר|הגיש|רתח|שבר|גרד|ערבב|ייבש|סמכ)",
    re.IGNORECASE,
)

CONCRETE_PROMPT_RULES = """
כללי כתיבה (חובה):
- כל שורה חייבת לכלול כמויות מדויקות (גרם, כפות, כפיות, יחידות) או פעולה מדידה (5 דקות, 180 מעלות).
- אסור: "תיבול מיוחד", "מרכיב איכותי", "שדרוג ויזואלי", "כלים מעוצבים", "מוזיקת רקע".
- אם משתמשים במילים כמו חגיגי/עשיר — מיד אחריהן ציינו מרכיב + כמות + פעולה.
- שדרוג מתכון: מרכיבים נוספים עם כמויות, שינויי שלבים מדויקים, הגשה עם מרכיבים.
- שדרוג ארוחה: לכל מנה — מקור → שדרוג, תוספות מדויקות, למה זה משפר.
"""


def is_concrete_text(text: str) -> bool:
    cleaned = " ".join(str(text or "").split())
    if len(cleaned) < 18:
        return False
    has_marker = bool(QUANTITY_PATTERN.search(cleaned) or "→" in cleaned)
    has_action = bool(ACTION_PATTERN.search(cleaned))
    if not has_marker and not (has_action and len(cleaned) >= 35):
        return False
    lowered = cleaned.lower()
    for word in VAGUE_WORDS:
        if word in lowered and not has_marker:
            return False
    return True


def ensure_concrete_text(text: str, fallback: str) -> str:
    cleaned = " ".join(str(text or "").split())
    if is_concrete_text(cleaned):
        return cleaned
    return fallback


def ensure_concrete_list(items: list[str] | None, fallbacks: list[str]) -> list[str]:
    source = [str(item).strip() for item in (items or []) if str(item).strip()]
    result: list[str] = []
    for index, fallback in enumerate(fallbacks):
        candidate = source[index] if index < len(source) else ""
        result.append(ensure_concrete_text(candidate, fallback))
    return result


def _detect_dish_key(name: str) -> str:
    text = (name or "").lower()
    if any(token in text for token in ("שקשוק", "shakshuka")):
        return "shakshuka"
    if any(token in text for token in ("חומוס", "hummus")):
        return "hummus"
    if any(token in text for token in ("פסטה", "pasta", "ספגטי", "spaghetti")):
        return "pasta"
    if any(token in text for token in ("סלט", "salad")):
        return "salad"
    if any(token in text for token in ("מרק", "soup")):
        return "soup"
    if any(token in text for token in ("עוף", "chicken")):
        return "chicken"
    if any(token in text for token in ("אורז", "rice")):
        return "rice"
    if any(token in text for token in ("עוג", "cake", "קינוח", "dessert", "מוס", "בראוניז")):
        return "dessert"
    return "generic"


def build_concrete_recipe_upgrade(payload: Any) -> dict[str, Any]:
    name = str(getattr(payload, "name", "") or "").strip() or "המתכון"
    category = getattr(payload, "category", "parve") or "parve"
    is_gluten_free = bool(getattr(payload, "isGlutenFree", False))
    recipe_type = getattr(payload, "recipeType", "meal") or "meal"
    gf = " (ללא גלוטן)" if is_gluten_free else ""
    dish = _detect_dish_key(name)

    if dish == "shakshuka":
        parve_note = (
            "2 כפות טחינה גולמית מעל ההגשה — אם המתכון פרווה."
            if category == "parve"
            else "2 כפות שמנת לבישול או 40 גרם גבינת עיזים — רק אם המתכון חלבי."
        )
        return {
            "upgradedTitle": f"{name} עם פטה, פלפל קלוי וכמון",
            "changes": [
                "הוסיפו 1 פלפל אדום קלוי חתוך לקוביות, 80 גרם גבינת פטה מפוררת, חצי כפית כמון, רבע כפית צ'ילי גרוס ו-2 כפות פטרוזיליה קצוצה לרוטב לפני הביצים.",
                "בשלו את הרוטב 5 דקות נוספות על אש בינונית עד שהפלפל רך והרוטב סמיך יותר.",
                parve_note,
            ],
            "upgradedIngredients": [
                "1 פלפל אדום קלוי, חתוך לקוביות",
                "80 גרם גבינת פטה מפוררת" if category != "meat" else "1 כף שמן זית כתית",
                "חצי כפית כמון",
                "רבע כפית צ'ילי גרוס",
                "2 כפות פטרוזיליה קצוצה",
            ],
            "preparationNotes": [
                "לאחר הוספת הפלפל והתבלינים — בישלו 5 דקות ורק אז שברו את הביצים לגומות.",
                "הוסיפו את הפטה רק אחרי כיבוי האש, כדי שלא תימס לגמרי.",
                "הגישו מיד בצלחת חמה — הרוטב ממשיך לבשל את הביצים מהשארית.",
            ],
            "servingSuggestion": "הגישו ב-4 מחבתות קטנות או בצלחת רדודה עם 2 כפות רוטב סביב כל ביצה, פטרוזיליה ו-1 כפית פלפל שחור טחון.",
            "premiumTouch": "פזרו 1 כף שמן זית כתית ו-1 כף פטרוזיליה על כל מנה ממש לפני ההגשה.",
            "nutritionImpact": "80 גרם פטה מוסיפים כ-200 קלוריות ו-8 גרם חלבון ל-4 מנות; הפלפל מוסיף ויטמין C ללא שומן.",
        }

    if dish == "pasta" and category != "meat":
        return {
            "upgradedTitle": f"{name} עם שמן, שום ופרמזן",
            "changes": [
                "הוסיפו 3 שיני שום כתושות, 3 כפות שמן זית כתית, 40 גרם פרמזן מגורד ו-2 כפות אורגנו טרי.",
                "שמרו 120 מ\"ל מי בישול הפסטה — ערבבו עם הרוטב 2 דקות על אש נמוכה.",
            ],
            "upgradedIngredients": [
                "3 שיני שום כתושות",
                "3 כפות שמן זית כתית",
                "40 גרם פרמזן מגורד",
                "2 כפות אורגנו טרי קצוץ",
                "120 מ\"ל מי בישול פסטה",
            ],
            "preparationNotes": [
                "טגנו את השום 30 שניות בשמן — אל תשרפו.",
                "ערבבו את הפסטה עם הרוטב ומי הבישול עד ציפוי אחיד.",
            ],
            "servingSuggestion": "הגישו בצלחת עמוקה עם 1 כף פרמזן נוסף וענף בזיליקום.",
            "premiumTouch": "גרדו 1 כף קליפת לימון מעל כל מנה לפני ההגשה.",
            "nutritionImpact": "40 גרם פרמזן מוסיפים כ-160 קלוריות ו-12 גרם חלבון ל-2 מנות.",
        }

    if recipe_type == "dessert":
        return {
            "upgradedTitle": f"{name} עם מלח ים ווניל",
            "changes": [
                "הוסיפו רבע כפית מלח ים, חצי כפית תמצית וניל ו-2 כפות חמאה מומסת לבלילה.",
                "אפו 3 דקות פחות מהרגיל — הגרעין יישאר לח יותר.",
            ],
            "upgradedIngredients": [
                "רבע כפית מלח ים",
                "חצי כפית תמצית וניל",
                "2 כפות חמאה מומסת" if category != "parve" else "2 כפות שמן קוקוס",
            ],
            "preparationNotes": [
                "ערבבו מלח ווניל לתערובת היבשה לפני הוספת נוזלים.",
                "הוציאו מהתנור כשהמרכז עדיין רך — השארית תמשיך להתמצק.",
            ],
            "servingSuggestion": "הגישו פרוסה בטמפרטורת החדר עם 1 כף קצפת או יוגורט לצד.",
            "premiumTouch": "פזרו 1 כפית אבקת קקאו או סוכר דק על כל פרוסה.",
            "nutritionImpact": "2 כפות חמאה מוסיפות כ-100 קלוריות ל-8 מנות — שומן וטעם בלבד.",
        }

    if category == "meat":
        return {
            "upgradedTitle": f"{name} עם מרינדת לימון וטימין",
            "changes": [
                "מרינדה: 3 כפות שמן זית, מיץ מלימון אחד, 2 שיני שום, 1 כפית טימין יבש — 20 דקות.",
                "סמכו את הבשר 3 דקות מכל צד על מחבת חמה לפני המשך הבישול.",
            ],
            "upgradedIngredients": [
                "3 כפות שמן זית",
                "מיץ מלימון אחד",
                "2 שיני שום כתושות",
                "1 כפית טימין יבש",
            ],
            "preparationNotes": [
                "ייבשו את הבשר עם נייר סופג לפני הטיגון — קרום טוב יותר.",
                "הוסיפו את המרינדה רק ב-5 הדקות האחרונות כדי שלא תישרף.",
            ],
            "servingSuggestion": "חתכו בנתחים אלכסוניים של 1.5 ס\"מ והגישו עם 2 כפות מיץ מהמחבת.",
            "premiumTouch": "פזרו 1 כף פטרוזיליה קצוצה על כל מנה.",
            "nutritionImpact": "3 כפות שמן מוסיפות כ-360 קלוריות ל-4 מנות — שומן בריא לטיגון.",
        }

    if category == "dairy":
        return {
            "upgradedTitle": f"{name} עם שמנת, שום ופרמזן{gf}",
            "changes": [
                "הוסיפו 100 מ\"ל שמנת מתוקה, 2 שיני שום כתושות ו-30 גרם פרמזן מגורד.",
                "בשלו 4 דקות על אש נמוכה עד שהרוטב מסמיך.",
            ],
            "upgradedIngredients": [
                "100 מ\"ל שמנת מתוקה",
                "2 שיני שום כתושות",
                "30 גרם פרמזן מגורד",
            ],
            "preparationNotes": [
                "הוסיפו שמנת רק אחרי שהמרכיבים העיקריים מבושלים.",
                "ערבבו 1 כף קורנפלור מומס ב-2 כפות מים אם צריך לסמיך.",
            ],
            "servingSuggestion": "הגישו ב-4 קעריות עם 1 כף פרמזן נוסף מעל.",
            "premiumTouch": "1 כף חמאה קרה על כל מנה — נמסה על החום.",
            "nutritionImpact": "100 מ\"ל שמנת ≈ 330 קלוריות ל-4 מנות — עיקר השינוי בשומן.",
        }

    return {
        "upgradedTitle": f"{name} עם טחינה, לימון ופטרוזיליה{gf}",
        "changes": [
            "הוסיפו 2 כפות טחינה גולמית, מיץ מחצי לימון, 1 שן שום כתושה ו-3 כפות פטרוזיליה.",
            "ערבבו 1 כף שמן זית ו-1 כף מים לרוטב לפני הגשה.",
        ],
        "upgradedIngredients": [
            "2 כפות טחינה גולמית",
            "מיץ מחצי לימון",
            "1 שן שום כתושה",
            "3 כפות פטרוזיליה קצוצה",
            "1 כף שמן זית כתית",
        ],
        "preparationNotes": [
            "ערבבו את הטחינה עם מיץ הלימון לפני הוספה למנה — פחות גושים.",
            "טעמו ותקנו מלח לפני ההגשה.",
        ],
        "servingSuggestion": "הגישו בצלחת עם 1 כף טחינה נוספת ו-1 כף פטרוזיליה בצד.",
        "premiumTouch": "פזרו 1 כפית סומק על כל מנה.",
        "nutritionImpact": "2 כפות טחינה ≈ 180 קלוריות — חלבון ושומן בריא ל-2 מנות.",
    }


def sanitize_recipe_upgrade(upgrade: Any, payload: Any) -> Any:
    concrete = build_concrete_recipe_upgrade(payload)
    data = upgrade.model_dump() if hasattr(upgrade, "model_dump") else dict(upgrade)

    data["upgradedTitle"] = ensure_concrete_text(
        data.get("upgradedTitle", ""),
        concrete["upgradedTitle"],
    )
    data["changes"] = ensure_concrete_list(data.get("changes"), concrete["changes"])
    data["upgradedIngredients"] = ensure_concrete_list(
        data.get("upgradedIngredients"),
        concrete["upgradedIngredients"],
    )
    data["preparationNotes"] = ensure_concrete_list(
        data.get("preparationNotes"),
        concrete["preparationNotes"],
    )
    data["servingSuggestion"] = ensure_concrete_text(
        data.get("servingSuggestion", ""),
        concrete["servingSuggestion"],
    )
    data["premiumTouch"] = ensure_concrete_text(
        data.get("premiumTouch", ""),
        concrete["premiumTouch"],
    )
    data["nutritionImpact"] = ensure_concrete_text(
        data.get("nutritionImpact", ""),
        concrete["nutritionImpact"],
    )

    language = getattr(payload, "language", None) or "he"
    data = normalize_recipe_upgrade_content(data, language)

    if hasattr(upgrade, "model_copy"):
        return upgrade.model_copy(update=data)
    return data


def _dish_upgrade_line(label: str, original: str, upgraded: str, additions: str, why: str) -> str:
    return (
        f"{label}: {original} → {upgraded}. "
        f"תוספות מדויקות: {additions}. "
        f"למה זה משדרג: {why}."
    )


def build_concrete_themed_meal_upgrade(meal: Any, category: str = "parve", is_gluten_free: bool = False) -> dict[str, Any]:
    gf_note = " (ללא גלוטן)" if is_gluten_free else ""
    title = str(getattr(meal, "mealTitle", "") or "הארוחה")

    if category == "meat":
        starter_add = "80 גרם חומוס, 2 כפות עגבניות קלויות, 1 כף שמן זית, כף דבש"
        starter_up = f"{meal.starter} עם עגבניות קלויות וחומוס"
        starter_why = "מוסיף מתיקות קלה וקרמיות מול הבשר"
    elif category == "dairy":
        starter_add = "100 גרם גבינת פטה, 3 כפות אגוזי מלך קלויים, 2 כפות שמן זית, כף בלסמי, כפית דבש"
        starter_up = f"{meal.starter} עם גבינת פטה, אגוזי מלך ורוטב בלסמי"
        starter_why = "מוסיף מליחות, קראנץ' וחמיצות מאוזנת"
    else:
        starter_add = "120 גרם חומוס, 3 כפות אגוזי מלך קלויים, 2 כפות שמן זית, כף בלסמי, כפית דבש"
        starter_up = f"{meal.starter} עם חומוס, אגוזי מלך ורוטב בלסמי"
        starter_why = "מוסיף חלבון, קראנץ' וחמיצות בלי חלב"

    dish_upgrades = [
        _dish_upgrade_line("מנה ראשונה", meal.starter, starter_up, starter_add, starter_why),
        _dish_upgrade_line(
            "מנה עיקרית",
            meal.main,
            f"{meal.main} עם 2 כפות שמן זית ו-1 כף עשבי תיבול",
            "2 כפות שמן זית כתית, 1 כף בזיליקום או פטרוזיליה, 1 כפית מלח גס, חצי כפית פלפל שחור",
            "מגדיר טעם ומרקם ב-4 מרכיבים מדידים",
        ),
    ]

    for index, side in enumerate(meal.sides[:2]):
        dish_upgrades.append(
            _dish_upgrade_line(
                f"תוספת {index + 1}",
                side,
                f"{side} עם 1 כף שמן זית ו-1 כף זרעי שמש קלויים",
                "1 כף שמן זית, 1 כף זרעי שמש/סומסום קלויים",
                "מוסיף שומן וקראנץ' מדיד",
            )
        )

    dish_upgrades.append(
        _dish_upgrade_line(
            "קינוח",
            meal.dessert,
            f"{meal.dessert} עם 1 כף אבקת סוכר ו-2 כפות פירות יער",
            "1 כף אבקת סוכר, 2 כפות פירות יער טריים",
            "מוסיף מתיקות וצבע ב-2 כפות בלבד",
        )
    )

    return {
        "upgradedMealTitle": f"{title} — פטה, אגוזים ובלסמי{gf_note}",
        "upgradedMenu": [
            f"מנה ראשונה: {starter_up}",
            f"עיקרית: {meal.main} + 2 כפות שמן זית ו-1 כף עשבי תיבול",
            *[f"תוספת: {side} + 1 כף שמן ו-1 כף זרעים קלויים" for side in meal.sides],
            f"קינוח: {meal.dessert} + 1 כף אבקת סוכר ו-2 כפות פירות יער",
            *[f"משקה: {drink}" for drink in meal.drinks],
        ],
        "dishUpgrades": dish_upgrades,
        "servingIdeas": [
            "הגישו מנה ראשונה ב-6 קעריות קטנות — 80 מ\"ל לכל קערית.",
            "העיקרית ב-4 צלחות חמות — 1 כף שמן מעל כל מנה לפני יציאה מהמטבח.",
        ],
        "atmosphereIdeas": [
            "2 נרות לבנים בגובה 15 ס\"מ במרכז השולחן.",
            "הנמיכו תאורה ל-40% — מספיק לראות את הצלחות.",
        ],
        "specialAdditions": [
            "קערית 200 מ\"ל עם 150 גרם חמאה בטמפרטורת החדר ו-100 גרם מלח גס.",
            "קערית 150 מ\"ל עם 100 גרם זיתים ירוקים.",
        ],
        "impressiveTips": [
            "הוציאו את המנה הראשונה 2 דקות לפני הקריאה לשולחן — 6 מנות מוכנות ביחד.",
            "גרדו 1 כף קליפת לימון על העיקרית ב-4 נקודות שונות לפני ההגשה.",
        ],
    }


def sanitize_themed_meal_upgrade(
    upgrade: Any,
    meal: Any,
    category: str = "parve",
    is_gluten_free: bool = False,
    language: str = "he",
) -> Any:
    concrete = build_concrete_themed_meal_upgrade(meal, category, is_gluten_free)
    data = upgrade.model_dump() if hasattr(upgrade, "model_dump") else dict(upgrade)

    data["upgradedMealTitle"] = ensure_concrete_text(
        data.get("upgradedMealTitle", ""),
        concrete["upgradedMealTitle"],
    )
    data["upgradedMenu"] = ensure_concrete_list(data.get("upgradedMenu"), concrete["upgradedMenu"])
    data["dishUpgrades"] = ensure_concrete_list(data.get("dishUpgrades"), concrete["dishUpgrades"])
    data["servingIdeas"] = ensure_concrete_list(data.get("servingIdeas"), concrete["servingIdeas"])
    data["atmosphereIdeas"] = ensure_concrete_list(data.get("atmosphereIdeas"), concrete["atmosphereIdeas"])
    data["specialAdditions"] = ensure_concrete_list(data.get("specialAdditions"), concrete["specialAdditions"])
    data["impressiveTips"] = ensure_concrete_list(data.get("impressiveTips"), concrete["impressiveTips"])

    language = language or "he"
    data = normalize_themed_meal_upgrade_content(data, language)

    if hasattr(upgrade, "model_copy"):
        return upgrade.model_copy(update=data)
    return data
