"""Regenerate preparation steps only — same title and ingredients."""

from __future__ import annotations

from pydantic import BaseModel, Field

from home_cooking_language import HOME_COOKING_RULES_EN, HOME_COOKING_RULES_HE, sanitize_home_cooking_steps
from recipe_step_sanitize import light_sanitize_recipe_steps


class GeminiStepsOutput(BaseModel):
    steps: list[str] = Field(min_length=4)


def _approach_hint(variation_index: int, language: str) -> str:
    approaches_he = [
        "גישה: טיגון במחבת — מרכיב אחד אחרי השני (למשל בצל, עגבניות, ביצים).",
        "גישה: ערבוב במקום ואפייה/אידוי בתנור או במחבת מכוסה.",
        "גישה: בישול ברוטב או תערובת אחידה בסיר, בלי לשנות את המרכיבים.",
    ]
    approaches_en = [
        "Approach: pan-fry in order — one ingredient after another.",
        "Approach: mix ingredients first, then bake or cook covered.",
        "Approach: simmer in one pot as a combined mixture.",
    ]
    approaches = approaches_he if language == "he" else approaches_en
    return approaches[variation_index % len(approaches)]


def build_regenerate_steps_prompt(
    *,
    name: str,
    ingredients: list[str],
    current_steps: list[str] | None = None,
    language: str = "he",
    cooking_time: int = 30,
    recipe_type: str = "meal",
    variation_index: int = 0,
) -> str:
    ingredient_list = "\n".join(f"- {item}" for item in ingredients)
    home_rules = HOME_COOKING_RULES_HE if language == "he" else HOME_COOKING_RULES_EN
    lang_note = "כל שלבי ההכנה בעברית בלבד." if language == "he" else "All steps must be in English only."
    previous = "\n".join(f"{i + 1}. {step}" for i, step in enumerate(current_steps or []))
    previous_block = (
        f"\nשלבי ההכנה הנוכחיים (אסור לחזור על אותה גישה מילה במילה):\n{previous}\n"
        if previous
        else ""
    )
    approach = _approach_hint(variation_index, language)

    return f"""אתה עוזר/ת בישול ביתי. צור גרסה חדשה של שלבי הכנה למתכון קיים.

שם המנה (אל תשנה): {name}
סוג מתכון: {recipe_type}

מרכיבים (אל תשנה, אל תוסיף, אל תסיר):
{ingredient_list}
{previous_block}
{approach}

דרישות:
- 5–8 שלבים מפורטים, ברורים ומעשיים — גישת בישול שונה מהגרסה הקודמת.
- כל שלב: מה עושים, כמה זמן בערך, ומה התוצאה הרצויה (רך, זהוב, אחיד וכו').
- השתמש רק במרכיבים מהרשימה + מלח/פלפל/שמן/מים/תבלינים בסיסיים.
- אל תשנה שם, מרכיבים, ערכים תזונתיים או סוג המנה.
- זמן הכנה כולל: עד {cooking_time} דקות.
{lang_note}

{home_rules}

החזר JSON בלבד: {{"steps": ["...", "..."]}}"""


from hebrew_display_text import normalize_hebrew_display_text


def finalize_regenerated_steps(steps: list[str], *, language: str = "he") -> list[str]:
    cleaned = light_sanitize_recipe_steps([str(s).strip() for s in steps if str(s).strip()], language)
    sanitized = sanitize_home_cooking_steps(cleaned, language)
    return [normalize_hebrew_display_text(step, language) for step in sanitized]
