/**
 * Pre-return recipe validation — mirrors backend/recipe_pre_return_validation.py.
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'
import { ingredientsMatch } from '../data/ingredientKnowledge'
import { ingredientAppearsInText, parseUserIngredients } from './ingredientRelevance'
import { parseAnyLeadingMeasurement } from './measurementUnits'
import { isValidQuantifiedDisplay } from './recipeQuantities'
import { hasRepeatedParentheticalIngredients } from './ingredientFormatting'
import { findUnauthorizedRecipeIngredients, SYSTEM_PANTRY_CANONICAL } from './ingredientAllowlist'
import { assessCategoryFit } from './recipeCategoryFit'
import { validateRecipeCoherence } from './recipeCoherenceValidation'

const PLACEHOLDER_PATTERNS = [
  /\(strawberry\)/i,
  /\[ingredient\]/i,
  /ingredient_name/i,
  /\bTODO\b/i,
  /\bplaceholder\b/i,
  /\{\{.*?\}\}/,
  /<.*?>/,
  /\bxxx\b/i,
  /lorem ipsum/i,
]

const COOKING_ACTIONS = [
  'slice', 'sliced', 'chop', 'chopped', 'dice', 'mince', 'whisk', 'beat', 'fold',
  'bake', 'roast', 'grill', 'fry', 'sauté', 'saute', 'boil', 'simmer', 'steam',
  'melt', 'cool', 'chill', 'refrigerate', 'freeze', 'heat', 'warm', 'toast',
  'blend', 'puree', 'crush', 'grind', 'season', 'marinate', 'drain', 'rinse',
  'peel', 'grate', 'spread', 'layer', 'roll', 'knead', 'rest', 'rise',
  'חותך', 'קוצץ', 'מקציף', 'מערבב', 'אופה', 'מטגן', 'מבשל', 'מרתיח',
  'ממיס', 'מקרר', 'מעביר', 'מסנן', 'שוטף', 'מקליף', 'מגרד', 'ממרח', 'מגלגל',
  'מסדר', 'מניח', 'יוצק', 'מעצב', 'מבשלים', 'מערבבים', 'חותכים', 'אופים',
]

const WEAK_ONLY_ACTIONS = new Set([
  'mix', 'combine', 'stir', 'add', 'serve', 'prepare', 'place', 'put',
  'מערבב', 'מערבבים', 'מוסיף', 'מוסיפים', 'מגיש', 'מגישים', 'מכין', 'מכינים',
  'מניח', 'מניחים', 'מסדר', 'מסדרים',
])

const TECHNIQUE_MARKERS = [
  'until', 'עד', 'minute', 'דק', 'low heat', 'אש', 'medium heat', 'bowl', 'קערה',
  'pan', 'מחבת', 'oven', 'תנור', 'thin', 'דק', 'smooth', 'חלק', 'golden', 'זהוב',
  'tender', 'רך', 'crisp', 'פריך', 'over', 'במהלך', 'while', 'תוך',
]

const SPICE_ONLY_CANON = new Set([
  'salt', 'pepper', 'black pepper', 'cinnamon', 'vanilla', 'nutmeg',
  'paprika', 'cumin', 'oregano', 'basil', 'thyme', 'ginger',
])

const SWEET_CANON = new Set([
  'sugar', 'honey', 'chocolate', 'marshmallow', 'marshmallows', 'cookie',
  'cookies', 'candy', 'coconut', 'cream', 'butter', 'flour', 'milk', 'cinnamon',
])

const FRUIT_CANON = new Set([
  'strawberry', 'strawberries', 'blueberry', 'blueberries', 'apple', 'banana',
  'orange', 'lemon', 'peach', 'pear', 'grape', 'grapes', 'mango', 'pineapple',
])

const SAVORY_MAIN_CANON = new Set([
  'chicken', 'beef', 'fish', 'salmon', 'tuna', 'turkey', 'lamb', 'pork',
  'tofu', 'pasta', 'rice', 'potato', 'potatoes', 'lentils', 'chickpeas',
  'beans', 'quinoa', 'egg', 'eggs', 'cheese', 'mushroom', 'mushrooms',
  'broccoli', 'spinach', 'tomato', 'tomatoes', 'onion', 'zucchini',
])

const MEAT_FISH_CANON = new Set([
  'chicken', 'beef', 'fish', 'salmon', 'tuna', 'turkey', 'lamb', 'pork', 'meat',
])

const SELF_SUFFICIENT_CANON = new Set([
  'egg', 'eggs', 'banana', 'apple', 'yogurt', 'avocado', 'strawberry',
  'strawberries', 'orange', 'pear', 'peach', 'cottage cheese', 'cheese',
  'tuna', 'bread', 'toast', 'rice', 'pasta', 'potato', 'tomato',
])

const DESSERT_BASE_CANON = new Set([...SWEET_CANON, ...FRUIT_CANON, 'egg', 'eggs', 'flour', 'yogurt', 'cream', 'butter'])

function isStaple(line) {
  const canon = canonicalIngredient(String(line)) || ''
  return SYSTEM_PANTRY_CANONICAL.has(canon)
}

function ingredientLineHasQuantity(line) {
  const text = String(line ?? '').trim()
  if (!text) return false
  const measured = parseAnyLeadingMeasurement(text)
  if (measured?.amount != null) {
    const unit = measured.unit || 'whole'
    return isValidQuantifiedDisplay(text, unit)
  }
  if (/^\d+(?:\s+\d+\/\d+)?\s+\S/.test(text)) return true
  if (/^\d+\/\d+\s+\S/.test(text)) return true
  if (/^(?:כפית|כפיות|כף|כפות|כוס|כוסות|גרם|מ"?ל)\s+/.test(text)) return true
  return false
}

function hasPlaceholderText(text) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(String(text ?? '')))
}

function hasConsecutiveDuplicateWords(text) {
  const words = String(text ?? '').toLowerCase().match(/[\u0590-\u05FFa-z]+/g) ?? []
  for (let i = 0; i < words.length - 1; i += 1) {
    if (words[i] === words[i + 1] && words[i].length > 2) return true
  }
  return false
}

export function stepHasMeaningfulAction(step) {
  const text = String(step ?? '').trim().toLowerCase()
  if (text.length < 12) return false

  const hasAnyAction = COOKING_ACTIONS.some((action) => text.includes(action))
  if (!hasAnyAction) return false

  const strong = COOKING_ACTIONS.filter((action) => !WEAK_ONLY_ACTIONS.has(action))
  if (strong.some((action) => text.includes(action))) return true
  if (TECHNIQUE_MARKERS.some((marker) => text.includes(marker))) return true
  return false
}

function classifyCanons(canons) {
  const set = new Set(canons)
  return {
    hasSweet: [...set].some((c) => SWEET_CANON.has(c) || FRUIT_CANON.has(c)),
    hasDessertBase: [...set].some((c) => DESSERT_BASE_CANON.has(c)),
    hasSavoryMain: [...set].some((c) => SAVORY_MAIN_CANON.has(c)),
    hasMeatFish: [...set].some((c) => MEAT_FISH_CANON.has(c)),
    onlySpices: set.size > 0 && [...set].every((c) => SPICE_ONLY_CANON.has(c) || ['oil', 'olive oil', 'water'].includes(c)),
    selfSufficient: set.size === 1 && [...set].every((c) => SELF_SUFFICIENT_CANON.has(c)),
  }
}

export function assessIngredientFeasibility(
  userIngredientsRaw,
  { recipeType = 'meal', category = 'dairy', isGlutenFree = false, language = 'he' } = {},
) {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  const isHe = language === 'he'

  if (userIngredients.length === 0) {
    return {
      recipePossible: true,
      preferenceBased: true,
      reason: '',
      missingIngredients: [],
    }
  }

  const categoryCheck = assessCategoryFit(userIngredientsRaw, { category, isGlutenFree, language })
  if (!categoryCheck.categoryOk) {
    return {
      recipePossible: false,
      reason: categoryCheck.reason,
      missingIngredients: categoryCheck.missingIngredients ?? [],
      suggestedCategory: categoryCheck.suggestedCategory,
    }
  }

  const canons = userIngredients.map((item) => canonicalIngredient(item) || item.toLowerCase())
  const profile = classifyCanons(canons)

  if (profile.selfSufficient) {
    return { recipePossible: true, reason: '', missingIngredients: [] }
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

  if (recipeType === 'dessert') {
    if (profile.hasMeatFish && !profile.hasDessertBase) {
      return {
        recipePossible: false,
        reason: isHe
          ? 'מהמרכיבים האלה לא ניתן להכין קינוח — חסרים מרכיבים מתוקים או בסיס לאפייה.'
          : 'These ingredients cannot make a dessert — sweet or baking basics are missing.',
        missingIngredients: isHe ? ['סוכר', 'קמח', 'ביצים', 'חמאה'] : ['sugar', 'flour', 'eggs', 'butter'],
      }
    }
    if (!profile.hasDessertBase) {
      return {
        recipePossible: false,
        reason: isHe
          ? 'מהמרכיבים שסיפקתם לא ניתן להכין קינוח משמעותי — חסרים מרכיבים מתוקים או בסיס.'
          : 'These ingredients cannot make a meaningful dessert — add sweet or baking ingredients.',
        missingIngredients: isHe ? ['סוכר', 'דבש', 'שוקולד', 'קמח', 'ביצים'] : ['sugar', 'honey', 'chocolate', 'flour', 'eggs'],
      }
    }
  }

  if ((recipeType === 'meal' || recipeType === 'soup_stew') && !profile.hasSavoryMain) {
    if (canons.length <= 2 && !profile.hasSweet) {
      return {
        recipePossible: false,
        reason: isHe
          ? 'מהמרכיבים שסיפקתם לא ניתן להכין מנה מלאה — חסרים מרכיבים מרכזיים.'
          : 'These ingredients cannot make a full meal — main components are missing.',
        missingIngredients: isHe ? ['חלבון', 'פחמימה', 'או ירק מרכזי'] : ['protein', 'starch, or a main vegetable'],
      }
    }
  }

  return { recipePossible: true, reason: '', missingIngredients: [] }
}

export function validateRecipeBeforeReturn(recipe, userIngredientsRaw = '', { language = 'he' } = {}) {
  void language
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  const ingredients = recipe.ingredients ?? []
  const steps = recipe.steps ?? []
  const stepsText = steps.join('\n')
  const failures = []

  const unauthorizedIngredients = findUnauthorizedRecipeIngredients(recipe, userIngredientsRaw)
  if (userIngredients.length && unauthorizedIngredients.length) {
    failures.push('unauthorized_ingredients')
  }

  const missingQuantities = ingredients.filter((item) => !ingredientLineHasQuantity(item))
  if (missingQuantities.length) failures.push('missing_quantities')

  const unusedInSteps = ingredients.filter(
    (item) => !isStaple(item) && !ingredientAppearsInText(item, stepsText),
  )
  if (unusedInSteps.length) failures.push('unused_ingredients')

  const weakSteps = steps.filter((step) => !stepHasMeaningfulAction(step))
  const maxAllowedWeakSteps = steps.length >= 4 ? 1 : 0
  if (weakSteps.length > maxAllowedWeakSteps) failures.push('weak_steps')

  const placeholderHits = [...ingredients, ...steps, recipe.name ?? '', recipe.description ?? '']
    .filter((item) => hasPlaceholderText(item))

  if (placeholderHits.length) failures.push('placeholder_text')

  const duplicateHits = [...ingredients, ...steps, recipe.name ?? '', recipe.description ?? '']
    .filter((item) => hasConsecutiveDuplicateWords(item))
  if (duplicateHits.length) failures.push('duplicate_words')

  const repeatedParenSteps = steps.filter((step) => hasRepeatedParentheticalIngredients(step))
  if (repeatedParenSteps.length) failures.push('repeated_parenthetical_ingredients')

  if (steps.length < 4) failures.push('too_few_steps')
  if (ingredients.length === 0) failures.push('no_ingredients')

  if (userIngredients.length) {
    const missingUser = userIngredients.filter(
      (userIng) => !(ingredients ?? []).some((line) => ingredientsMatch(line, userIng)),
    )
    if (missingUser.length) failures.push('missing_user_ingredients')

    const coherence = validateRecipeCoherence(userIngredients, recipe, language)
    if (!coherence.ok) {
      for (const failure of coherence.failures) {
        if (!failures.includes(failure)) failures.push(failure)
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    missingQuantities,
    unusedInSteps,
    weakSteps,
    placeholderHits,
    duplicateHits,
    unauthorizedIngredients,
  }
}

export function buildValidationFailureMessage(validation, feasibility = null, { language = 'he' } = {}) {
  const isHe = language === 'he'
  if (feasibility && feasibility.recipePossible === false) {
    return {
      reason: feasibility.reason,
      missingIngredients: feasibility.missingIngredients ?? [],
    }
  }

  const failures = validation.failures ?? []
  const missing = validation.missingQuantities ?? []

  if (failures.includes('missing_user_ingredients')) {
    return {
      reason: isHe
        ? 'לא כל המרכיבים שהזנתם מופיעים במתכון — נסו ליצור מתכון שוב.'
        : 'Not all ingredients you entered appear in the recipe — please try generating again.',
      missingIngredients: missing,
    }
  }

  if (failures.includes('title_grounding') || failures.includes('title_missing_ingredient') || failures.includes('generic_title')) {
    return {
      reason: isHe
        ? 'שם המתכון לא תואם למרכיבים — נסו שוב.'
        : 'The recipe title does not match the ingredients — please try again.',
      missingIngredients: missing,
    }
  }

  if (failures.includes('unnatural_steps')) {
    return {
      reason: isHe
        ? 'שלבי ההכנה לא ברורים מספיק — נסו שוב.'
        : 'The preparation steps are not clear enough — please try again.',
      missingIngredients: missing,
    }
  }

  if (failures.includes('unauthorized_ingredients')) {
    const extras = validation.unauthorizedIngredients ?? []
    return {
      reason: isHe
        ? 'המתכון כולל מרכיבים שלא סיפקתם — ניתן להשתמש רק במרכיבים שלכם ובמצרכי מזוון בסיסיים (מלח, פלפל, שמן, מים, תבלינים בסיסיים).'
        : 'The recipe includes ingredients you did not provide — only your ingredients and basic pantry staples are allowed.',
      missingIngredients: extras,
    }
  }

  if (failures.includes('missing_quantities')) {
    return {
      reason: isHe
        ? 'לכל מרכיב חייבת להיות כמות (למשל: 4 תותים, כף סוכר).'
        : 'Every ingredient must include a quantity (e.g. 4 strawberries, 1 tbsp sugar).',
      missingIngredients: missing,
    }
  }

  if (failures.includes('weak_steps')) {
    return {
      reason: isHe
        ? 'שלבי ההכנה חייבים לכלול פעולות בישול אמיתיות — חיתוך, בישול, אפייה וכו\'.'
        : 'Steps must include real cooking actions — chop, bake, boil, etc.',
      missingIngredients: missing,
    }
  }

  if (failures.includes('unused_ingredients')) {
    return {
      reason: isHe
        ? 'כל מרכיב ברשימה חייב להופיע בשלבי ההכנה.'
        : 'Every listed ingredient must appear in the preparation steps.',
      missingIngredients: missing,
    }
  }

  if (failures.includes('duplicate_words')) {
    return {
      reason: isHe
        ? 'המתכון מכיל מילים או ביטויים כפולים — לא ניתן להציג אותו.'
        : 'The recipe contains repeated words or phrases and cannot be shown.',
      missingIngredients: missing,
    }
  }

  if (failures.includes('repeated_parenthetical_ingredients')) {
    return {
      reason: isHe
        ? 'שלבי ההכנה מכילים מרכיבים כפולים בסוגריים — לא ניתן להציג את המתכון.'
        : 'Steps contain duplicated parenthetical ingredients and cannot be shown.',
      missingIngredients: missing,
    }
  }

  if (failures.includes('placeholder_text')) {
    return {
      reason: isHe
        ? 'המתכון מכיל טקסט placeholder — לא ניתן להציג אותו.'
        : 'The recipe contains placeholder text and cannot be shown.',
      missingIngredients: missing,
    }
  }

  return {
    reason: isHe ? 'המתכון לא עבר את בדיקות האיכות.' : 'The recipe did not pass quality checks.',
    missingIngredients: missing,
  }
}
