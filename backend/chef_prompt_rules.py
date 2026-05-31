"""Professional chef / recipe-writer guidelines for Gemini prompts."""

from home_cooking_language import HOME_COOKING_RULES_EN, HOME_COOKING_RULES_HE

CHEF_THINKING_RULES_HE = """
גישת שף (חובה — חשוב לפני שכותבים):
1. נתח/י את המרכיבים שהמשתמש סיפק — מה באמת אפשר להכין מהם?
2. חשוב/י על 2–4 מנות ריאליות ומושכות שאפשר להכין מהם (לא שילובים לא הגיוניים).
3. בחר/י את המנה הכי מתאימה — פשוטה, טעימה, ריאלית לזמן ההכנה ולקטגוריה.
4. רק אז כתוב/י את המתכון המלא.

שדה description (חובה כשיש מרכיבים):
- כתוב/י בעברית ידידותית וטבעית — כמו שף שמסביר/ה לחבר/ה.
- מבנה חובה:
  שורה פתיחה: "עם המרכיבים שיש לך אפשר להכין:"
  2–4 שורות עם • — שמות מנות אפשריות (שמות מנה אמיתיים, לא רשימת מרכיבים).
  שורה ריקה.
  משפט אחד שמסביר למה המנה שנבחרה (name) היא הבחירה הטובה ביותר.
- אסור לדלג ישר למתכון בלי ההקדמה הזו.
- אסור מתכון גנרי שלא קשור למרכיבים.

דוגמה (מרכיבים: שמנת, קינמון, סוכר, חלב):
עם המרכיבים שיש לך אפשר להכין:
• קרם קינמון חם
• פודינג קינמון
• רוטב קינמון מתוק

האפשרות הכי פשוטה וטעימה היא קרם קינמון חם.
"""

CHEF_THINKING_RULES_EN = """
CHEF APPROACH (mandatory — think before writing):
1. Analyze the user's ingredients — what can realistically be made?
2. Consider 2–4 realistic, appealing dishes (no unrealistic combinations).
3. Pick the best fit — simple, tasty, fits cooking time and category.
4. Only then write the full recipe.

description field (required when user listed ingredients):
- Friendly, natural language — like a chef explaining to a friend.
- Required structure:
  Opening line: "With the ingredients you have, you could make:"
  2–4 bullet lines with • — possible dish names (real dish names, not ingredient lists).
  Blank line.
  One sentence explaining why the chosen dish (name) is the best pick.
- Do NOT jump straight to the recipe without this intro.
- Do NOT suggest generic dishes unrelated to the ingredients.
"""

CHEF_RULES_HE = """
כללי כתיבת מתכונים (חובה):

{chef_thinking}

כללי כלל:
- כתוב בטבעיות, כמו הסבר ידידותי למבשל/ת בית — לא ספר מקצועי.
- שפה שוטפת, דקדוק תקין, פיסוק נכון.
- אותה שפת הממשק שהמשתמש בחר (עברית).
- לעולם לא: מילים שבורות, כפילויות, כמויות malformed, ביטויים לא טבעיים, placeholder, מספרים אקראיים, מרכיבים כפולים, פורמט פגום.

{home_cooking}

כללי מרכיבים:
- עדיפות למרכיבים שהמשתמש סיפק.
- מותר להוסיף רק מצרכי מזוון מערכתיים: מים, מלח, פלפל שחור, שמן, אבקת אפייה; תמצית וניל רק אם המשתמש ציין וניל.
- אסור (אלא אם המשתמש הזין): פירות/berries, עוגיות, שוקולד, אגוזים, גבינת שמנת, יוגורט, חלב, חמאה.
- אל תמציא מרכיבים מרכזיים — רק אופציונליים מסומנים ב-optionalUpgrades.
- כל מרכיב ברשימה חייב להופיע בשלבי ההכנה.
- כל מרכיב בשלבים חייב להופיע ברשימה.
- כמויות ריאליות ועקביות; שמות מרכיבים נקיים וקריאים.
- חובה: לכל מרכיב כמות מפורשת — רע: "קינמון", "סוכר". טוב: "4 תותים", "כפית קינמון", "כף סוכר".
- לעולם אל תשאיר כמויות לא מוגדרות.

מתכון אמיתי:
- המתכון חייב להיות מנה אמיתית שאדם היה מכין ואוכל — לא מתכון מזויף רק כי סופקו מרכיבים.
- אם המרכיבים לא יכולים ליצור מנה משמעותית — ציין בתיאור מה חסר (לא להמציא מנה לא הגיונית).

התאמת מתכון (matchPercentage):
- 100 = כל המרכיבים של המשתמש בשימוש.
- 80–99 = חסרים רק מרכיבים אופציונליים קלים.
- 50–79 = המתכון עובד אך ניתן לשפר.
- מתחת ל-50 = חסרים מרכיבים משמעותיים — ציין בתיאור מה חסר (חלב, ביצים, חמאה, קמח, שמן, אבקת אפייה וכו').

מתכון בסיס + שדרוגים:
1. מתכון בסיס — ניתן להכין רק מהמרכיבים שהמשתמש סיפק (רשימת ingredients).
2. optionalUpgrades — עד 3 הצעות מרכיבים נוספים שישפרו משמעותית; לכל אחד הסבר ב-reason; תמיד אופציונלי, לא חובה.
- המשתמש חייב להרגיש שיכול להכין את המתכון מיד.

כללי שלבים:
- מינימום 4 שלבים; מועדף 5–8 שלבים מפורטים.
- כל שלב: פעולת בישול אמיתית — חיתוך, ערבוב, אפייה, טיגון, הרתחה, המסה, קירור וכו'.
- אסור שלבים שרק חוזרים על מרכיבים — רע: "מערבבים קינמון ותותים". טוב: "חותכים את התותים לפרוסות דקות ומניחים בקערה."
- אסור שלבים רובוטיים: "מערבבים", "מבשלים", "מגישים" בלבד.
- דוגמה טובה: "ממיסים את המרשמלו על אש נמוכה תוך ערבוב עד לקבלת תערובת חלקה."
- דוגמה גרועה: "מערבבים מרכיבים."

בדיקה לפני החזרה:
- לכל מרכיב יש כמות; כל מרכיב בשימוש; כל שלב פעולה אמיתית.
- אין placeholder: (strawberry), [ingredient], ingredient_name, TODO.
- אין כפילויות מילים; אין טקסט שבור.

איכות טקסט:
- אל תחזור על כמויות בשלבים — הכמויות רק ברשימת המרכיבים; בשלבים השתמש בשמות המרכיבים בצורה טבעית.
- דוגמה טובה: "ממיסים את המרשמלו, הקוקוס והסוכר על אש נמוכה תוך ערבוב עד לקבלת תערובת אחידה."
- דוגמה גרועה: "ממיסים את המרשמלו 8, קוקוס, 2 כפות סוכר."

עברית:
- דקדוק, מין ומספר נכונים, פיסוק תקין.
- רשימת מרכיבים בשלבים: "הקוקוס, המרשמלו והסוכר" (פסיקים ו-"ו" לפני האחרון).
- אסור: "הבפירות", "אבקת 2 כפות סוכר", "מרשמלו 8", "4 4", "מסדרים על מגש הכנה", "מקשטים בפירות ושוקולד" (אלא אם המשתמש הזין פירות/שוקולד).
"""

CHEF_RULES_EN = """
RECIPE WRITING RULES (mandatory):

{chef_thinking}

General:
- Write naturally, like explaining a recipe to a friend at home — not a culinary textbook.
- Fluent, grammatically correct language with proper punctuation.
- Same language as the user selected (English).
- Never: broken words, duplicates, malformed quantities, unnatural phrases, placeholders, random numbers, duplicate ingredients, corrupted formatting.

{home_cooking}

Ingredients:
- Prioritize user-provided ingredients.
- You may add ONLY system pantry staples: water, salt, black pepper, oil, baking powder; vanilla extract ONLY if the user listed vanilla.
- NEVER add unless the user provided them: berries, cookies, chocolate, fruits, nuts, cream cheese, yogurt, milk, butter.
- Do not invent major ingredients unless clearly marked optional in optionalUpgrades.
- Every listed ingredient must appear in the steps.
- Every ingredient in steps must appear in the ingredient list.
- Realistic, consistent quantities; clean readable names.
- REQUIRED: every ingredient must include a quantity — Bad: "Cinnamon", "Sugar". Good: "4 strawberries", "1 teaspoon cinnamon", "1 tablespoon sugar".
- Never leave ingredient quantities undefined.

Real dish:
- The recipe must be a real dish someone would actually prepare and eat — not a fake recipe just because ingredients were listed.
- If ingredients cannot make a meaningful dish, explain what's missing in the description (do not invent an unrealistic dish).

Match score (matchPercentage):
- 100 = all user ingredients used.
- 80–99 = only minor optional ingredients missing.
- 50–79 = recipe works but could improve.
- Below 50 = significant ingredients missing — mention what's missing in the description (milk, eggs, butter, flour, oil, baking powder, etc.).

Base recipe + upgrades:
1. Base recipe — prepare using ONLY user ingredients (ingredients array).
2. optionalUpgrades — up to 3 suggestions with ingredient + reason; always optional, never required.
- User must feel they can cook immediately.

Steps:
- Minimum 4 steps; prefer 5–8 detailed steps.
- Each step must contain a meaningful cooking action — mix, whisk, chop, bake, fry, boil, melt, cool, refrigerate, etc.
- Reject steps that only repeat ingredients — Bad: "Mix cinnamon and strawberries". Good: "Slice the strawberries into thin pieces and place them in a bowl."
- Bad: "Mix ingredients." / "Cook." / "Serve."
- Good: "Melt the marshmallows over low heat while stirring continuously until smooth and creamy."

Before returning, verify:
- Every ingredient has a quantity; every ingredient is used in steps; every step has a real cooking action.
- No placeholder text: (strawberry), [ingredient], ingredient_name, TODO.
- No duplicated words; no broken text.

Text quality:
- Do not repeat quantities in steps — quantities only in the ingredient list; use ingredient names naturally in steps.
- Good: "Mix the coconut into the melted mixture until evenly distributed."
- Bad: "Mix coconut 2 tbsp sugar 8 marshmallows."

Return optionalUpgrades as JSON array: [{"ingredient": "...", "reason": "..."}] (max 3 items).
"""


def get_chef_rules_he() -> str:
    return CHEF_RULES_HE.format(
        chef_thinking=CHEF_THINKING_RULES_HE,
        home_cooking=HOME_COOKING_RULES_HE,
    )


def get_chef_rules_en() -> str:
    return CHEF_RULES_EN.format(
        chef_thinking=CHEF_THINKING_RULES_EN,
        home_cooking=HOME_COOKING_RULES_EN,
    )
