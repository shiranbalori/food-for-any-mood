"""Nutrition health score (0-100) from macros and ingredient analysis."""

from __future__ import annotations

import re

from ingredient_relevance import canonical_ingredient, normalize_ingredient

VEG_FRUIT_CANONICAL = {
    "tomato",
    "tomatoes",
    "potato",
    "carrot",
    "pepper",
    "spinach",
    "broccoli",
    "mushroom",
    "mushrooms",
    "zucchini",
    "cucumber",
    "avocado",
    "kale",
    "blueberry",
    "blueberries",
    "strawberry",
    "strawberries",
    "corn",
    "lemon",
    "lime",
    "apple",
    "banana",
    "onion",
    "garlic",
}

HIGH_FIBER_CANONICAL = {
    "broccoli",
    "lentils",
    "lentil",
    "chickpeas",
    "chickpea",
    "quinoa",
    "beans",
    "bean",
    "spinach",
    "kale",
    "oats",
}

ULTRA_PROCESSED_HIGH = {
    "marshmallow",
    "marshmallows",
    "candy",
    "candies",
    "chocolate bar",
    "cookies",
    "cookie",
    "chips",
    "nutella",
    "snack",
    "מרשמלו",
    "סוכריות",
    "חטיף",
    "עוגיות",
}

ULTRA_PROCESSED_MODERATE = {
    "sugar",
    "flour",
    "butter",
    "cream",
    "sweet spread",
    "processed",
    "סוכר",
    "קמח",
    "חמאה",
    "ממרח",
}

SUGAR_GRAMS_BY_CANON: dict[str, float] = {
    "sugar": 12.0,
    "honey": 17.0,
    "marshmallow": 18.0,
    "marshmallows": 18.0,
    "chocolate": 12.0,
    "cookies": 10.0,
    "cookie": 10.0,
    "candy": 15.0,
    "candies": 15.0,
}

FIBER_GRAMS_BY_CANON: dict[str, float] = {
    "broccoli": 2.5,
    "lentils": 8.0,
    "lentil": 8.0,
    "chickpeas": 6.0,
    "chickpea": 6.0,
    "quinoa": 3.0,
    "beans": 5.0,
    "bean": 5.0,
    "spinach": 2.0,
    "kale": 2.5,
    "carrot": 2.0,
    "blueberry": 2.0,
    "blueberries": 2.0,
    "strawberry": 2.0,
    "strawberries": 2.0,
    "avocado": 3.0,
    "oats": 4.0,
}


def _ingredient_text_hits(text: str, keywords: set[str]) -> int:
    normalized = normalize_ingredient(text)
    hits = 0
    for keyword in keywords:
        key = normalize_ingredient(keyword)
        if key and (key in normalized or normalized in key):
            hits += 1
    return hits


def _collect_canonicals(ingredients: list[str]) -> list[str]:
    canon_list: list[str] = []
    for item in ingredients or []:
        canon = canonical_ingredient(str(item))
        if canon:
            canon_list.append(canon)
        else:
            canon_list.append(normalize_ingredient(str(item)))
    return canon_list


def estimate_sugar_per_serving(ingredients: list[str], servings: int, carbs_per_serving: float = 0) -> float:
    servings = max(1, servings)
    total = 0.0

    for item in ingredients or []:
        canon = canonical_ingredient(str(item)) or ""
        text = normalize_ingredient(str(item))

        if canon in SUGAR_GRAMS_BY_CANON:
            total += SUGAR_GRAMS_BY_CANON[canon]
        elif "sugar" in text or "סוכר" in str(item):
            total += 12.0
        elif "honey" in text or "דבש" in str(item):
            total += 14.0
        elif "marshmallow" in text or "מרשמלו" in str(item):
            total += 18.0
        elif "chocolate" in text or "שוקולד" in str(item):
            total += 10.0

    estimated = total / servings
    if estimated <= 0 and carbs_per_serving >= 40:
        estimated = carbs_per_serving * 0.35
    return round(estimated, 1)


def estimate_fiber_per_serving(ingredients: list[str], servings: int) -> float:
    servings = max(1, servings)
    total = 0.0

    for item in ingredients or []:
        canon = canonical_ingredient(str(item)) or ""
        if canon in FIBER_GRAMS_BY_CANON:
            total += FIBER_GRAMS_BY_CANON[canon]
        elif _ingredient_text_hits(str(item), {"broccoli", "lentil", "chickpea", "quinoa", "spinach", "bean", "ברוקולי", "עדש", "חומוס", "קינוא", "תרד", "שעועית"}):
            total += 2.0
        elif _ingredient_text_hits(str(item), {"carrot", "tomato", "pepper", "cucumber", "zucchini", "גזר", "עגבנ", "פלפל", "מלפפון", "קישוא"}):
            total += 1.5

    return round(total / servings, 1)


def is_rich_in_vegetables_or_fruit(ingredients: list[str]) -> bool:
    canon_list = _collect_canonicals(ingredients)
    veg_fruit_hits = sum(
        1
        for canon in canon_list
        if canon in VEG_FRUIT_CANONICAL
        or any(token in canon for token in ("tomato", "carrot", "pepper", "berry", "apple", "banana", "onion"))
        or re.search(r"עגבנ|גזר|פלפל|תות|תפוח|בצל|ירק", canon)
    )
    return veg_fruit_hits >= 2


def detect_ultra_processed_level(ingredients: list[str]) -> str | None:
    high_hits = 0
    moderate_hits = 0

    for item in ingredients or []:
        text = str(item)
        canon = canonical_ingredient(text) or ""
        normalized = normalize_ingredient(text)

        if canon in ULTRA_PROCESSED_HIGH or _ingredient_text_hits(text, ULTRA_PROCESSED_HIGH):
            high_hits += 1
        if canon in ULTRA_PROCESSED_MODERATE or _ingredient_text_hits(text, ULTRA_PROCESSED_MODERATE):
            moderate_hits += 1
        if "marshmallow" in normalized or "מרשמלו" in text:
            high_hits += 2
        if re.search(r"חטיף|סוכריות|ממתק", text):
            high_hits += 1

    if high_hits >= 1:
        return "high"
    if moderate_hits >= 2:
        return "moderate"
    if moderate_hits == 1 and high_hits == 0:
        return "moderate"
    return None


LEGUME_CANONICAL = {
    "lentils",
    "lentil",
    "chickpeas",
    "chickpea",
    "beans",
    "bean",
    "peas",
    "pea",
}

REFINED_CARB_CANONICAL = {"pasta", "flour", "rice", "bread", "noodles"}

REFINED_CARB_KEYWORDS = {
    "pasta",
    "noodle",
    "spaghetti",
    "macaroni",
    "penne",
    "fusilli",
    "fettuccine",
    "white rice",
    "bread",
    "bun",
    "breadcrumbs",
    "crouton",
    "פסטה",
    "אטריות",
    "ספגטי",
    "קמח",
    "אורז",
    "לחם",
    "פתיתים",
}

AROMATIC_ONLY = {"onion", "garlic"}

HEALTH_SCORE_BASE = 50


def has_legumes(ingredients: list[str]) -> bool:
    for item in ingredients or []:
        canon = canonical_ingredient(str(item)) or ""
        if canon in LEGUME_CANONICAL:
            return True
        if re.search(r"lentil|chickpea|bean|hummus|עדש|חומוס|שעועית|אפונה", str(item), re.I):
            return True
    return False


def has_any_vegetable(ingredients: list[str]) -> bool:
    spice_pattern = re.compile(
        r"black pepper|peppercorn|פלפל שחור|מלח|salt|cinnamon|כמון|cumin|spice|תבלין|paprika|כורכום|turmeric|oregano|garlic powder",
        re.I,
    )
    for item in ingredients or []:
        text = str(item)
        if spice_pattern.search(text):
            continue
        canon = canonical_ingredient(text) or normalize_ingredient(text)
        if canon == "black pepper" or canon in AROMATIC_ONLY:
            continue
        if (
            canon in VEG_FRUIT_CANONICAL
            or re.search(
                r"tomato|carrot|pepper|berry|apple|banana|spinach|broccoli|zucchini|cucumber|avocado|kale|corn|"
                r"עגבנ|גזר|פלפל|תות|תפוח|תרד|ברוקולי|קישוא|מלפפון|אבוקדו|ירק",
                canon,
            )
        ):
            return True
    return False


def detect_refined_carb_level(ingredients: list[str]) -> str | None:
    hits = 0
    for item in ingredients or []:
        text = str(item)
        canon = canonical_ingredient(text) or ""
        if canon in REFINED_CARB_CANONICAL:
            hits += 1
        elif _ingredient_text_hits(text, REFINED_CARB_KEYWORDS):
            hits += 1
    if hits >= 2:
        return "high"
    if hits == 1:
        return "moderate"
    return None


def _score_calories_contribution(calories_per_serving: float) -> int:
    if calories_per_serving <= 300:
        return 10
    if calories_per_serving <= 450:
        return 4
    if calories_per_serving <= 550:
        return 0
    if calories_per_serving <= 650:
        return -10
    if calories_per_serving <= 800:
        return -18
    return -28


def _score_protein_contribution(protein_per_serving: float) -> int:
    if protein_per_serving >= 28:
        return 12
    if protein_per_serving >= 22:
        return 8
    if protein_per_serving >= 15:
        return 4
    if protein_per_serving >= 8:
        return 0
    return -8


def _score_carbs_contribution(
    carbs_per_serving: float,
    sugar_per_serving: float,
    refined_carb_level: str | None,
) -> int:
    if carbs_per_serving <= 25:
        contribution = 4
    elif carbs_per_serving <= 35:
        contribution = 0
    elif carbs_per_serving <= 50:
        contribution = -8
    elif carbs_per_serving <= 65:
        contribution = -16
    elif carbs_per_serving <= 80:
        contribution = -22
    else:
        contribution = -30

    if sugar_per_serving > 30:
        contribution -= 8
    elif sugar_per_serving > 20:
        contribution -= 4
    elif sugar_per_serving > 15:
        contribution -= 2

    if refined_carb_level == "high":
        contribution -= 12
    elif refined_carb_level == "moderate":
        contribution -= 6

    return contribution


def _score_fat_contribution(fat_per_serving: float) -> int:
    if fat_per_serving >= 38:
        return -18
    if fat_per_serving >= 29:
        return -12
    if fat_per_serving >= 21:
        return -6
    if fat_per_serving <= 12:
        return 2
    return 0


def _score_vegetable_contribution(ingredients: list[str]) -> int:
    if is_rich_in_vegetables_or_fruit(ingredients):
        return 10
    if has_legumes(ingredients):
        return 8
    if has_any_vegetable(ingredients):
        return 4
    return -10


def _score_fiber_contribution(fiber_per_serving: float) -> int:
    if fiber_per_serving >= 6:
        return 10
    if fiber_per_serving >= 4:
        return 6
    if fiber_per_serving >= 2:
        return 2
    return -8


INDULGENT_DESSERT_KEYWORDS = (
    "marshmallow",
    "marshmallows",
    "pudding",
    "cookie",
    "cookies",
    "candy",
    "cream",
    "sugar",
    "honey",
    "chocolate",
    "nutella",
    "frosting",
    "syrup",
    "caramel",
    "מרשמלו",
    "פuding",
    "פודינג",
    "עוג",
    "סוכר",
    "דבש",
    "שוקולד",
    "שמנת",
    "סוכריות",
    "ממתק",
    "קרם",
    "קינוח",
)

DESSERT_NAME_PATTERN = re.compile(
    r"pudding|dessert|cookie|cake|mousse|parfait|panna|cotta|treat|sweet|fudge|"
    r"קינוח|פuding|פודינג|עוג|מוס|קרם|מרשמלו|מתוק",
    re.I,
)


def _count_sweet_dessert_signals(text: str) -> int:
    lower = text.lower()
    return sum(1 for keyword in INDULGENT_DESSERT_KEYWORDS if keyword in lower)


def analyze_dessert_nutrition_profile(
    *,
    ingredients: list[str] | None = None,
    name: str = "",
    recipe_type: str | None = None,
    calories_per_serving: float = 0,
    protein_per_serving: float = 0,
    sugar_per_serving: float = 0,
    carbs_per_serving: float = 0,
    ultra_processed_level: str | None = None,
) -> dict[str, bool]:
    text = f"{name or ''} {' '.join(ingredients or [])}".lower()
    ultra_level = ultra_processed_level or detect_ultra_processed_level(ingredients or [])
    sweet_signals = _count_sweet_dessert_signals(text)

    is_dessert = (
        recipe_type == "dessert"
        or bool(DESSERT_NAME_PATTERN.search(text))
        or sweet_signals >= 2
    )
    has_indulgent_ingredient = sweet_signals >= 1 or ultra_level == "high"
    is_indulgent = is_dessert and (
        has_indulgent_ingredient
        or calories_per_serving > 400
        or sugar_per_serving > 20
        or carbs_per_serving >= 50
        or ultra_level == "high"
    )
    is_light_balanced = (
        is_dessert
        and calories_per_serving <= 300
        and sugar_per_serving <= 15
        and protein_per_serving >= 4
        and carbs_per_serving < 45
        and ultra_level != "high"
    )
    return {
        "isDessert": is_dessert,
        "isIndulgent": is_indulgent,
        "isLightBalanced": is_light_balanced,
    }


def apply_dessert_nutrition_cap(score: int | float, profile: dict[str, bool]) -> int:
    if not profile.get("isDessert"):
        return int(max(0, min(100, round(float(score)))))

    capped = float(score)
    if profile.get("isIndulgent") and not profile.get("isLightBalanced"):
        capped = min(capped, 70)
    elif not profile.get("isLightBalanced"):
        capped = min(capped, 80)
    else:
        capped = min(capped, 85)

    return int(max(0, min(100, round(capped))))


def calculate_nutrition_score(
    *,
    calories_per_serving: float,
    protein_per_serving: float,
    sugar_per_serving: float,
    fiber_per_serving: float,
    rich_in_veg_fruit: bool = False,
    ultra_processed_level: str | None = None,
    carbs_per_serving: float = 0,
    fat_per_serving: float = 0,
    ingredients: list[str] | None = None,
) -> int:
    """Contribution-based score from per-serving values. Clamped 0-100."""
    _ = rich_in_veg_fruit
    refined_carb_level = detect_refined_carb_level(ingredients or [])
    raw_score = (
        HEALTH_SCORE_BASE
        + _score_calories_contribution(calories_per_serving)
        + _score_protein_contribution(protein_per_serving)
        + _score_carbs_contribution(carbs_per_serving, sugar_per_serving, refined_carb_level)
        + _score_fat_contribution(fat_per_serving)
        + _score_vegetable_contribution(ingredients or [])
        + _score_fiber_contribution(fiber_per_serving)
    )

    if ultra_processed_level == "high":
        raw_score -= 10
    elif ultra_processed_level == "moderate":
        raw_score -= 5

    return int(max(0, min(100, round(raw_score))))


def calculate_health_score_detailed(
    *,
    ingredients: list[str],
    calories: int,
    protein: int,
    carbs: int,
    fat: int = 0,
    servings: int,
    recipe_type: str | None = None,
    name: str = "",
    language: str = "he",
) -> dict:
    servings = max(1, servings)
    calories_per = calories / servings
    protein_per = protein / servings
    carbs_per = carbs / servings
    fat_per = fat / servings
    sugar_per = estimate_sugar_per_serving(ingredients, servings, carbs_per)
    fiber_per = estimate_fiber_per_serving(ingredients, servings)
    ultra_level = detect_ultra_processed_level(ingredients)
    refined_carb_level = detect_refined_carb_level(ingredients)
    rich_in_veg_fruit = is_rich_in_vegetables_or_fruit(ingredients)

    calories_contribution = _score_calories_contribution(calories_per)
    protein_contribution = _score_protein_contribution(protein_per)
    carbs_contribution = _score_carbs_contribution(carbs_per, sugar_per, refined_carb_level)
    fat_contribution = _score_fat_contribution(fat_per)
    vegetable_contribution = _score_vegetable_contribution(ingredients)
    fiber_contribution = _score_fiber_contribution(fiber_per)

    raw_score = (
        HEALTH_SCORE_BASE
        + calories_contribution
        + protein_contribution
        + carbs_contribution
        + fat_contribution
        + vegetable_contribution
        + fiber_contribution
    )

    if ultra_level == "high":
        raw_score -= 10
    elif ultra_level == "moderate":
        raw_score -= 5

    if protein_per >= 15 and rich_in_veg_fruit and calories_per <= 500 and carbs_per <= 45:
        raw_score += 5

    profile = analyze_dessert_nutrition_profile(
        ingredients=ingredients,
        name=name,
        recipe_type=recipe_type,
        calories_per_serving=calories_per,
        protein_per_serving=protein_per,
        sugar_per_serving=sugar_per,
        carbs_per_serving=carbs_per,
        ultra_processed_level=ultra_level,
    )

    score_before_cap = int(round(raw_score))
    score = apply_dessert_nutrition_cap(score_before_cap, profile)
    classification = get_nutrition_score_classification(score)

    health_score_breakdown = {
        "calories": calories_contribution,
        "protein": protein_contribution,
        "carbs": carbs_contribution,
        "fat": fat_contribution,
        "vegetable": vegetable_contribution,
        "fiber": fiber_contribution,
        "perServing": {
            "calories": round(calories_per),
            "protein": round(protein_per, 1),
            "carbs": round(carbs_per, 1),
            "fat": round(fat_per, 1),
            "sugar": sugar_per,
            "fiber": fiber_per,
        },
        "baseScore": HEALTH_SCORE_BASE,
        "ultraProcessedPenalty": -10 if ultra_level == "high" else -5 if ultra_level == "moderate" else 0,
        "dessertCapApplied": score != score_before_cap,
        "finalScore": score,
        "classification": classification["id"],
    }

    explanation = build_nutrition_score_explanation(
        score=score,
        ingredients=ingredients,
        calories=calories,
        protein=protein,
        carbs=carbs,
        servings=servings,
        language=language,
    )

    print("[nutritionScore] healthScoreBreakdown", health_score_breakdown, "explanation", explanation)

    return {
        "score": score,
        "healthScoreBreakdown": health_score_breakdown,
        "explanation": explanation,
        "classification": classification,
    }


def calculate_health_score_from_recipe(
    *,
    ingredients: list[str],
    calories: int,
    protein: int,
    carbs: int,
    fat: int = 0,
    servings: int,
    recipe_type: str | None = None,
    name: str = "",
    language: str = "he",
) -> int:
    return calculate_health_score_detailed(
        ingredients=ingredients,
        calories=calories,
        protein=protein,
        carbs=carbs,
        fat=fat,
        servings=servings,
        recipe_type=recipe_type,
        name=name,
        language=language,
    )["score"]


NUTRITION_SCORE_CLASSIFICATIONS: list[dict[str, int | str]] = [
    {"id": "dietFriendly", "min": 90, "max": 100},
    {"id": "balancedHealthy", "min": 75, "max": 89},
    {"id": "moderatelyBalanced", "min": 60, "max": 74},
    {"id": "moderateTreat", "min": 40, "max": 59},
    {"id": "indulgent", "min": 0, "max": 39},
]


def get_nutrition_score_classification(score: int | float) -> dict[str, int | str]:
    safe = int(max(0, min(100, round(float(score or 0)))))
    for band in NUTRITION_SCORE_CLASSIFICATIONS:
        if safe >= band["min"] and safe <= band["max"]:
            return band
    return NUTRITION_SCORE_CLASSIFICATIONS[-1]


NOTABLE_INGREDIENT_PATTERNS: list[tuple[re.Pattern[str], str, str]] = [
    (re.compile(r"סוכר|sugar", re.I), "סוכר", "sugar"),
    (re.compile(r"מרשמלו|marshmallow", re.I), "מרשמלו", "marshmallows"),
    (re.compile(r"שוקולד|chocolate", re.I), "שוקולד", "chocolate"),
    (re.compile(r"דבש|honey", re.I), "דבש", "honey"),
    (re.compile(r"חמאה|butter", re.I), "חמאה", "butter"),
    (re.compile(r"קמח|flour", re.I), "קמח", "flour"),
    (re.compile(r"עוגיות|cookies?", re.I), "עוגיות", "cookies"),
    (re.compile(r"חטיף|snack|chips", re.I), "חטיף", "snack food"),
    (re.compile(r"קוקוס|coconut", re.I), "קוקוס", "coconut"),
    (re.compile(r"שמנת|cream", re.I), "שמנת", "cream"),
]


def _extract_notable_ingredient_names(ingredients: list[str], language: str = "he") -> list[str]:
    names: list[str] = []
    for item in ingredients or []:
        text = str(item)
        for pattern, he_label, en_label in NOTABLE_INGREDIENT_PATTERNS:
            if not pattern.search(text):
                continue
            label = he_label if language == "he" else en_label
            if label not in names:
                names.append(label)
    return names


def _join_hebrew_clauses(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} ו{items[1]}"
    return f"{', '.join(items[:-1])} ו{items[-1]}"


def _join_english_clauses(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])}, and {items[-1]}"


def _select_explanation_factors(factors: list[dict], score: int) -> list[dict]:
    sorted_factors = sorted(factors, key=lambda item: item["weight"], reverse=True)
    neg = [item for item in sorted_factors if item["type"] == "neg"]
    neu = [item for item in sorted_factors if item["type"] == "neutral"]
    pos = [item for item in sorted_factors if item["type"] == "pos"]

    if score >= 85:
        picked = [*pos[:2], *neu[:1]]
    elif score >= 70:
        picked = [*neu[:1], *pos[:1], *neg[:1]]
    elif score >= 55:
        picked = [*neu[:1], *neg[:2]]
    else:
        picked = neg[:3]

    if len(picked) < 2:
        seen = set(id(item) for item in picked)
        for factor in sorted_factors:
            if len(picked) >= 3:
                break
            if id(factor) not in seen:
                picked.append(factor)
                seen.add(id(factor))

    return picked[:3]


def _compose_score_explanation(score: int, items: list[dict], language: str = "he") -> str:
    if not items:
        return f"המתכון קיבל ציון {score}." if language == "he" else f"This recipe scored {score}/100."

    texts = [item["text"] for item in items]

    if language == "he":
        if len(texts) == 1:
            return f"המתכון קיבל ציון {score} משום שהוא מכיל {texts[0]}."
        first_type = items[0]["type"]
        has_contrast = any(
            (first_type in {"pos", "neutral"}) and item["type"] == "neg"
            for item in items[1:]
        )
        rest = _join_hebrew_clauses(texts[1:])
        if has_contrast:
            return f"המתכון קיבל ציון {score} משום שהוא מכיל {texts[0]} אך גם {rest}."
        return f"המתכון קיבל ציון {score} משום שהוא מכיל {texts[0]} ו{rest}."

    if len(texts) == 1:
        return f"This recipe scored {score}/100 because it contains {texts[0]}."
    first_type = items[0]["type"]
    has_contrast = any(
        (first_type in {"pos", "neutral"}) and item["type"] == "neg"
        for item in items[1:]
    )
    rest = _join_english_clauses(texts[1:])
    if has_contrast:
        return f"This recipe scored {score}/100 because it has {texts[0]}, but also {rest}."
    return f"This recipe scored {score}/100 because it has {texts[0]} and {rest}."


def build_nutrition_score_explanation(
    *,
    score: int | float,
    ingredients: list[str],
    calories: int,
    protein: int,
    carbs: int,
    servings: int,
    language: str = "he",
) -> str:
    safe_score = int(max(0, min(100, round(float(score or 0)))))
    servings = max(1, servings)
    calories_per = calories / servings
    protein_per = protein / servings
    carbs_per = carbs / servings
    sugar_per = estimate_sugar_per_serving(ingredients, servings, carbs_per)
    fiber_per = estimate_fiber_per_serving(ingredients, servings)
    rich_in_veg_fruit = is_rich_in_vegetables_or_fruit(ingredients)
    ultra_level = detect_ultra_processed_level(ingredients)
    is_he = language == "he"
    factors: list[dict] = []

    if calories_per < 250:
        factors.append({"weight": 3, "type": "pos", "text": "כמות נמוכה של קלוריות למנה" if is_he else "a low calorie count per serving"})
    elif calories_per <= 450:
        factors.append({"weight": 2, "type": "neutral", "text": "כמות בינונית של קלוריות" if is_he else "a moderate calorie count"})
    elif calories_per <= 650:
        factors.append({"weight": 3, "type": "neg", "text": "כמות גבוהה יחסית של קלוריות למנה" if is_he else "a relatively high calorie count per serving"})
    else:
        factors.append({"weight": 4, "type": "neg", "text": "כמות קלוריות גבוהה למנה" if is_he else "a high calorie count per serving"})

    if protein_per > 20:
        factors.append({"weight": 4, "type": "pos", "text": "תוכן חלבון גבוה" if is_he else "high protein content"})
    elif protein_per >= 10:
        factors.append({"weight": 2, "type": "neutral", "text": "תוכן חלבון בינוני" if is_he else "moderate protein content"})
    else:
        factors.append({"weight": 3, "type": "neg", "text": "תוכן חלבון נמוך" if is_he else "low protein content"})

    if sugar_per < 10:
        factors.append({"weight": 3, "type": "pos", "text": "כמות נמוכה של סוכר" if is_he else "low sugar content"})
    elif sugar_per <= 20:
        factors.append({"weight": 2, "type": "neutral", "text": "כמות בינונית של סוכר" if is_he else "moderate sugar content"})
    elif sugar_per <= 35:
        factors.append({"weight": 4, "type": "neg", "text": "ריכוז גבוה יחסית של סוכר" if is_he else "a relatively high sugar concentration"})
    else:
        factors.append({"weight": 5, "type": "neg", "text": "ריכוז גבוה מאוד של סוכר" if is_he else "a very high sugar concentration"})

    if carbs_per >= 50:
        factors.append({"weight": 4, "type": "neg", "text": "ריכוז גבוה של פחמימות" if is_he else "a high carbohydrate concentration"})
    elif carbs_per >= 35:
        factors.append({"weight": 3, "type": "neg", "text": "כמות בינונית-גבוהה של פחמימות" if is_he else "moderately high carbohydrates"})
    elif carbs_per >= 25:
        factors.append({"weight": 2, "type": "neutral", "text": "כמות בינונית של פחמימות" if is_he else "moderate carbohydrates"})
    elif carbs_per < 15:
        factors.append({"weight": 2, "type": "pos", "text": "כמות נמוכה של פחמימות" if is_he else "low carbohydrates"})

    if fiber_per >= 4 or rich_in_veg_fruit:
        factors.append({"weight": 4, "type": "pos", "text": "עשיר בירקות, פירות או קטניות" if is_he else "rich in vegetables, fruit, or legumes"})
    elif fiber_per >= 2:
        factors.append({"weight": 2, "type": "pos", "text": "מכיל מקורות לסיבים תזונתיים" if is_he else "sources of dietary fiber"})
    elif not has_any_vegetable(ingredients) and not has_legumes(ingredients):
        factors.append({"weight": 4, "type": "neg", "text": "מעט ירקות, פירות או קטניות" if is_he else "few vegetables, fruit, or legumes"})

    if detect_refined_carb_level(ingredients) == "high" and carbs_per >= 45:
        factors.append(
            {
                "weight": 4,
                "type": "neg",
                "text": "דומיננטיות של פחמימות מעובדות" if is_he else "a dominance of refined carbohydrates",
            }
        )

    notable_names = _extract_notable_ingredient_names(ingredients, language)
    if ultra_level == "high" and notable_names:
        names = _join_hebrew_clauses(notable_names[:3]) if is_he else _join_english_clauses(notable_names[:3])
        factors.append(
            {
                "weight": 5,
                "type": "neg",
                "text": f"מרכיבים מעובדים כמו {names}" if is_he else f"processed ingredients such as {names}",
            }
        )
    elif ultra_level == "moderate" and notable_names:
        names = _join_hebrew_clauses(notable_names[:2]) if is_he else _join_english_clauses(notable_names[:2])
        factors.append(
            {
                "weight": 3,
                "type": "neg",
                "text": f"מרכיבים כמו {names}" if is_he else f"ingredients such as {names}",
            }
        )

    selected = _select_explanation_factors(factors, safe_score)
    return _compose_score_explanation(safe_score, selected, language)
