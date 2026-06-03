/**
 * Deterministic alternate step sequences when the API is unavailable.
 * variationIndex rotates through different cooking approaches.
 */

import {
  formatHebrewStepIngredientList,
  formatEnglishStepIngredientList,
  toStepIngredientReference,
} from './recipeStepWording'
import { buildStepsFromUserIngredients } from './userIngredientSteps'

const ONION_KEYWORDS = ['onion', 'בצל']
const TOMATO_KEYWORDS = ['tomato', 'עגבנ', 'שרי']
const EGG_KEYWORDS = ['egg', 'ביצ']

function bareName(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^[\d\s/]+(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ"?ל|כוס(?:ות)?|יח(?:ידה|ידות)?|tsp|tbsp|cup|g|ml)\.?\s*/i, '')
}

function matchesAny(name, keywords) {
  const lower = bareName(name).toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

function pickIngredient(names, keywords, language) {
  const found = names.find((n) => matchesAny(n, keywords))
  return found ? toStepIngredientReference(found, language) : null
}

function buildMealVariants(names, language, cookMinutes, bakeMinutes) {
  const refs = names.map((n) => toStepIngredientReference(n, language))
  const listPhrase =
    language === 'he'
      ? formatHebrewStepIngredientList(refs)
      : formatEnglishStepIngredientList(refs)

  const onion = pickIngredient(names, ONION_KEYWORDS, language)
  const tomato = pickIngredient(names, TOMATO_KEYWORDS, language)
  const egg = pickIngredient(names, EGG_KEYWORDS, language)
  const hasEggTomato = Boolean(egg && tomato)

  const variants = []

  if (hasEggTomato && language === 'he') {
    variants.push([
      onion
        ? `מחממים מחבת עם מעט שמן על אש בינונית ומטגנים את ${onion} כ-4 דקות עד שקוף.`
        : 'מחממים מחבת עם מעט שמן על אש בינונית.',
      `מוסיפים את ${tomato} ומבשלים 3–4 דקות עד שהעגבניות מתרככות.`,
      `שוברים את ${egg} לקערה, יוצקים למחבת ומערבבים בעדינות.`,
      `מבשלים על אש בינונית-נמוכה כ-${cookMinutes} דקות עד שהביצים מתקבעות.`,
      'מתבלים במלח ופלפל ומגישים חם מהמחבת.',
    ])
    variants.push([
      `מערבבים בקערה את ${egg} ואת ${tomato} עם קורט מלח ופלפל.`,
      'מחממים תנור ל-180°C.',
      `יוצקים את התערובת לתבנית משומנת ואופים כ-${bakeMinutes} דקות עד שהמרקם מתקבע.`,
      'מוציאים מהתנור, ממתינים 2 דקות וחותכים או מגישים ישר.',
      'מגישים חם או פושר.',
    ])
    variants.push([
      `מבשלים את ${tomato} בסיר קטן על אש בינונית כ-5 דקות עד רוטב סמיך.`,
      `מוסיפים את ${egg} ומערבבים היטב כדקה.`,
      `מכסים ומבשלים על אש נמוכה כ-${cookMinutes} דקות עד שהביצים לבנות ורכות.`,
      'טועמים ומתבלים לפי הצורך.',
      'מגישים עם הלחם או לבד.',
    ])
  } else if (hasEggTomato && language === 'en') {
    variants.push([
      onion
        ? `Heat oil in a pan over medium heat and sauté ${onion} for about 4 minutes until soft.`
        : 'Heat a little oil in a pan over medium heat.',
      `Add ${tomato} and cook 3–4 minutes until they soften.`,
      `Beat ${egg} in a bowl, pour into the pan and stir gently.`,
      `Cook on medium-low for about ${cookMinutes} minutes until the eggs set.`,
      'Season with salt and pepper and serve hot.',
    ])
    variants.push([
      `Mix ${egg} and ${tomato} in a bowl with a pinch of salt and pepper.`,
      'Preheat the oven to 180°C (350°F).',
      `Pour into a greased dish and bake for about ${bakeMinutes} minutes until set.`,
      'Rest 2 minutes, then slice or serve as is.',
      'Serve warm.',
    ])
  }

  variants.push(
    language === 'he'
      ? [
          'מחממים מחבת או סיר על אש בינונית עם מעט שמן.',
          `מוסיפים את ${listPhrase} ומבשלים יחד תוך ערבוב מדי פעם.`,
          `ממשיכים כ-${cookMinutes} דקות עד שהמרכיבים רכים ומשתלבים.`,
          'טועמים ומתבלים לפי הצורך.',
          'מגישים חם.',
        ]
      : [
          'Heat a pan with a little oil over medium heat.',
          `Add ${listPhrase} and cook together, stirring occasionally.`,
          `Continue for about ${cookMinutes} minutes until tender and combined.`,
          'Taste and adjust seasoning.',
          'Serve hot.',
        ],
  )

  variants.push(
    language === 'he'
      ? [
          `מערבבים את ${listPhrase} בקערה גדולה עד לתערובת אחידה.`,
          'מחממים מחבת גדולה על אש בינונית-גבוהה.',
          `מעבירים את התערובת למחבת ומטגנים כ-${cookMinutes} דקות תוך ערבוב.`,
          'ממתינים דקה, טועמים ומתבלים.',
          'מגישים מיד.',
        ]
      : [
          `Combine ${listPhrase} in a large bowl until even.`,
          'Heat a wide pan over medium-high heat.',
          `Add the mixture and cook for about ${cookMinutes} minutes, stirring.`,
          'Rest 1 minute, taste and season.',
          'Serve right away.',
        ],
  )

  return variants
}

/**
 * @param {string[]} displayIngredients
 * @param {{ recipeType?: string, language?: string, cookingTime?: number, variationIndex?: number }} [options]
 */
export function buildAlternateStepsFromUserIngredients(
  displayIngredients,
  { recipeType = 'meal', language = 'he', cookingTime = 30, variationIndex = 0 } = {},
) {
  const names = (displayIngredients ?? []).map((item) => String(item ?? '').trim()).filter(Boolean)
  if (!names.length) return []

  const cookMinutes = Math.min(cookingTime, Math.max(8, Math.round(cookingTime / 2)))
  const bakeMinutes = Math.min(cookingTime, Math.max(12, Math.round(cookingTime * 0.65)))

  if (recipeType === 'dessert') {
    const base = buildStepsFromUserIngredients(names, { recipeType, language, cookingTime })
    if (variationIndex % 2 === 0) return base
    return [...base].reverse()
  }

  const variants = buildMealVariants(names, language, cookMinutes, bakeMinutes)
  const idx = Math.abs(variationIndex) % variants.length
  return variants[idx]
}
