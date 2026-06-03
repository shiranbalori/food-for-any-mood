/**
 * Category fit for user ingredients — mirrors backend/recipe_category_fit.py
 *
 * Dairy / meat / parve / any — see kosherCategoryDefinitions.js
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'

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
      categoryOk: false,
      reason: isHe
        ? `הקטגוריה «${selectedLabel}» דורשת מרכיב חלבי אמיתי. מה שיש לכם מתאים יותר ל«${suggestedLabel}» — הוסיפו מוצר חלב או שנו קטגוריה.`
        : `Category «${selectedLabel}» needs dairy. Try «${suggestedLabel}» instead.`,
      suggestedCategory: suggested,
      missingIngredients: isHe ? ['חלב, גבינה, שמנת, חמאה או יוגורט'] : ['milk, cheese, cream, butter, or yogurt'],
    }
  }

  if (category === 'meat' && !profile.hasMeat) {
    return {
      categoryOk: false,
      reason: isHe
        ? `הקטגוריה «${selectedLabel}» דורשת בשר, עוף או דג. מה שיש לכם מתאים יותר ל«${suggestedLabel}».`
        : `Category «${selectedLabel}» needs meat, chicken, or fish. Try «${suggestedLabel}».`,
      suggestedCategory: suggested,
      missingIngredients: isHe ? ['עוף, בשר, דג או טונה'] : ['chicken, beef, fish, or tuna'],
    }
  }

  if (category === 'parve' && (profile.hasMeat || profile.hasDairy)) {
    const parts = []
    if (profile.hasMeat) parts.push(isHe ? 'בשר/עוף/דג' : 'meat/fish')
    if (profile.hasDairy) parts.push(isHe ? 'מוצרי חלב' : 'dairy')
    const joined = isHe ? parts.join(' ו') : parts.join(' and ')
    return {
      categoryOk: false,
      reason: isHe
        ? `הקטגוריה «${selectedLabel}» אינה כוללת ${joined}. הסירו אותם או בחרו «${suggestedLabel}».`
        : `Category «${selectedLabel}» cannot include ${joined}. Choose «${suggestedLabel}».`,
      suggestedCategory: suggested,
      missingIngredients: [],
    }
  }

  return { categoryOk: true, reason: '', suggestedCategory: category, missingIngredients: [] }
}
