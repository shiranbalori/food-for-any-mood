"""Kosher category definitions — shared prompt text for recipe generation."""

from __future__ import annotations

# Canonical definitions (Hebrew) used in Gemini prompts
KOSHER_CATEGORY_DEFINITIONS_HE = """
הגדרות קטגוריות (חובה):
- חלבי: מכיל מוצרי חלב — חלב, גבינה, יוגורט, שמנת, חמאה. אסור: בשר, עוף, הודו, דג או מוצרי בשר אחרים.
- בשרי: מכיל בשר, עוף, הודו, דג או מוצרי בשר. אסור: חלב, גבינה, יוגורט, שמנת, חמאה.
- פרווה: ללא חלב וללא בשר. אסור במפורש: חלב, גבינה, יוגורט, שמנת, חמאה, בשר, עוף, הודו, דג.
  דוגמאות למנות פרווה: ירקות, אורז, קטניות, סלטים, מנות על בסיס פירות.
- טבעוני: ללא בשר, חלב, ביצים, דבש או מוצרים מן החי (כולל ג'לטין). מותרים: ירקות, קטניות, אורז, פירות, קטניות, שמנים צמחיים.
"""

KOSHER_CATEGORY_ANY_HE = """
ללא העדפה:
- המשתמש/ת לא בחר/ה חלבי, בשרי או פרווה.
- בחר/י את המנה המתאימה ביותר למרכיבים, מצב הרוח, זמן ההכנה ומספר המנות.
- המערכת תקבע אוטומטית את הקטגוריה הסופית (חלבי / בשרי / פרווה) לפי המרכיבים במתכון בפועל.
"""

KOSHER_CATEGORY_DEFINITIONS_EN = """
Category definitions (mandatory):
- Dairy: contains dairy — milk, cheese, yogurt, cream, butter. No meat, chicken, turkey, fish, or other meat products.
- Meat: contains meat, chicken, turkey, fish, or other meat products. No milk, cheese, yogurt, cream, or butter.
- Parve: contains neither dairy nor meat. Must NOT include: milk, cheese, yogurt, cream, butter, meat, chicken, turkey, fish.
  Examples: vegetable dishes, rice, legumes, salads, fruit-based recipes.
- Vegan: no meat, dairy, eggs, honey, or animal products (including gelatin). Allowed: vegetables, legumes, rice, fruits, plant oils.
"""

KOSHER_CATEGORY_ANY_EN = """
No preference:
- The user did not choose dairy, meat, or parve.
- Pick the best dish for the ingredients, mood, cooking time, and servings.
- The system will automatically set the final category (dairy / meat / parve) from the ingredients in the recipe.
"""


def build_kosher_rules_he(*, category: str, category_label: str) -> str:
    if category == "any":
        return f"""
כללי כשרות — ללא העדפה:
{KOSHER_CATEGORY_ANY_HE.strip()}
{KOSHER_CATEGORY_DEFINITIONS_HE.strip()}
"""
    return f"""
כללי כשרות (חובה — קטגוריה שנבחרה: {category_label} / {category}):
{KOSHER_CATEGORY_DEFINITIONS_HE.strip()}
- הקטגוריה ({category_label}) היא דרישת פלט — המתכון הסופי חייב להתאים אליה.
- המשתמש/ת לא חייב/ת להזין מרכיבים מסוג הקטגוריה — בנה/י מהמרכיבים שהוזנו והוסף/י מרכיבי מזוון סבירים לפי הצורך.
- חלבי: אם חסרים מוצרי חלב — הוסף/י גבינה, חלב, חמאה או שמנת (מרכיב מזווה בסיסי).
- בשרי: אם חסר בשר/עוף/דג — הוסף/י עוף, בשר או דג מתאים (מרכיב מזווה בסיסי).
- פרווה/טבעוני: המתכון חייב להישאר ללא המוצרים האסורים בקטגוריה.
- חסימת קלט רק בסתירות קשות (טבעוני+מוצרים מהחי, בשר+חלב יחד) — לא כי חסר מרכיב מסוג הקטגוריה.
"""


def build_kosher_rules_en(*, category: str, category_label: str) -> str:
    if category == "any":
        return f"""
KOSHER RULES — no preference:
{KOSHER_CATEGORY_ANY_EN.strip()}
{KOSHER_CATEGORY_DEFINITIONS_EN.strip()}
"""
    return f"""
KOSHER RULES (mandatory — selected category: {category_label} / {category}):
{KOSHER_CATEGORY_DEFINITIONS_EN.strip()}
- The selected category ({category_label}) is an OUTPUT requirement — the final recipe must match it.
- Users do NOT need to enter ingredients from that category — build from what they listed and add reasonable pantry staples as needed.
- Dairy: if dairy is missing, add cheese, milk, butter, or cream as needed.
- Meat: if meat/fish/poultry is missing, add chicken, beef, or fish as appropriate.
- Parve/vegan: the dish must stay free of forbidden products for that category.
- Block input only on hard conflicts (vegan + animal products, meat + dairy together) — not because category-type ingredients are missing.
"""
