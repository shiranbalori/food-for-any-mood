/**
 * Category fit for user ingredients — mirrors backend/recipe_category_fit.py
 *
 * Dairy / meat / parve / any — see kosherCategoryDefinitions.js
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'
import { buildCategoryMismatchNote } from './categoryMismatchNote'

const DAIRY_CANON = new Set([
  'milk', 'cheese', 'cream', 'butter', 'yogurt', 'ricotta', 'parmesan', 'feta', 'cottage cheese', 'mozzarella',
])

const MEAT_FISH_CANON = new Set([
  'chicken', 'beef', 'fish', 'salmon', 'tuna', 'turkey', 'lamb', 'pork', 'meat', 'steak', 'ground beef',
])

const GLUTEN_CANON = new Set(['flour', 'pasta', 'bread', 'wheat', 'noodles', 'tortilla', 'bulgur', 'semolina'])

const DAIRY_TEXT = /חלב|גבינ|שמנת|חמאה|יוגורט|קוטג|מוצרל|פרמז|ריקוט|מסקרפונ|\bmilk\b|cheese|cream|butter|yogurt/i
const MEAT_TEXT = /עוף|בשר|בקר|כבש|הודו|דג|סלמון|טונה|נקניק|קבב|סטייק|chicken|beef|fish|salmon|tuna|turkey|lamb|pork|\bmeat\b|steak/i

function ingredientProfile(userIngredients) {
  const canons = userIngredients
    .map((item) => canonicalIngredient(item))
    .filter(Boolean)
  const canonSet = new Set(canons)
  const textBlob = userIngredients.join(' ')
  return {
    hasDairy: [...canonSet].some((c) => DAIRY_CANON.has(c)) || DAIRY_TEXT.test(textBlob),
    hasMeat: [...canonSet].some((c) => MEAT_FISH_CANON.has(c)) || MEAT_TEXT.test(textBlob),
    hasGluten: [...canonSet].some((c) => GLUTEN_CANON.has(c)),
  }
}

function suggestCategory(profile) {
  if (profile.hasMeat && !profile.hasDairy) return 'meat'
  if (profile.hasDairy && !profile.hasMeat) return 'dairy'
  return 'parve'
}

function categoryLabel(category, language) {
  if (language === 'en') return { dairy: 'dairy', meat: 'meat', parve: 'parve' }[category] ?? category
  return { dairy: 'חלבי', meat: 'בשרי', parve: 'פרווה' }[category] ?? category
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
  const selectedLabel = category === 'any' ? (isHe ? 'ללא העדפה' : 'no preference') : categoryLabel(category, language)
  const suggestedLabel = categoryLabel(suggested, language)

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

  if (profile.hasMeat && profile.hasDairy) {
    return {
      categoryOk: false,
      reason: isHe
        ? `לא ניתן לבחור קטגוריה אחת — יש גם בשר/עוף/דג וגם מוצרי חלב. הסירו קבוצה אחת.`
        : 'Cannot pick one category — you have both meat/fish and dairy.',
      suggestedCategory: suggested,
      missingIngredients: [],
    }
  }

  if (category === 'any') {
    return { categoryOk: true, reason: '', suggestedCategory: suggested, missingIngredients: [] }
  }

  if (category === 'dairy' && !profile.hasDairy) {
    return {
      categoryOk: true,
      categoryMismatch: true,
      categoryNote: buildCategoryMismatchNote('dairy', suggested, language),
      reason: '',
      suggestedCategory: suggested,
      missingIngredients: [],
    }
  }

  if (category === 'meat' && !profile.hasMeat) {
    return {
      categoryOk: true,
      categoryMismatch: true,
      categoryNote: buildCategoryMismatchNote('meat', suggested, language),
      reason: '',
      suggestedCategory: suggested,
      missingIngredients: [],
    }
  }

  if (category === 'parve' && (profile.hasMeat || profile.hasDairy)) {
    return {
      categoryOk: true,
      categoryMismatch: true,
      categoryNote: buildCategoryMismatchNote('parve', suggested, language),
      reason: '',
      suggestedCategory: suggested,
      missingIngredients: [],
    }
  }

  return { categoryOk: true, reason: '', suggestedCategory: category, missingIngredients: [], categoryNote: '' }
}
