"""Recipe-specific nutrition tips — no generic add-protein/vegetables advice."""

from __future__ import annotations

import re

from ingredient_relevance import canonical_ingredient

DESSERT_SIGNALS = (
    "sugar",
    "honey",
    "chocolate",
    "marshmallow",
    "marshmallows",
    "cookie",
    "cookies",
    "candy",
    "vanilla",
    "coconut",
    "cream",
    "butter",
    "סוכר",
    "דבש",
    "שוקולד",
    "מרשמלו",
    "עוג",
    "קינוח",
    "dessert",
    "מתוק",
)

PASTA_SIGNALS = ("pasta", "spaghetti", "penne", "noodle", "noodles", "פסטה", "אטרי")

SALAD_SIGNALS = ("salad", "סלט", "lettuce", "חסה")

DRESSING_SIGNALS = (
    "oil",
    "olive",
    "tahini",
    "mayonnaise",
    "mayo",
    "vinegar",
    "lemon juice",
    "dressing",
    "שמן",
    "טחינה",
    "מיונז",
    "חומץ",
    "לימון",
    "רוטב",
)


def _text_blob(name: str, ingredients: list[str]) -> str:
    return f"{name} {' '.join(ingredients)}".lower()


def _has_pattern(text: str, patterns: tuple[str, ...]) -> bool:
    return any(re.search(re.escape(token), text, re.I) if len(token) <= 4 else token in text for token in patterns)


def _has_regex(text: str, pattern: str) -> bool:
    return bool(re.search(pattern, text, re.I))


def _collect_canons(ingredients: list[str]) -> set[str]:
    canons: set[str] = set()
    for item in ingredients or []:
        canon = canonical_ingredient(str(item))
        if canon:
            canons.add(canon)
    return canons


def _pick_tip(candidates: list[str | None], limit: int = 3) -> list[str]:
    tips: list[str] = []
    seen: set[str] = set()
    for tip in candidates:
        if not tip or tip in seen:
            continue
        tips.append(tip)
        seen.add(tip)
        if len(tips) >= limit:
            break
    return tips


def analyze_recipe_profile(name: str, ingredients: list[str]) -> dict:
    text = _text_blob(name, ingredients)
    canons = _collect_canons(ingredients)
    dessert_hits = sum(1 for signal in DESSERT_SIGNALS if signal in text)
    is_dessert = dessert_hits >= 2 or _has_regex(text, r"קינוח|dessert|עוג(?:ה|יות)|cookie")

    is_pasta = "pasta" in canons or _has_pattern(text, PASTA_SIGNALS)
    is_salad = _has_pattern(text, SALAD_SIGNALS) or (
        {"cucumber", "tomato", "avocado", "lettuce"} & canons and "pasta" not in canons
    )

    return {
        "is_dessert": is_dessert and not is_pasta,
        "is_pasta": is_pasta and not is_dessert,
        "is_salad": is_salad and not is_pasta and not is_dessert,
        "has_sugar": "sugar" in canons or _has_regex(text, r"סוכר|sugar"),
        "has_honey": "honey" in canons or _has_regex(text, r"דבש|honey"),
        "has_marshmallow": "marshmallow" in canons or "marshmallows" in canons or "מרשמלו" in text,
        "has_chocolate": "chocolate" in canons or _has_regex(text, r"שוקולד|chocolate"),
        "has_cream": "cream" in canons or _has_regex(text, r"שמנת|heavy cream|cream"),
        "has_butter": "butter" in canons or _has_regex(text, r"חמאה|butter"),
        "has_pasta": is_pasta,
        "has_oil": "oil" in canons or _has_regex(text, r"שמן|olive oil|oil"),
        "has_dressing": _has_pattern(text, DRESSING_SIGNALS),
        "has_cheese": "cheese" in canons or "parmesan" in canons or _has_regex(text, r"גבינ|cheese|parmesan"),
        "has_yogurt": "yogurt" in canons or _has_regex(text, r"יוגורט|yogurt"),
        "has_chicken": "chicken" in canons or _has_regex(text, r"עוף|chicken"),
        "has_tuna": "tuna" in canons or _has_regex(text, r"טונה|tuna"),
        "has_egg": "egg" in canons or "eggs" in canons or _has_regex(text, r"ביצ|egg"),
        "has_vegetables": bool(
            {"tomato", "broccoli", "pepper", "spinach", "zucchini", "carrot", "mushroom", "onion"} & canons
        ),
        "has_coconut": "coconut" in canons or _has_regex(text, r"קוקוס|coconut"),
    }


def build_recipe_specific_tips(
    *,
    name: str,
    ingredients: list[str],
    protein_level: str,
    fat_level: str,
    fiber_level: str,
    language: str = "he",
) -> list[str]:
    profile = analyze_recipe_profile(name, ingredients)
    is_he = language == "he"
    tips: list[str | None] = []

    if profile["is_dessert"]:
        if profile["has_sugar"]:
            tips.append(
                "אפשר להקטין את כמות הסוכר בכ-25% — בדרך כלל המתוקות נשארת טובה."
                if is_he
                else "Try cutting the sugar by about 25% — the dessert usually stays sweet enough."
            )
        if profile["has_marshmallow"]:
            tips.append(
                "נסו להקטין את כמות המרשמלו או להחליף חלק ממנו בפירות טריים."
                if is_he
                else "Reduce the marshmallows or swap some for fresh fruit."
            )
        if profile["has_chocolate"]:
            tips.append(
                "החליפו שוקולד מלבין בשוקולד מריר (70%+) — פחות סוכר, יותר טעם."
                if is_he
                else "Swap milk chocolate for dark chocolate (70%+) — less sugar, richer flavor."
            )
        if profile["has_honey"] and not profile["has_sugar"]:
            tips.append(
                "הקטינו מעט את כמות הדבש, או החליפו חלק ממנו במחית תמרים."
                if is_he
                else "Use a little less honey, or replace part of it with date paste."
            )
        if profile["has_cream"] or profile["has_butter"]:
            tips.append(
                "יוגורט יווני יכול להחליף חלק מהשמנת/חמאה — פחות שומן, עדיין קרמי."
                if is_he
                else "Greek yogurt can replace part of the cream or butter — less fat, still creamy."
            )
        if profile["has_coconut"]:
            tips.append(
                "הקטינו מעט את כמות הקוקוס אם רוצים מנה קלה יותר — הטעם יישאר בולט."
                if is_he
                else "Use a little less coconut for a lighter version — the flavor will still come through."
            )

    elif profile["is_pasta"]:
        if profile["has_pasta"]:
            tips.append(
                "החליפו חלק מהפסטה בפסטה מקמח מלא — יותר סיבים, אותו רוטב."
                if is_he
                else "Swap some of the pasta for whole wheat pasta — more fiber, same sauce."
            )
        if profile["has_cream"]:
            tips.append(
                "הקטינו את כמות השמנת ודללו במעט מי בישול — הרוטב יישאר קרמי אך קל יותר."
                if is_he
                else "Use less cream and thin the sauce with a splash of pasta water — still creamy, lighter."
            )
        elif profile["has_butter"]:
            tips.append(
                "הקטינו את כמות החמאה בחצי — הרוטב יישאר עשיר, עם פחות שומן רווי."
                if is_he
                else "Halve the butter — the sauce stays rich with less saturated fat."
            )
        if not profile["has_vegetables"] and fiber_level != "high":
            tips.append(
                "הוסיפו לרוטב ירק קצוץ (ברוקולי, פלפל או קישוא) — מתאים טבעית לפסטה."
                if is_he
                else "Fold in chopped vegetables (broccoli, pepper, or zucchini) — a natural fit for pasta."
            )

    elif profile["is_salad"]:
        if protein_level == "low":
            if profile["has_cheese"]:
                tips.append(
                    "הוסיפו עוד מעט גבינה או חתיכות עוף/טונה — יתאים לסלט הזה."
                    if is_he
                    else "Add a bit more cheese or some chicken/tuna — it fits this salad well."
                )
            elif profile["has_egg"]:
                tips.append(
                    "הוסיפו עוד ביצה או חלבון קל כמו טונה — ישדרג את הסלט למנה מלאה."
                    if is_he
                    else "Add another egg or light protein like tuna — turns this salad into a full meal."
                )
            else:
                tips.append(
                    "לסלט הזה כדאי להוסיף מקור חלבון — גבינה בולגרית, עוף או טונה."
                    if is_he
                    else "This salad would benefit from a protein source — feta, chicken, or tuna."
                )
        if profile["has_dressing"] or profile["has_oil"]:
            tips.append(
                "הקטינו את כמות הרוטב או השמן — מספיק כף-שתיים לתיבול טוב."
                if is_he
                else "Use less dressing or oil — a tablespoon or two is often enough."
            )

    else:
        if profile["has_cream"] and fat_level == "high":
            tips.append(
                "הקטינו את כמות השמנת במתכון — אפשר לדלל במעט חלב או מי בישול."
                if is_he
                else "Reduce the cream in this recipe — thin with a little milk or cooking liquid."
            )
        if profile["has_butter"] and fat_level == "high":
            tips.append(
                "הקטינו את כמות החמאה בחצי — הטעם יישאר, עם פחות קלוריות."
                if is_he
                else "Halve the butter in this recipe — same flavor, fewer calories."
            )
        if profile["has_oil"] and fat_level in {"high", "medium"}:
            tips.append(
                "הקטינו את כמות השמן — במתכון הזה מספיק כף-שתיים במקום יותר."
                if is_he
                else "Use less oil in this recipe — one or two tablespoons is often enough."
            )
        if profile["has_sugar"] and not profile["is_dessert"]:
            tips.append(
                "הקטינו מעט את כמות הסוכר — הטעם המלוח-מתוק יישאר מאוזן."
                if is_he
                else "Reduce the sugar slightly — the sweet-savory balance will still work."
            )

    if len(_pick_tip(tips)) < 2:
        if profile["has_chicken"] and protein_level == "low":
            tips.append(
                "הגדילו מעט את מנת העוף — המתכון כבר מבוסס עליו."
                if is_he
                else "Increase the chicken portion slightly — the recipe is already built around it."
            )
        if profile["has_vegetables"] and fiber_level == "high":
            tips.append(
                "המנה כבר עשירה בירקות — שמרו על המרכיבים האלה, הם נותנים סיבים ושובע."
                if is_he
                else "This dish is already vegetable-rich — keep those ingredients for fiber and fullness."
            )

    picked = _pick_tip(tips)
    if not picked:
        notable = ", ".join(ingredients[:3]) if ingredients else name
        picked = [
            (
                f"הקפידו על מנות בינוניות — במתכון עם {notable} כדאי לא לאכול יותר מדי בבת אחת."
                if is_he
                else f"Stick to moderate portions — with {notable}, one serving at a time is enough."
            )
        ]

    return picked[:3]
