"""Detect Hebrew ingredient names from a food photo using Gemini Vision."""

from __future__ import annotations

import re
from typing import Any

from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

HEBREW_PATTERN = re.compile(r"[\u0590-\u05FF]")
LATIN_PATTERN = re.compile(r"[a-z]", re.IGNORECASE)


class GeminiIngredientsOutput(BaseModel):
    ingredients: list[str] = Field(default_factory=list)


class AnalyzeIngredientsImageResponse(BaseModel):
    ingredients: list[str] = Field(default_factory=list)
    error: str | None = None


def _normalize_hebrew_ingredient(raw: str) -> str:
    text = str(raw or "").strip()
    text = re.sub(r"\s*\([^)]*\)\s*", " ", text).strip()
    text = re.sub(r"^[\d./]+\s*", "", text).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def _clean_ingredient_list(items: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()

    for item in items:
        label = _normalize_hebrew_ingredient(item)
        if not label or len(label) < 2:
            continue
        if not HEBREW_PATTERN.search(label):
            continue
        if LATIN_PATTERN.search(label):
            continue
        key = label.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(label)
        if len(cleaned) >= 15:
            break

    return cleaned


def _build_vision_prompt() -> str:
    return """אתה עוזר בישול ישראלי. נתח את התמונה וזהה מרכיבי מזון שניתן לבשל איתם.
החזר JSON בלבד בפורמט: {"ingredients": ["...", "..."]}

כללים:
- שמות מרכיבים בעברית בלבד
- שמות קצרים ביחיד (למשל: עגבנייה, ביצה, גבינה, מלפפון)
- ללא כמויות, ללא אנגלית, ללא משפטים
- רק מרכיבים שנראים בבירור בתמונה
- עד 15 מרכיבים
- אם לא ניתן לזהות מרכיבים, החזר רשימה ריקה"""


def analyze_ingredients_image_bytes(
    *,
    client: genai.Client,
    model: str,
    image_bytes: bytes,
    mime_type: str,
) -> list[str]:
    if not image_bytes:
        raise ValueError("Empty image file")

    prompt = _build_vision_prompt()
    schema = GeminiIngredientsOutput.model_json_schema()

    response = client.models.generate_content(
        model=model,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    types.Part.from_text(text=prompt),
                ],
            )
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=schema,
        ),
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response")

    parsed = GeminiIngredientsOutput.model_validate_json(response.text)
    cleaned = _clean_ingredient_list(parsed.ingredients)
    if not cleaned:
        raise ValueError("No Hebrew ingredients detected in image")
    return cleaned


async def analyze_uploaded_image(
    *,
    client: genai.Client | None,
    model: str,
    filename: str | None,
    content_type: str | None,
    read_bytes,
) -> AnalyzeIngredientsImageResponse:
    if client is None:
        return AnalyzeIngredientsImageResponse(
            ingredients=[],
            error="שירות זיהוי התמונה אינו זמין כרגע. אפשר להזין מרכיבים ידנית.",
        )

    mime_type = (content_type or "").split(";")[0].strip().lower()
    if mime_type not in ALLOWED_MIME_TYPES:
        return AnalyzeIngredientsImageResponse(
            ingredients=[],
            error="סוג קובץ לא נתמך. העלו תמונה בפורמט JPG, PNG, WEBP או GIF.",
        )

    image_bytes = await read_bytes()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        return AnalyzeIngredientsImageResponse(
            ingredients=[],
            error="התמונה גדולה מדי. נסו תמונה עד 10MB.",
        )

    try:
        ingredients = analyze_ingredients_image_bytes(
            client=client,
            model=model,
            image_bytes=image_bytes,
            mime_type=mime_type,
        )
        print(
            "[FOOD FOR ANY MOOD] Image ingredients detected:",
            ingredients,
            f"(file={filename or 'upload'})",
        )
        return AnalyzeIngredientsImageResponse(ingredients=ingredients)
    except ValidationError as exc:
        print(f"[FOOD FOR ANY MOOD] Gemini image JSON invalid: {exc}")
        return AnalyzeIngredientsImageResponse(
            ingredients=[],
            error="לא הצלחנו לזהות מרכיבים מהתמונה. אפשר להזין אותם ידנית.",
        )
    except Exception as exc:
        print(f"[FOOD FOR ANY MOOD] Gemini image analysis failed: {exc}")
        return AnalyzeIngredientsImageResponse(
            ingredients=[],
            error="לא הצלחנו לזהות מרכיבים מהתמונה. אפשר להזין אותם ידנית.",
        )
