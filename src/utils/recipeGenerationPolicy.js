/**
 * Central recipe generation policy.
 *
 * CORE PRINCIPLE: Category is an OUTPUT requirement, not an INPUT filter.
 * Users may enter any reasonable ingredients; the system generates a recipe that
 * matches the selected category (adding pantry staples when needed).
 *
 * Default category: "any" / ללא העדפה — infer the best fit from the dish.
 *
 * Input phase: allow any normal food ingredients; block only hard conflicts:
 *   - vegan + animal products
 *   - meat + dairy together in input
 *   - gluten-free + gluten ingredients
 *
 * Output phase: final recipe must match selected category (recipeCategoryGuard.js).
 * Realistic dishes: prefer common recognizable recipes (see recipePatternEngine.js).
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'
import { normalizeDishIdea } from './dishIdeaUtils'
import { isAnyCategory } from './recipeCategoryGuard'

export { normalizeDishIdea, hasDishIdea } from './dishIdeaUtils'

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

const SPICE_ONLY_CANON = new Set([
  'salt', 'pepper', 'black pepper', 'cinnamon', 'vanilla', 'nutmeg',
  'paprika', 'cumin', 'oregano', 'basil', 'thyme', 'ginger',
])

export function buildUserIngredientProfile(userIngredientsRaw) {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  const canons = userIngredients
    .map((item) => canonicalIngredient(item))
    .filter(Boolean)
  const canonSet = new Set(canons)
  const textBlob = userIngredients.join(' ')

  const hasLandMeat =
    [...canonSet].some((c) => LAND_MEAT_CANON.has(c)) || LAND_MEAT_TEXT.test(textBlob)
  const hasFish = [...canonSet].some((c) => FISH_CANON.has(c)) || FISH_TEXT.test(textBlob)

  return {
    userIngredients,
    canons,
    canonSet,
    hasDairy: [...canonSet].some((c) => DAIRY_CANON.has(c)) || DAIRY_TEXT.test(textBlob),
    hasLandMeat,
    hasFish,
    hasMeat: hasLandMeat || hasFish,
    hasEggs: [...canonSet].some((c) => EGG_CANON.has(c)) || EGG_TEXT.test(textBlob),
    hasHoney: [...canonSet].some((c) => HONEY_CANON.has(c)) || HONEY_TEXT.test(textBlob),
    hasGluten: [...canonSet].some((c) => GLUTEN_CANON.has(c)),
    onlySpices:
      canons.length > 0 &&
      [...canonSet].every((c) => SPICE_ONLY_CANON.has(c) || ['oil', 'olive oil', 'water'].includes(c)),
  }
}

export function suggestCategoryFromIngredients(profile) {
  if (profile.hasLandMeat && !profile.hasDairy) return 'meat'
  if (profile.hasDairy && !profile.hasLandMeat) return 'dairy'
  return 'parve'
}

export function buildVeganConflictMessage(conflictingIngredients, language = 'he') {
  const isHe = language === 'he'
  const sample = conflictingIngredients.slice(0, 2).join(', ')
  if (isHe) {
    return sample
      ? `בחרתם טבעוני, אבל הוזנו מרכיבים מן החי (${sample}) — מתכון טבעוני לא יכול לכלול עוף, בשר, חלב, ביצים או דבש.`
      : 'בחרתם טבעוני, אבל הוזנו מרכיבים מן החי — מתכון טבעוני לא יכול לכלול מוצרים מהחי.'
  }
  return sample
    ? `You selected vegan, but entered animal ingredients (${sample}) — a vegan recipe cannot include meat, dairy, eggs, or honey.`
    : 'You selected vegan, but entered animal ingredients — a vegan recipe cannot include animal products.'
}

export function buildMeatDairyConflictMessage(language = 'he') {
  return language === 'he'
    ? 'לא ניתן לבחור קטגוריה אחת — יש גם בשר/עוף וגם מוצרי חלב. הסירו קבוצה אחת.'
    : 'Cannot pick one category — you have both meat/poultry and dairy. Remove one group.'
}

export function buildGlutenFreeConflictMessage(language = 'he') {
  return language === 'he'
    ? 'בחרתם «ללא גלוטן» אבל יש במרכיבים מוצרים עם גלוטן (למשל קמח, פסטה או לחם). הסירו אותם או בטלו את סימון ללא גלוטן.'
    : 'Gluten-free is selected but your ingredients include gluten. Remove them or turn off gluten-free.'
}

/**
 * Hard input constraints only — never reject because category lacks matching ingredients.
 */
export function assessInputCategoryConstraints(
  userIngredientsRaw,
  { category = 'any', isGlutenFree = false, language = 'he' } = {},
) {
  const profile = buildUserIngredientProfile(userIngredientsRaw)
  const { userIngredients } = profile
  const isHe = language === 'he'
  const suggestedCategory = isAnyCategory(category)
    ? suggestCategoryFromIngredients(profile)
    : category

  if (userIngredients.length === 0) {
    return {
      allowed: true,
      categoryOk: true,
      reason: '',
      suggestedCategory,
      missingIngredients: [],
    }
  }

  if (isGlutenFree && profile.hasGluten) {
    const glutenItems = userIngredients.filter((item) => GLUTEN_CANON.has(canonicalIngredient(item)))
    return {
      allowed: false,
      categoryOk: false,
      reason: buildGlutenFreeConflictMessage(language),
      suggestedCategory,
      missingIngredients: glutenItems.slice(0, 4),
    }
  }

  if (profile.hasLandMeat && profile.hasDairy) {
    return {
      allowed: false,
      categoryOk: false,
      reason: buildMeatDairyConflictMessage(language),
      suggestedCategory: suggestCategoryFromIngredients(profile),
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
      allowed: false,
      categoryOk: false,
      reason: buildVeganConflictMessage(veganConflicts, language),
      suggestedCategory: 'parve',
      missingIngredients: veganConflicts.slice(0, 4),
    }
  }

  return {
    allowed: true,
    categoryOk: true,
    reason: '',
    suggestedCategory,
    missingIngredients: [],
  }
}

/**
 * Whether generation should proceed from user ingredients.
 */
export function assessGenerationFeasibility(
  userIngredientsRaw,
  { recipeType = 'meal', category = 'any', isGlutenFree = false, language = 'he', dishIdea = '' } = {},
) {
  void recipeType
  const inputCheck = assessInputCategoryConstraints(userIngredientsRaw, { category, isGlutenFree, language })
  if (!inputCheck.allowed) {
    return {
      recipePossible: false,
      reason: inputCheck.reason,
      missingIngredients: inputCheck.missingIngredients ?? [],
      suggestedCategory: inputCheck.suggestedCategory,
    }
  }

  if (normalizeDishIdea(dishIdea)) {
    return {
      recipePossible: true,
      dishIdeaBased: true,
      reason: '',
      missingIngredients: [],
    }
  }

  const profile = buildUserIngredientProfile(userIngredientsRaw)
  const isHe = language === 'he'

  if (profile.userIngredients.length === 0) {
    return {
      recipePossible: true,
      preferenceBased: true,
      reason: '',
      missingIngredients: [],
    }
  }

  if (profile.onlySpices) {
    return {
      recipePossible: false,
      reason: isHe
        ? 'מהמרכיבים שסיפקתם אי אפשר להכין מנה — חסרים מרכיבים מהותיים.'
        : 'These ingredients alone cannot make a dish — substantive ingredients are missing.',
      missingIngredients: isHe ? ['חלבונים או ירקות או פחמימות'] : ['protein, vegetables, or carbs'],
    }
  }

  return { recipePossible: true, reason: '', missingIngredients: [] }
}

/** @deprecated Use assessInputCategoryConstraints — kept for callers expecting categoryOk shape. */
export function assessCategoryFit(userIngredientsRaw, options = {}) {
  const result = assessInputCategoryConstraints(userIngredientsRaw, options)
  return {
    categoryOk: result.categoryOk,
    reason: result.reason,
    suggestedCategory: result.suggestedCategory,
    missingIngredients: result.missingIngredients,
  }
}
