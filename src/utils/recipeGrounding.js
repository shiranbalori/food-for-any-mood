import { getIngredientLabel } from '../data/ingredientLabels'
import {
  INGREDIENT_SYNONYMS,
  canonicalIngredient,
  ingredientsMatch,
  normalizeIngredient,
} from '../data/ingredientKnowledge'
import { getSystemPantryItems, isSystemPantryIngredient } from './ingredientAllowlist'
import { ingredientAppearsInText, parseUserIngredients } from './ingredientRelevance'
import { stripQuantityPrefix } from './measurementUnits'

const QTY_PREFIX =
  /^[\d./]+\s*(?:כפית|כפיות|כף|כפות|גרם|מ"ל|כוס|כוסות|tsp|tbsp|gram|grams|g|ml|cup|cups)?\s*/i

/** Pantry items allowed in recipes without being listed by the user. */
export const HELPER_PANTRY_CANONICAL = new Set([
  'water',
  'salt',
  'black pepper',
  'oil',
  'olive',
  'olive oil',
  'garlic',
  'baking powder',
])

const SKIP_TITLE_SCAN_CANONICAL = new Set([
  ...HELPER_PANTRY_CANONICAL,
  'vanilla',
  'herbs',
  'parsley',
  'cilantro',
])

const TITLE_STYLE_TERMS = new Set([
  'ביתית',
  'ביתי',
  'מהירה',
  'זהובה',
  'זהב',
  'קלילה',
  'חם',
  'חמה',
  'מרגש',
  'מושלם',
  'מושלמת',
  'homestyle',
  'homemade',
  'quick',
  'golden',
  'warm',
  'classic',
  'skillet',
  'stew',
  'dish',
  'meal',
  'style',
  'sauce',
  'רוטב',
  'מנה',
  'תבשיל',
  'בסגנון',
  'בית',
])

function stripQty(raw) {
  return stripQuantityPrefix(String(raw ?? '').replace(QTY_PREFIX, '').trim())
}

function canonicalInIngredientList(canon, ingredientList = []) {
  if (!canon) return false
  return ingredientList.some((item) => {
    const itemCanon = canonicalIngredient(stripQty(item))
    return itemCanon === canon || ingredientsMatch(item, canon)
  })
}

function userHasCanonical(canon, userIngredients = []) {
  if (!canon) return false
  return userIngredients.some((item) => {
    const userCanon = canonicalIngredient(stripQty(item))
    return userCanon === canon || ingredientsMatch(item, canon)
  })
}

function isAllowedHelperCanonical(canon, userIngredients = []) {
  if (!canon) return false
  if (HELPER_PANTRY_CANONICAL.has(canon)) return true
  if (isSystemPantryIngredient(canon)) return true
  return getSystemPantryItems(userIngredients).some((item) => ingredientsMatch(item, canon))
}

function collectSearchTerms(canon, language = 'he') {
  const aliases = INGREDIENT_SYNONYMS[canon] ?? []
  const labels = [getIngredientLabel(canon, 'he'), getIngredientLabel(canon, 'en')].filter(Boolean)
  return [...new Set([canon, ...aliases, ...labels])]
    .map((term) => normalizeIngredient(term))
    .filter((term) => term.length >= 3)
}

function textMentionsTerm(text, term) {
  const normalized = normalizeIngredient(text)
  if (!normalized || !term) return false
  if (normalized.includes(term) || term.includes(normalized)) return true
  if (term.length >= 4) {
    return normalized.split(/\s+/).some((word) => word.includes(term) || term.includes(word))
  }
  return false
}

/**
 * Find ingredient mentions in text that are not present in the recipe ingredient list.
 */
export function findTextIngredientViolations(text, recipeIngredients = [], userIngredients = [], language = 'he') {
  const normalizedText = normalizeIngredient(text)
  if (!normalizedText) return []

  const violations = []
  for (const [canon] of Object.entries(INGREDIENT_SYNONYMS)) {
    if (SKIP_TITLE_SCAN_CANONICAL.has(canon)) continue
    if (TITLE_STYLE_TERMS.has(canon)) continue

    const terms = collectSearchTerms(canon, language)
    const matchedTerm = terms.find((term) => textMentionsTerm(normalizedText, term))
    if (!matchedTerm) continue

    const inRecipe = canonicalInIngredientList(canon, recipeIngredients)
    const allowedHelper = isAllowedHelperCanonical(canon, userIngredients)
    if (!inRecipe && !allowedHelper) {
      violations.push({ canonical: canon, matchedTerm })
    }
  }

  return violations
}

export function validateTitleGrounding(title, recipeIngredients = [], userIngredients = [], language = 'he') {
  const violations = findTextIngredientViolations(title, recipeIngredients, userIngredients, language)
  return {
    ok: violations.length === 0,
    violations,
  }
}

export function validateDescriptionGrounding(description, recipeIngredients = [], userIngredients = [], language = 'he') {
  const violations = findTextIngredientViolations(description, recipeIngredients, userIngredients, language)
  return {
    ok: violations.length === 0,
    violations,
  }
}

export function validateRecipeGrounding(userIngredientsRaw, recipe, language = 'he') {
  const userIngredients = Array.isArray(userIngredientsRaw)
    ? userIngredientsRaw
    : parseUserIngredients(userIngredientsRaw)

  if (!userIngredients.length) {
    return {
      ok: true,
      titleOk: true,
      descriptionOk: true,
      titleViolations: [],
      descriptionViolations: [],
    }
  }

  const recipeIngredients = recipe?.ingredients ?? []
  const titleCheck = validateTitleGrounding(recipe?.name ?? '', recipeIngredients, userIngredients, language)
  const descriptionCheck = validateDescriptionGrounding(
    recipe?.description ?? '',
    recipeIngredients,
    userIngredients,
    language,
  )

  return {
    ok: titleCheck.ok && descriptionCheck.ok,
    titleOk: titleCheck.ok,
    descriptionOk: descriptionCheck.ok,
    titleViolations: titleCheck.violations,
    descriptionViolations: descriptionCheck.violations,
  }
}

function getGroundedMainLabels(userIngredients = [], recipeIngredients = [], language = 'he') {
  const source = userIngredients.length ? userIngredients : recipeIngredients
  return [...new Set(source.map((item) => {
    const bare = stripQty(item)
    if (/[\u0590-\u05FF]/.test(bare) && !/[a-z]/i.test(bare)) return bare
    const canon = canonicalIngredient(bare)
    return getIngredientLabel(canon ?? bare, language) || bare
  }).filter(Boolean))]
}

function getGroundedMainCanon(userIngredients = [], recipeIngredients = []) {
  const source = userIngredients.length ? userIngredients : recipeIngredients
  return [...new Set(source.map((item) => canonicalIngredient(stripQty(item))).filter(Boolean))]
    .filter((canon) => !HELPER_PANTRY_CANONICAL.has(canon) && !isSystemPantryIngredient(canon))
}

function pickFirstAllowedTitle(candidates, recipeIngredients, userIngredients, language, excludeTitles = []) {
  for (const candidate of candidates) {
    if (!candidate || excludeTitles.includes(candidate)) continue
    if (validateTitleGrounding(candidate, recipeIngredients, userIngredients, language).ok) {
      return candidate
    }
  }
  return null
}

/**
 * Build a chef-style title using only user-provided ingredients (+ helpers in the list).
 */
export function buildGroundedChefTitle(
  userIngredients = [],
  recipeIngredients = [],
  language = 'he',
  { excludeTitles = [] } = {},
) {
  const mains = getGroundedMainLabels(userIngredients, recipeIngredients, language)
  const mainCanon = getGroundedMainCanon(userIngredients, recipeIngredients)
  const secondary = mains.filter((label) => !ingredientAppearsInText('pasta', label) && !/פסטה|pasta/i.test(label))

  const candidates = []

  if (mainCanon.includes('pasta')) {
    const hasEgg = mainCanon.includes('egg') || mainCanon.includes('eggs')
    if (hasEgg) {
      candidates.push(
        language === 'he' ? 'פסטה זהובה עם ביצים' : 'Golden pasta with eggs',
        language === 'he' ? 'פסטה ביתית עם ביצה' : 'Homestyle pasta with egg',
        language === 'he' ? 'פסטה מהירה עם ביצים' : 'Quick pasta with eggs',
      )
    } else if (secondary.length > 0) {
      const extra = secondary[0]
      candidates.push(
        language === 'he' ? `פסטה ביתית עם ${extra}` : `Homestyle pasta with ${extra}`,
        language === 'he' ? `פסטה מהירה עם ${extra}` : `Quick pasta with ${extra}`,
      )
    } else {
      candidates.push(
        language === 'he' ? 'פסטה ביתית' : 'Homestyle pasta',
        language === 'he' ? 'פסטה מהירה' : 'Quick pasta',
      )
    }
  } else if (mainCanon.includes('egg') || mainCanon.includes('eggs')) {
    if (mainCanon.includes('tomato')) {
      candidates.push(
        language === 'he' ? 'חביתת עגבניות' : 'Tomato omelette',
        language === 'he' ? 'ביצים ברוטב עגבניות' : 'Eggs in tomato sauce',
      )
    } else if (secondary.length > 0) {
      const extra = secondary[0]
      candidates.push(
        language === 'he' ? `חבית ${extra}` : `${extra} omelette`,
        language === 'he' ? `${extra} עם ביצים` : `${extra} with eggs`,
      )
    } else {
      candidates.push(language === 'he' ? 'חבית ביתית' : 'Homestyle omelette')
    }
  } else if (mainCanon.includes('rice')) {
    if (secondary.length > 0) {
      const extra = secondary[0]
      candidates.push(
        language === 'he' ? `אורז עם ${extra}` : `Rice with ${extra}`,
        language === 'he' ? `תבשיל אורז ו${extra}` : `${extra} rice dish`,
      )
    } else {
      candidates.push(language === 'he' ? 'אורז ביתי' : 'Homestyle rice')
    }
  } else if (mains.length >= 2) {
    const [first, second] = mains
    candidates.push(
      language === 'he' ? `${first} עם ${second}` : `${first} with ${second}`,
      language === 'he' ? `מנה חמה עם ${first}` : `Warm ${first} dish`,
    )
  } else if (mains.length === 1) {
    const first = mains[0]
    candidates.push(
      language === 'he' ? `${first} במחבת` : `${first} skillet`,
      language === 'he' ? `מנה חמה עם ${first}` : `Warm ${first} dish`,
    )
  }

  const picked = pickFirstAllowedTitle(candidates, recipeIngredients, userIngredients, language, excludeTitles)
  if (picked) return picked

  if (mains.length >= 2) {
    const fallback = language === 'he' ? `${mains[0]} עם ${mains[1]}` : `${mains[0]} with ${mains[1]}`
    if (validateTitleGrounding(fallback, recipeIngredients, userIngredients, language).ok) {
      return fallback
    }
  }

  return language === 'he' ? 'מנה ביתית מהמטבח' : 'Homestyle dish'
}

export function repairRecipeGrounding(recipe, userIngredientsRaw, language = 'he', options = {}) {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) return recipe

  const recipeIngredients = recipe.ingredients ?? []
  let name = recipe.name ?? ''
  let description = recipe.description ?? ''

  const titleCheck = validateTitleGrounding(name, recipeIngredients, userIngredients, language)
  if (!titleCheck.ok) {
    name = buildGroundedChefTitle(userIngredients, recipeIngredients, language, {
      excludeTitles: options.excludeTitles ?? [],
    })
  }

  const descriptionCheck = validateDescriptionGrounding(description, recipeIngredients, userIngredients, language)
  if (!descriptionCheck.ok) {
    description = language === 'he'
      ? `מנה פשוטה וטעימה שנבנתה מהמרכיבים שציינתם — ${name}.`
      : `A simple, tasty dish built from the ingredients you listed — ${name}.`
  }

  return { ...recipe, name, description }
}

export function logRecipeGroundingDecision({
  userIngredientsRaw = '',
  recipe = null,
  grounding = null,
  accepted = null,
  source = 'unknown',
} = {}) {
  const normalized = parseUserIngredients(userIngredientsRaw)
  console.group(`[recipeGrounding] ${accepted ? 'accepted' : 'rejected'}`)
  console.log('source:', source)
  console.log('userIngredients:', userIngredientsRaw)
  console.log('normalizedIngredients:', normalized)
  console.log('recipeTitle:', recipe?.name ?? null)
  console.log('recipeIngredients:', recipe?.ingredients ?? [])
  console.log('validationResult:', grounding)
  if (grounding?.titleViolations?.length) {
    console.log('titleViolations:', grounding.titleViolations)
  }
  if (grounding?.descriptionViolations?.length) {
    console.log('descriptionViolations:', grounding.descriptionViolations)
  }
  console.groupEnd()
}
