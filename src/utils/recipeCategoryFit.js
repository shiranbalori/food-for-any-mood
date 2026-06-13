/**
 * Category fit for user ingredients — mirrors backend/recipe_category_fit.py
 *
 * Dairy / meat / parve / any — see kosherCategoryDefinitions.js
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'

export const CATEGORY_MISMATCH_MESSAGE = {
  he: 'המרכיבים שהוזנו אינם תואמים לקטגוריה שנבחרה',
  en: 'The ingredients you entered do not match the category you selected',
}

const CATEGORY_LABELS = {
  he: { dairy: 'חלבי', meat: 'בשרי', parve: 'פרווה', vegan: 'טבעוני' },
  en: { dairy: 'dairy', meat: 'meat', parve: 'parve', vegan: 'vegan' },
}

export function buildCategoryMismatchMessage(category, language = 'he') {
  const labels = CATEGORY_LABELS[language === 'he' ? 'he' : 'en']
  const label = labels[category]
  if (label) {
    return language === 'he'
      ? `המרכיבים שהוזנו אינם תואמים לקטגוריה ${label}`
      : `The ingredients you entered do not match the ${label} category`
  }
  return language === 'he' ? CATEGORY_MISMATCH_MESSAGE.he : CATEGORY_MISMATCH_MESSAGE.en
}

function categoryMismatchReason(category, language = 'he') {
  return buildCategoryMismatchMessage(category, language)
}

const DAIRY_CANON = new Set([
  'milk', 'cheese', 'cream', 'butter', 'yogurt', 'ricotta', 'parmesan', 'feta', 'cottage cheese', 'mozzarella',
])

const LAND_MEAT_CANON = new Set([
  'chicken', 'beef', 'turkey', 'lamb', 'pork', 'meat', 'steak', 'ground beef',
])

const FISH_CANON = new Set(['fish', 'salmon', 'tuna'])

const MEAT_FISH_CANON = new Set([...LAND_MEAT_CANON, ...FISH_CANON])

const GLUTEN_CANON = new Set(['flour', 'pasta', 'bread', 'wheat', 'noodles', 'tortilla', 'bulgur', 'semolina'])

const EGG_CANON = new Set(['egg', 'eggs'])
const HONEY_CANON = new Set(['honey'])

const DAIRY_TEXT = /חלב|גבינ|שמנת|חמאה|יוגורט|קוטג|מוצרל|פרמז|ריקוט|מסקרפונ|\bmilk\b|cheese|cream|butter|yogurt/i
const LAND_MEAT_TEXT = /עוף|בשר|בקר|כבש|הודו|נקניק|קבב|סטייק|קציצ|chicken|beef|turkey|lamb|pork|\bmeat\b|steak|ground beef/i
const FISH_TEXT = /דג|סלמון|טונה|\bfish\b|salmon|tuna/i
const MEAT_TEXT = new RegExp(`${LAND_MEAT_TEXT.source}|${FISH_TEXT.source}`, 'i')
const EGG_TEXT = /ביצ|\begg\b|\beggs\b/i
const HONEY_TEXT = /דבש|\bhoney\b/i

function ingredientProfile(userIngredients) {
  const canons = userIngredients
    .map((item) => canonicalIngredient(item))
    .filter(Boolean)
  const canonSet = new Set(canons)
  const textBlob = userIngredients.join(' ')
  const hasLandMeat =
    [...canonSet].some((c) => LAND_MEAT_CANON.has(c)) || LAND_MEAT_TEXT.test(textBlob)
  const hasFish = [...canonSet].some((c) => FISH_CANON.has(c)) || FISH_TEXT.test(textBlob)
  return {
    hasDairy: [...canonSet].some((c) => DAIRY_CANON.has(c)) || DAIRY_TEXT.test(textBlob),
    hasLandMeat,
    hasFish,
    hasMeat: hasLandMeat || hasFish,
    hasEggs: [...canonSet].some((c) => EGG_CANON.has(c)) || EGG_TEXT.test(textBlob),
    hasHoney: [...canonSet].some((c) => HONEY_CANON.has(c)) || HONEY_TEXT.test(textBlob),
    hasGluten: [...canonSet].some((c) => GLUTEN_CANON.has(c)),
  }
}

function suggestCategory(profile) {
  if (profile.hasLandMeat && !profile.hasDairy) return 'meat'
  if (profile.hasDairy && !profile.hasLandMeat) return 'dairy'
  return 'parve'
}

export function assessCategoryFit(userIngredientsRaw, { category = 'dairy', isGlutenFree = false, language = 'he' } = {}) {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  if (userIngredients.length === 0) {
    const suggestedCategory = category === 'any' ? 'parve' : category
    return { categoryOk: true, reason: '', suggestedCategory, missingIngredients: [] }
  }

  const profile = ingredientProfile(userIngredients)
  const isHe = language === 'he'
  const suggested = suggestCategory(profile)

  if (category === 'any') {
    if (isGlutenFree && profile.hasGluten) {
      const glutenItems = userIngredients.filter((item) => GLUTEN_CANON.has(canonicalIngredient(item)))
      return {
        categoryOk: false,
        reason: isHe
          ? 'בחרתם «ללא גלוטן» אבל יש במרכיבים מוצרים עם גלוטן (למשל קמח, פסטה או לחם). הסירו אותם או בטלו את סימון ללא גלוטן.'
          : 'Gluten-free is selected but your ingredients include gluten. Remove them or turn off gluten-free.',
        suggestedCategory: suggested,
        missingIngredients: glutenItems.slice(0, 4),
      }
    }
    return { categoryOk: true, reason: '', suggestedCategory: suggested, missingIngredients: [] }
  }

  if (isGlutenFree && profile.hasGluten) {
    const glutenItems = userIngredients.filter((item) => GLUTEN_CANON.has(canonicalIngredient(item)))
    return {
      categoryOk: false,
      reason: isHe
        ? 'בחרתם «ללא גלוטן» אבל יש במרכיבים מוצרים עם גלוטן (למשל קמח, פסטה או לחם). הסירו אותם או בטלו את סימון ללא גלוטן.'
        : 'Gluten-free is selected but your ingredients include gluten. Remove them or turn off gluten-free.',
      suggestedCategory: suggested,
      missingIngredients: glutenItems.slice(0, 4),
    }
  }

  if (profile.hasLandMeat && profile.hasDairy) {
    return {
      categoryOk: false,
      reason: isHe
        ? 'לא ניתן לבחור קטגוריה אחת — יש גם בשר/עוף וגם מוצרי חלב. הסירו קבוצה אחת.'
        : 'Cannot pick one category — you have both meat/poultry and dairy. Remove one group.',
      suggestedCategory: suggested,
      missingIngredients: [],
    }
  }

  if (category === 'dairy' && !profile.hasDairy) {
    return {
      categoryOk: false,
      reason: categoryMismatchReason(category, language),
      suggestedCategory: suggested,
      missingIngredients: [],
    }
  }

  if (category === 'meat' && !profile.hasMeat) {
    return {
      categoryOk: false,
      reason: categoryMismatchReason(category, language),
      suggestedCategory: suggested,
      missingIngredients: [],
    }
  }

  if (category === 'parve' && (profile.hasLandMeat || profile.hasDairy)) {
    return {
      categoryOk: false,
      reason: categoryMismatchReason(category, language),
      suggestedCategory: suggested,
      missingIngredients: [],
    }
  }

  if (category === 'vegan' && (profile.hasMeat || profile.hasDairy || profile.hasEggs || profile.hasHoney)) {
    const veganConflicts = userIngredients.filter((item) => {
      const canon = canonicalIngredient(item)
      return (
        MEAT_FISH_CANON.has(canon) ||
        DAIRY_CANON.has(canon) ||
        EGG_CANON.has(canon) ||
        HONEY_CANON.has(canon) ||
        MEAT_TEXT.test(item) ||
        DAIRY_TEXT.test(item) ||
        EGG_TEXT.test(item) ||
        HONEY_TEXT.test(item)
      )
    })
    return {
      categoryOk: false,
      reason: categoryMismatchReason(category, language),
      suggestedCategory: 'parve',
      missingIngredients: veganConflicts.slice(0, 4),
    }
  }

  return { categoryOk: true, reason: '', suggestedCategory: category, missingIngredients: [] }
}
