"""Generate and upgrade themed full-meal menus (Gemini + Hebrew fallback)."""

from __future__ import annotations

from typing import Literal

from google import genai
from kosher_category_definitions import build_kosher_rules_he
from pydantic import BaseModel, Field, ValidationError
from hebrew_display_text import normalize_themed_meal_content
from upgrade_content_quality import (
    CONCRETE_PROMPT_RULES,
    build_concrete_themed_meal_upgrade,
    sanitize_themed_meal_upgrade,
)

Category = Literal["dairy", "meat", "parve"]

THEME_LABELS: dict[str, str] = {
    "friday_dinner": "ארוחת שישי",
    "family_gathering": "אירוח משפחתי",
    "birthday": "יום הולדת",
    "kids_party": "מסיבת ילדים",
    "movie_night": "ערב סרט",
    "picnic": "פיקניק",
    "bbq": "מנגל",
    "romantic_dinner": "ארוחה רומנטית",
    "holiday_meal": "ארוחת חג",
    "rosh_hashanah": "ראש השנה",
    "passover": "פסח",
    "shavuot": "שבועות",
    "hanukkah": "חנוכה",
    "sukkot": "סוכות",
    "summer_party": "מסיבת קיץ",
    "brunch": "בראנץ'",
    "other": "אחר",
}

CATEGORY_LABELS: dict[Category, str] = {
    "dairy": "חלבי",
    "meat": "בשרי",
    "parve": "פרווה",
}


class ThemedMealOutput(BaseModel):
    mealTitle: str
    description: str
    starter: str
    main: str
    sides: list[str] = Field(default_factory=list)
    dessert: str
    drinks: list[str] = Field(default_factory=list)
    servingIdeas: list[str] = Field(default_factory=list)
    hostingTips: list[str] = Field(default_factory=list)


class UpgradedThemedMealOutput(BaseModel):
    upgradedMealTitle: str
    upgradedMenu: list[str] = Field(default_factory=list)
    dishUpgrades: list[str] = Field(default_factory=list)
    servingIdeas: list[str] = Field(default_factory=list)
    atmosphereIdeas: list[str] = Field(default_factory=list)
    specialAdditions: list[str] = Field(default_factory=list)
    impressiveTips: list[str] = Field(default_factory=list)


class GenerateThemedMealRequest(BaseModel):
    theme: str = "friday_dinner"
    customTheme: str = ""
    category: Category = "parve"
    isGlutenFree: bool = False
    language: str = "he"


class UpgradeThemedMealRequest(BaseModel):
    theme: str = "friday_dinner"
    customTheme: str = ""
    category: Category = "parve"
    isGlutenFree: bool = False
    language: str = "he"
    meal: ThemedMealOutput


class GenerateThemedMealResponse(BaseModel):
    meal: ThemedMealOutput
    source: Literal["gemini", "fallback"] = "fallback"
    ok: bool = True
    error: str | None = None


class UpgradeThemedMealResponse(BaseModel):
    upgrade: UpgradedThemedMealOutput
    source: Literal["gemini", "fallback"] = "fallback"
    ok: bool = True
    error: str | None = None


def resolve_theme_label(theme: str, custom_theme: str = "") -> str:
    if theme == "other":
        custom = custom_theme.strip()
        return custom if custom else THEME_LABELS["other"]
    return THEME_LABELS.get(theme, theme)


def _gluten_note(is_gluten_free: bool) -> str:
    return "כן — אל תכלול גלוטן" if is_gluten_free else "לא"


def _build_generate_prompt(payload: GenerateThemedMealRequest) -> str:
    theme_label = resolve_theme_label(payload.theme, payload.customTheme)
    category_label = CATEGORY_LABELS[payload.category]
    kosher = build_kosher_rules_he(category=payload.category, category_label=category_label)

    return f"""אתה שף ומארח/ת אירועים בישראל. צור תפריט ארוחה מלא לנושא: "{theme_label}".
הכל בעברית, מעשי ומפורט.

קטגוריה: {category_label}
ללא גלוטן: {_gluten_note(payload.isGlutenFree)}

{kosher.strip()}

החזר JSON עם:
- mealTitle: שם הארוחה
- description: תיאור קצר (2–3 משפטים)
- starter: מנה ראשונה
- main: מנה עיקרית
- sides: רשימת תוספות (2–4 פריטים)
- dessert: קינוח
- drinks: משקאות מומלצים (2–4)
- servingIdeas: רעיונות הגשה (2–4)
- hostingTips: טיפים לאירוח (2–4)

חובה: תפריט שלם ומגובש לנושא, מתאים לקטגוריה ולכללי הכשרות."""


def _build_upgrade_prompt(payload: UpgradeThemedMealRequest) -> str:
    theme_label = resolve_theme_label(payload.theme, payload.customTheme)
    category_label = CATEGORY_LABELS[payload.category]
    kosher = build_kosher_rules_he(category=payload.category, category_label=category_label)
    meal = payload.meal

    return f"""אתה שף ישראלי. שדרג/י את תפריט הארוחה הבא לנושא "{theme_label}" — גרסה מושקעת יותר.
הכל בעברית.

קטגוריה: {category_label}
ללא גלוטן: {_gluten_note(payload.isGlutenFree)}

{kosher.strip()}

תפריט נוכחי:
- שם: {meal.mealTitle}
- תיאור: {meal.description}
- מנה ראשונה: {meal.starter}
- עיקרית: {meal.main}
- תוספות: {", ".join(meal.sides)}
- קינוח: {meal.dessert}
- משקאות: {", ".join(meal.drinks)}

החזר JSON עם:
- upgradedMealTitle: כותרת עם מרכיבים/מנות ספציפיים
- upgradedMenu: רשימת מנות — כל שורה עם כמויות
- dishUpgrades: לכל מנה — "מנה: [מקור] → [שדרוג]. תוספות מדויקות: [כמויות]. למה זה משדרג: [סיבה]."
- servingIdeas: הגשה עם כמויות (מ\"ל, גרם, מספר קערות)
- atmosphereIdeas: פרטים מדידים (נרות, גובה, אחוזי תאורה) — לא "מוזיקת רקע"
- specialAdditions: תוספות עם כמויות
- impressiveTips: פעולות מדידות (דקות, כפות, מספר מנות)

{CONCRETE_PROMPT_RULES.strip()}

שמור על הקטגוריה והכללים התזונתיים."""


def _fallback_meal(theme: str, custom_theme: str, category: Category, is_gluten_free: bool) -> ThemedMealOutput:
    theme_label = resolve_theme_label(theme, custom_theme)
    gf = " ללא גלוטן" if is_gluten_free else ""
    cat = CATEGORY_LABELS[category]

    if category == "meat":
        starter = f"סלט ירקות טרי עם עשבי תיבול{gf}"
        main_dish = f"מנה עיקרית בשרית מיוחדת ל{theme_label}{gf}"
        dessert = f"פרי עונה או קינוח קל{gf}"
    elif category == "dairy":
        starter = f"מארז גבינות וירקות{gf}"
        main_dish = f"מנה חלבית עשירה ל{theme_label}{gf}"
        dessert = f"קינוח חלבי מפנק{gf}"
    else:
        starter = f"סלט ירקות צבעוני{gf}"
        main_dish = f"מנה פרווה מרכזית ל{theme_label}{gf}"
        dessert = f"קינוח פרווה מתוק{gf}"

    sides = [
        f"תוספת ירקות/פחמימה מתאימה ({cat})",
        f"לחם או מנה לצד לפי הנושא{gf}",
    ]
    drinks = ["מים מינרליים", "משקה קל או תה"]
    serving = [
        "הגישו כל מנה בקערות נפרדות על השולחן",
        f"הוסיפו אלמנט דקורטיבי שמתאים ל{theme_label}",
    ]
    tips = [
        "הכינו מראש את המנות שלא דורשות חום ישיר",
        "שלבו צבעים ומרקמים שונים בכל מנה",
    ]

    return ThemedMealOutput(
        mealTitle=f"ארוחת {theme_label}",
        description=f"תפריט {cat}{gf} מלא ומגובש ל{theme_label}, עם מנות מגוונות שמתאימות לאירוח נעים.",
        starter=starter,
        main=main_dish,
        sides=sides,
        dessert=dessert,
        drinks=drinks,
        servingIdeas=serving,
        hostingTips=tips,
    )


def _fallback_upgrade(
    meal: ThemedMealOutput,
    category: Category = "parve",
    is_gluten_free: bool = False,
) -> UpgradedThemedMealOutput:
    data = build_concrete_themed_meal_upgrade(meal, category, is_gluten_free)
    return UpgradedThemedMealOutput(**data)


def generate_themed_meal_with_fallback(
    client: genai.Client | None,
    model: str,
    payload: GenerateThemedMealRequest,
) -> GenerateThemedMealResponse:
    fallback = _fallback_meal(
        payload.theme,
        payload.customTheme,
        payload.category,
        payload.isGlutenFree,
    )

    if client is None:
        normalized = normalize_themed_meal_content(fallback.model_dump(), payload.language or "he")
        return GenerateThemedMealResponse(meal=ThemedMealOutput(**normalized), source="fallback")

    try:
        prompt = _build_generate_prompt(payload)
        schema = ThemedMealOutput.model_json_schema()
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": schema,
            },
        )
        if not response.text:
            raise RuntimeError("Empty Gemini response")
        meal = ThemedMealOutput.model_validate_json(response.text)
        normalized = normalize_themed_meal_content(meal.model_dump(), payload.language or "he")
        meal = ThemedMealOutput(**normalized)
        return GenerateThemedMealResponse(meal=meal, source="gemini")
    except (ValidationError, RuntimeError, Exception) as exc:
        print(f"[FOOD FOR ANY MOOD] Themed meal generation failed: {exc}")
        return GenerateThemedMealResponse(
            meal=ThemedMealOutput(
                **normalize_themed_meal_content(fallback.model_dump(), payload.language or "he")
            ),
            source="fallback",
            ok=True,
            error=str(exc),
        )


def _finalize_themed_meal_upgrade(
    upgrade: UpgradedThemedMealOutput,
    meal: ThemedMealOutput,
    category: Category,
    is_gluten_free: bool,
    language: str = "he",
) -> UpgradedThemedMealOutput:
    return sanitize_themed_meal_upgrade(
        upgrade,
        meal,
        category,
        is_gluten_free,
        language,
    )


def upgrade_themed_meal_with_fallback(
    client: genai.Client | None,
    model: str,
    payload: UpgradeThemedMealRequest,
) -> UpgradeThemedMealResponse:
    fallback = _fallback_upgrade(
        payload.meal,
        payload.category,
        payload.isGlutenFree,
    )

    if client is None:
        return UpgradeThemedMealResponse(
            upgrade=_finalize_themed_meal_upgrade(
                fallback,
                payload.meal,
                payload.category,
                payload.isGlutenFree,
                payload.language or "he",
            ),
            source="fallback",
        )

    try:
        prompt = _build_upgrade_prompt(payload)
        schema = UpgradedThemedMealOutput.model_json_schema()
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": schema,
            },
        )
        if not response.text:
            raise RuntimeError("Empty Gemini response")
        upgrade = UpgradedThemedMealOutput.model_validate_json(response.text)
        upgrade = _finalize_themed_meal_upgrade(
            upgrade,
            payload.meal,
            payload.category,
            payload.isGlutenFree,
            payload.language or "he",
        )
        return UpgradeThemedMealResponse(upgrade=upgrade, source="gemini")
    except (ValidationError, RuntimeError, Exception) as exc:
        print(f"[FOOD FOR ANY MOOD] Themed meal upgrade failed: {exc}")
        return UpgradeThemedMealResponse(
            upgrade=_finalize_themed_meal_upgrade(
                fallback,
                payload.meal,
                payload.category,
                payload.isGlutenFree,
                payload.language or "he",
            ),
            source="fallback",
            ok=True,
            error=str(exc),
        )
