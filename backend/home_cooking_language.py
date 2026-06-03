"""Home-cooking language rules and step sanitization."""

from __future__ import annotations

import re

HOME_COOKING_RULES_HE = """
שפת בישול ביתית (חובה):
- כתוב למבשלים ביתיים — שפה ברורה, פשוטה וטבעית.
- הימנע מז'רגון מקצועי אלא אם אין ברירה.
- העדף פועלים נפוצים: מוסיפים, מערבבים, שופכים, מחממים, ממיסים, אופים, מטגנים, קוצצים, פורסים, מגישים, מעבירים לקערה, מערבבים היטב, מערבבים עד לקבלת תערובת אחידה.
- אסור: מקפלים פנימה, מבצעים אמולסיה, אינקורפורציה, טמפרור, הומוגניזציה, רדוקציה, אל דנטה, קרמול עמוק, טכניקות שף מורכבות, "מבצעים פיזור אחיד".
- במקום: מוסיפים ומערבבים, מערבבים היטב, שופכים לתערובת, מערבבים עד לקבלת מרקם אחיד, מחממים עד להמסה, מבשלים עד להסמכה.
- כל שלב נשמע כמו הסבר לחבר/ה — ידידותי וקל לעקיבה למתחילים.

דוגמה טובה:
"מסירים מהאש, מוסיפים את חלב הקוקוס והסוכר ומערבבים היטב עד לקבלת תערובת חלקה."

דוגמה גרועה:
"מורידים מהאש ומקפלים פנימה את חלב הקוקוס והסוכר."

דוגמה טובה:
"שופכים את התערובת לתבנית ומשטחים בעזרת כף."

דוגמה גרועה:
"מעבירים לכלי הגשה ומבצעים פיזור אחיד."
"""

HOME_COOKING_RULES_EN = """
HOME COOKING LANGUAGE (mandatory):
- Write for everyday home cooks — clear, simple, natural language.
- Avoid professional culinary jargon unless absolutely necessary.
- Prefer: mix, stir, add, pour, spread, heat, melt, cook, bake, fry, roast, transfer, combine, whisk, chop, slice, serve.
- Avoid: fold in (use "add and stir"), incorporate, emulsify, temper, homogenize, reduction, "perform even distribution".
- Each step should sound like explaining a recipe to a friend — friendly and easy for beginners.

Good: "Remove from heat, add the coconut milk and sugar, and stir well until smooth."
Bad: "Remove from heat and fold in the coconut milk and sugar."

Good: "Pour the mixture into the pan and spread evenly with a spoon."
Bad: "Transfer to serving vessel and perform uniform dispersion."
"""

_HE_REPLACEMENTS: list[tuple[str, str]] = [
    (r"אל\s*דנטה", "רכים אבל לא נקיים"),
    (r"אמולסיה", "ערבוב היטב"),
    (r"קרמול\s+עמוק", "מטגנים עד לצבע זהוב"),
    (r"סוא\s*ויד", "בישול ארוך על אש נמוכה"),
    (r"מבצעים\s+בלאנש", "מטגנים מהר"),
    (r"מבצעים\s+צירוד", "מבשלים"),
    (r"מורידים מהאש ומקפלים פנימה את", "מסירים מהאש, מוסיפים את"),
    (r"מורידים מהאש ומקפלים את", "מסירים מהאש, מוסיפים את"),
    (r"מקפלים פנימה את", "מוסיפים את"),
    (r"מקפלים פנימה", "מוסיפים ומערבבים"),
    (r"מקפלים את", "מוסיפים את"),
    (r"מעבירים לכלי הגשה ומבצעים פיזור אחיד", "שופכים לתבנית ומשטחים בעזרת כף"),
    (r"מעבירים לתבנית ולוחצים לשכבה שטוחה", "שופכים לתבנית ומשטחים בעזרת כף"),
    (r"מעבירים לתבנית מרופדת ומפזרים בשכבה שטוחה", "שופכים לתבנית מרופדת ומשטחים בעזרת כף"),
    (r"מבצעים אמולסיה", "מערבבים היטב"),
    (r"אינקורפורציה", "הוספה וערבוב"),
    (r"טמפרור", "המסה"),
    (r"הומוגניזציה", "ערבוב אחיד"),
    (r"רדוקציה", "בישול והסמכה"),
    (r"תוך ערבוב רציף", "תוך ערבוב"),
    (r"קרמית", "חלקה"),
    (r"קרמי", "חלק"),
]

_EN_REPLACEMENTS: list[tuple[str, str]] = [
    (r"\bfold in\b", "add and stir in"),
    (r"\bfold the\b", "add and mix"),
    (r"\bincorporate\b", "mix in"),
    (r"\bemulsify\b", "mix well"),
    (r"\btemper\b", "warm and add slowly"),
    (r"\bhomogenize\b", "mix until smooth"),
    (r"\bperform even distribution\b", "spread evenly with a spoon"),
    (r"\bperform uniform dispersion\b", "spread evenly with a spoon"),
    (r"\bcontinuously\b", ""),
]


def sanitize_home_cooking_step(text: str, language: str = "he") -> str:
    line = re.sub(r"\s{2,}", " ", (text or "").strip())
    if not line:
        return line

    replacements = _HE_REPLACEMENTS if language == "he" else _EN_REPLACEMENTS
    for pattern, replacement in replacements:
        line = re.sub(pattern, replacement, line, flags=re.IGNORECASE if language == "en" else 0)

    return re.sub(r"\s{2,}", " ", line).strip()


def sanitize_home_cooking_steps(steps: list[str], language: str = "he") -> list[str]:
    return [sanitize_home_cooking_step(step, language) for step in (steps or []) if step]
