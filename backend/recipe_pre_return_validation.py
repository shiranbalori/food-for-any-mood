"""Pre-return recipe validation: feasibility, quantities, steps, placeholders."""

from __future__ import annotations

import re

from ingredient_relevance import (
    canonical_ingredient,
    ingredient_appears_in_text,
    normalize_ingredient,
    parse_user_ingredients,
)
from measurement_units import parse_leading_measurement
from recipe_utils import is_staple
from recipe_quantities import is_valid_quantified_display
from ingredient_allowlist import find_unauthorized_recipe_ingredients
from recipe_category_fit import assess_category_fit
from recipe_coherence_validation import validate_recipe_coherence
from recipe_step_sanitize import has_repeated_parenthetical_ingredients
from ingredient_relevance import ingredients_match

PLACEHOLDER_PATTERNS = (
    r"\(strawberry\)",
    r"\[ingredient\]",
    r"ingredient_name",
    r"\bTODO\b",
    r"\bplaceholder\b",
    r"\{\{.*?\}\}",
    r"<.*?>",
    r"xxx",
    r"lorem ipsum",
)

COOKING_ACTIONS = (
    "slice", "sliced", "chop", "chopped", "dice", "mince", "whisk", "beat", "fold",
    "bake", "roast", "grill", "fry", "sauté", "saute", "boil", "simmer", "steam",
    "melt", "cool", "chill", "refrigerate", "freeze", "heat", "warm", "toast",
    "blend", "puree", "crush", "grind", "season", "marinate", "drain", "rinse",
    "peel", "grate", "spread", "layer", "roll", "knead", "rest", "rise",
    "חותך", "קוצץ", "מקציף", "מערבב", "אופה", "מטגן", "מבשל", "מרתיח",
    "ממיס", "מקרר", "מעביר", "מסנן", "שוטף", "מקליף", "מגרד", "ממרח", "מגלגל",
    "מסדר", "מניח", "יוצק", "מעצב", "מבשלים", "מערבבים", "חותכים", "אופים", "לשים",
)

WEAK_ONLY_ACTIONS = frozenset(
    {
        "mix", "combine", "stir", "add", "serve", "prepare", "place", "put",
        "מערבב", "מערבבים", "מוסיף", "מוסיפים", "מגיש", "מגישים", "מכין", "מכינים",
        "מניח", "מניחים", "מסדר", "מסדרים",
    }
)

TECHNIQUE_MARKERS = (
    "until", "עד", "minute", "דק", "low heat", "אש", "medium heat", "bowl", "קערה",
    "pan", "מחבת", "oven", "תנור", "thin", "דק", "smooth", "חלק", "golden", "זהוב",
    "tender", "רך", "crisp", "פריך", "over", "במהלך", "while", "תוך",
)

SELF_SUFFICIENT_CANON = frozenset(
    {
        "egg", "eggs", "banana", "apple", "yogurt", "avocado", "strawberry",
        "strawberries", "orange", "pear", "peach", "cottage cheese", "cheese",
        "tuna", "bread", "toast", "rice", "pasta", "potato", "tomato",
        "ביצה", "ביצים", "יוגורט", "אבוקדו", "תפוח", "בננה",
    }
)

SPICE_ONLY_CANON = frozenset(
    {
        "salt", "pepper", "black pepper", "cinnamon", "vanilla", "nutmeg",
        "paprika", "cumin", "oregano", "basil", "thyme", "ginger",
        "מלח", "פלפל", "קינמון", "וניל", "ג׳ינג׳ר",
    }
)

SWEET_CANON = frozenset(
    {
        "sugar", "honey", "chocolate", "marshmallow", "marshmallows", "cookie",
        "cookies", "candy", "coconut", "cream", "butter", "flour", "milk",
        "סוכר", "דבש", "שוקולד", "מרשמלו", "קוקוס", "קמח", "חמאה",
    }
)

FRUIT_CANON = frozenset(
    {
        "strawberry", "strawberries", "blueberry", "blueberries", "apple", "banana",
        "orange", "lemon", "peach", "pear", "grape", "grapes", "mango", "pineapple",
        "תות", "תפוח", "בננה", "לימון", "אגס", "ענבים",
    }
)

SAVORY_MAIN_CANON = frozenset(
    {
        "chicken", "beef", "fish", "salmon", "tuna", "turkey", "lamb", "pork",
        "tofu", "pasta", "rice", "potato", "potatoes", "lentils", "chickpeas",
        "beans", "quinoa", "egg", "eggs", "cheese", "mushroom", "mushrooms",
        "broccoli", "spinach", "tomato", "tomatoes", "onion", "zucchini",
        "עוף", "בשר", "דג", "טונה", "טופו", "פסטה", "אורז", "תפוחי אדמה",
        "עדשים", "חומוס", "גבינה", "פטריות", "ברוקולי", "תרד", "עגבניות",
    }
)

MEAT_FISH_CANON = frozenset(
    {"chicken", "beef", "fish", "salmon", "tuna", "turkey", "lamb", "pork", "meat", "עוף", "בשר", "דג", "טונה"}
)

DESSERT_BASE_CANON = SWEET_CANON | FRUIT_CANON | frozenset({"egg", "eggs", "flour", "yogurt", "cream", "butter"})


def _ingredient_line_has_quantity(line: str) -> bool:
    text = str(line or "").strip()
    if not text:
        return False
    measured = parse_leading_measurement(text)
    if measured and measured.get("amount") is not None:
        unit = measured.get("unit") or "whole"
        return is_valid_quantified_display(text, unit)
    if re.match(r"^\d+(?:\s+\d+/\d+)?\s+\S", text):
        return True
    if re.match(r"^\d+/\d+\s+\S", text):
        return True
    if re.match(r"^(?:כפית|כפיות|כף|כפות|כוס|כוסות|גרם|מ\"?ל)\s+", text):
        return True
    return False


def _has_placeholder_text(text: str) -> bool:
    sample = str(text or "")
    return any(re.search(pattern, sample, re.I) for pattern in PLACEHOLDER_PATTERNS)


def _has_consecutive_duplicate_words(text: str) -> bool:
    words = re.findall(r"[\u0590-\u05FFa-z]+", str(text or "").lower())
    for idx in range(len(words) - 1):
        if words[idx] == words[idx + 1] and len(words[idx]) > 2:
            return True
    return False


def step_has_meaningful_action(step: str) -> bool:
    text = str(step or "").strip().lower()
    if len(text) < 12:
        return False

    has_any_action = any(action in text for action in COOKING_ACTIONS)
    if not has_any_action:
        return False

    strong = [action for action in COOKING_ACTIONS if action not in WEAK_ONLY_ACTIONS]
    if any(action in text for action in strong):
        return True

    if any(marker in text for marker in TECHNIQUE_MARKERS):
        return True

    return False


def _classify_canons(canons: list[str]) -> dict[str, bool]:
    canon_set = set(canons)
    return {
        "has_sweet": bool(canon_set & (SWEET_CANON | FRUIT_CANON)),
        "has_dessert_base": bool(canon_set & DESSERT_BASE_CANON),
        "has_savory_main": bool(canon_set & SAVORY_MAIN_CANON),
        "has_meat_fish": bool(canon_set & MEAT_FISH_CANON),
        "only_spices": bool(canon_set) and all(
            c in SPICE_ONLY_CANON or c in {"oil", "olive oil", "water"} for c in canon_set
        ),
        "self_sufficient": len(canon_set) == 1 and canon_set <= SELF_SUFFICIENT_CANON,
    }


def assess_ingredient_feasibility(
    user_ingredients_raw: str,
    *,
    recipe_type: str = "meal",
    category: str = "dairy",
    is_gluten_free: bool = False,
    language: str = "he",
) -> dict:
    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    is_he = language == "he"

    if not user_ingredients:
        return {
            "recipe_possible": True,
            "preference_based": True,
            "reason": "",
            "missing_ingredients": [],
        }

    canons = [
        canonical_ingredient(item) or normalize_ingredient(item)
        for item in user_ingredients
    ]
    profile = _classify_canons(canons)

    if profile["self_sufficient"]:
        return {"recipe_possible": True, "reason": "", "missing_ingredients": []}

    if profile["only_spices"]:
        missing = ["חלבונים או ירקות או פחמימות"] if is_he else ["protein, vegetables, or carbs"]
        return {
            "recipe_possible": False,
            "reason": (
                "מהמרכיבים שסיפקתם אי אפשר להכין מנה — חסרים מרכיבים מהותיים."
                if is_he
                else "These ingredients alone cannot make a dish — substantive ingredients are missing."
            ),
            "missing_ingredients": missing,
        }

    if recipe_type == "dessert":
        if profile["has_meat_fish"] and not profile["has_dessert_base"]:
            missing = (
                ["סוכר", "קמח", "ביצים", "חמאה"]
                if is_he
                else ["sugar", "flour", "eggs", "butter"]
            )
            return {
                "recipe_possible": False,
                "reason": (
                    "מהמרכיבים האלה לא ניתן להכין קינוח — חסרים מרכיבים מתוקים או בסיס לאפייה."
                    if is_he
                    else "These ingredients cannot make a dessert — sweet or baking basics are missing."
                ),
                "missing_ingredients": missing,
            }
        if not profile["has_dessert_base"]:
            missing = (
                ["סוכר", "דבש", "שוקולד", "קמח", "ביצים"]
                if is_he
                else ["sugar", "honey", "chocolate", "flour", "eggs"]
            )
            return {
                "recipe_possible": False,
                "reason": (
                    "מהמרכיבים שסיפקתם לא ניתן להכין קינוח משמעותי — חסרים מרכיבים מתוקים או בסיס."
                    if is_he
                    else "These ingredients cannot make a meaningful dessert — add sweet or baking ingredients."
                ),
                "missing_ingredients": missing,
            }

    if (recipe_type == "meal" or recipe_type == "soup_stew") and not profile["has_savory_main"]:
        if len(canons) <= 2 and not profile["has_sweet"]:
            missing = (
                ["חלבון", "פחמימה", "או ירק מרכזי"]
                if is_he
                else ["protein", "starch, or a main vegetable"]
            )
            return {
                "recipe_possible": False,
                "reason": (
                    "מהמרכיבים שסיפקתם לא ניתן להכין מנה מלאה — חסרים מרכיבים מרכזיים."
                    if is_he
                    else "These ingredients cannot make a full meal — main components are missing."
                ),
                "missing_ingredients": missing,
            }

    category_check = assess_category_fit(
        user_ingredients_raw,
        category=category,
        is_gluten_free=is_gluten_free,
        language=language,
    )
    if not category_check.get("category_ok", True):
        return {
            "recipe_possible": False,
            "reason": category_check.get("reason", ""),
            "missing_ingredients": list(category_check.get("missing_ingredients") or []),
            "suggested_category": category_check.get("suggested_category"),
        }

    return {"recipe_possible": True, "reason": "", "missing_ingredients": []}


def validate_recipe_before_return(
    recipe: dict,
    user_ingredients_raw: str = "",
    *,
    language: str = "he",
    recipe_type: str = "meal",
    category: str = "dairy",
) -> dict:
    """Run the full pre-return checklist. Returns ok + detailed failures."""
    ingredients = list(recipe.get("ingredients") or [])
    steps = list(recipe.get("steps") or [])
    steps_text = "\n".join(steps)
    failures: list[str] = []

    user_ingredients = parse_user_ingredients(user_ingredients_raw)
    unauthorized_ingredients = find_unauthorized_recipe_ingredients(recipe, user_ingredients_raw)
    if user_ingredients and unauthorized_ingredients:
        failures.append("unauthorized_ingredients")

    missing_quantities = [item for item in ingredients if not _ingredient_line_has_quantity(item)]
    if missing_quantities:
        failures.append("missing_quantities")

    unused_in_steps = [
        item
        for item in ingredients
        if not is_staple(item) and not ingredient_appears_in_text(item, steps_text)
    ]
    if unused_in_steps:
        failures.append("unused_ingredients")

    weak_steps = [step for step in steps if not step_has_meaningful_action(step)]
    if weak_steps:
        failures.append("weak_steps")

    placeholder_hits: list[str] = []
    for item in [*ingredients, *steps, recipe.get("name", ""), recipe.get("description", "")]:
        if _has_placeholder_text(str(item)):
            placeholder_hits.append(str(item))
    if placeholder_hits:
        failures.append("placeholder_text")

    duplicate_hits = [
        text
        for text in [*ingredients, *steps, recipe.get("name", ""), recipe.get("description", "")]
        if _has_consecutive_duplicate_words(str(text))
    ]
    if duplicate_hits:
        failures.append("duplicate_words")

    repeated_paren_steps = [step for step in steps if has_repeated_parenthetical_ingredients(step)]
    if repeated_paren_steps:
        failures.append("repeated_parenthetical_ingredients")

    if len(steps) < 4:
        failures.append("too_few_steps")

    if not ingredients:
        failures.append("no_ingredients")

    if user_ingredients:
        missing_user = [
            item
            for item in user_ingredients
            if not any(ingredients_match(line, item) for line in ingredients)
        ]
        if missing_user:
            failures.append("missing_user_ingredients")
        coherence = validate_recipe_coherence(
            user_ingredients,
            recipe,
            language=language,
            recipe_type=recipe_type,
            category=category,
        )
        for failure in coherence.get("failures") or []:
            if failure not in failures:
                failures.append(failure)

    ok = not failures
    return {
        "ok": ok,
        "failures": failures,
        "missing_quantities": missing_quantities,
        "unused_in_steps": unused_in_steps,
        "weak_steps": weak_steps,
        "placeholder_hits": placeholder_hits,
        "duplicate_hits": duplicate_hits,
        "unauthorized_ingredients": unauthorized_ingredients,
    }


def build_validation_failure_message(
    validation: dict,
    feasibility: dict | None = None,
    *,
    language: str = "he",
) -> tuple[str, list[str]]:
    is_he = language == "he"
    if feasibility and not feasibility.get("recipe_possible", True):
        return feasibility.get("reason", ""), list(feasibility.get("missing_ingredients") or [])

    failures = validation.get("failures") or []
    missing: list[str] = list(validation.get("missing_quantities") or [])

    if "missing_user_ingredients" in failures:
        return (
            "לא כל המרכיבים שהזנתם מופיעים במתכון — נסו ליצור מתכון שוב."
            if is_he
            else "Not all ingredients you entered appear in the recipe — please try generating again.",
        ), missing

    if "title_grounding" in failures or "generic_title" in failures or "not_real_dish" in failures:
        return (
            "שם המתכון לא נשמע כמו מנה מוכרת — נסו שוב."
            if is_he
            else "The recipe name does not sound like a familiar real dish — please try again.",
        ), missing

    if "unnatural_steps" in failures:
        return (
            "שלבי ההכנה לא ברורים מספיק — נסו שוב."
            if is_he
            else "The preparation steps are not clear enough — please try again.",
        ), missing

    if "unauthorized_ingredients" in failures:
        extras = list(validation.get("unauthorized_ingredients") or [])
        return (
            "המתכון כולל מרכיבים שלא סיפקתם — ניתן להשתמש רק במרכיבים שלכם ובמצרכי מזוון בסיסיים (מלח, פלפל, שמן, מים, תבלינים בסיסיים)."
            if is_he
            else "The recipe includes ingredients you did not provide — only your ingredients and basic pantry staples are allowed.",
        ), extras

    if "missing_quantities" in failures:
        msg = (
            "לכל מרכיב חייבת להיות כמות (למשל: 4 תותים, כף סוכר)."
            if is_he
            else "Every ingredient must include a quantity (e.g. 4 strawberries, 1 tbsp sugar)."
        )
        return msg, missing

    if "weak_steps" in failures:
        return (
            "שלבי ההכנה חייבים לכלול פעולות בישול אמיתיות — חיתוך, בישול, אפייה וכו'."
            if is_he
            else "Steps must include real cooking actions — chop, bake, boil, etc."
        ), missing

    if "unused_ingredients" in failures:
        return (
            "כל מרכיב ברשימה חייב להופיע בשלבי ההכנה."
            if is_he
            else "Every listed ingredient must appear in the preparation steps."
        ), missing

    if "placeholder_text" in failures:
        return (
            "המתכון מכיל טקסט placeholder — לא ניתן להציג אותו."
            if is_he
            else "The recipe contains placeholder text and cannot be shown."
        ), missing

    if "repeated_parenthetical_ingredients" in failures:
        return (
            "שלבי ההכנה מכילים מרכיבים כפולים בסוגריים — לא ניתן להציג את המתכון."
            if is_he
            else "Steps contain duplicated parenthetical ingredients and cannot be shown."
        ), missing

    if "duplicate_words" in failures:
        return (
            "המתכון מכיל מילים או ביטויים כפולים — לא ניתן להציג אותו."
            if is_he
            else "The recipe contains repeated words or phrases and cannot be shown."
        ), missing

    return (
        "המתכון לא עבר את בדיקות האיכות."
        if is_he
        else "The recipe did not pass quality checks."
    ), missing
