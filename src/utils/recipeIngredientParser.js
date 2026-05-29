import { getIngredientLabel, INGREDIENT_LABELS_HE } from '../data/ingredientLabels'
import {
  INGREDIENT_SYNONYMS,
  canonicalIngredient,
  ingredientsMatch,
  normalizeIngredient,
} from '../data/ingredientKnowledge'
import {
  MIN_INGREDIENT_MATCH_RATIO,
  ingredientAppearsInText,
  parseUserIngredients,
  validateRecipeRelevance,
} from './ingredientRelevance'
import { applyDescriptiveDishTitle, validateDishTitle } from './recipeTitle'
import { applyRecipeQuantities } from './recipeQuantities'

const LATIN_PATTERN = /[a-z]/i

/** Staples that may appear in the list without being named verbatim in steps. */
const STAPLE_CANONICAL = new Set([
  'salt',
  'pepper',
  'black pepper',
  'oil',
  'olive',
  'olive oil',
  'water',
  'sugar',
])

const SPLIT_PATTERN = /\s*(?:,|;|\n|\+|\band\b|\&|\u05d5(?=\s[\u0590-\u05FFa-z]))\s*/i

const QUANTITY_PREFIX = /^[\d./]+\s*(?:kg|g|gr|gram|grams|ml|l|cup|cups|tbsp|tsp|oz|lb|pcs|piece|pieces|יח|כף|כפות|כוס|כוסות|גרם|ק)?\s*/i

const PAREN_SUFFIX = /\s*\([^)]*\)\s*$/

const SORTED_LABEL_KEYS = Object.keys(INGREDIENT_LABELS_HE).sort((a, b) => b.length - a.length)

export function containsLatinText(text) {
  return LATIN_PATTERN.test(String(text ?? ''))
}

function isStapleIngredient(name) {
  const canon = canonicalIngredient(name)
  return canon != null && STAPLE_CANONICAL.has(canon)
}

function findHebrewAlias(raw) {
  const normalized = normalizeIngredient(raw)
  if (!normalized) return null

  for (const [canonical, aliases] of Object.entries(INGREDIENT_SYNONYMS)) {
    const terms = [canonical, ...aliases].map(normalizeIngredient)
    const hit = terms.some(
      (term) =>
        term &&
        (normalized === term ||
          normalized.includes(term) ||
          term.includes(normalized)),
    )
    if (!hit) continue

    const label = getIngredientLabel(canonical, 'he')
    if (label && !containsLatinText(label)) return label

    const hebrewAlias = aliases.find((alias) => /[\u0590-\u05FF]/.test(alias))
    if (hebrewAlias) return hebrewAlias.trim()
  }

  return null
}

/**
 * Convert a single ingredient phrase to Hebrew. Never returns English for `language === 'he'`.
 */
export function toHebrewIngredient(raw, language = 'he') {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''

  if (language !== 'he') return trimmed

  const withoutSuffix = trimmed.replace(PAREN_SUFFIX, '').trim()
  const withoutQty = withoutSuffix.replace(QUANTITY_PREFIX, '').trim() || withoutSuffix

  if (/[\u0590-\u05FF]/.test(withoutQty) && !containsLatinText(withoutQty)) {
    return withoutQty
  }

  const lower = withoutQty.toLowerCase()

  for (const key of SORTED_LABEL_KEYS) {
    if (lower === key || lower.endsWith(` ${key}`) || lower.startsWith(`${key} `) || lower.includes(` ${key} `)) {
      const label = getIngredientLabel(key, 'he')
      if (label && !containsLatinText(label)) return label
    }
  }

  const direct = getIngredientLabel(withoutQty, 'he')
  if (direct && !containsLatinText(direct)) return direct

  const fromSynonyms = findHebrewAlias(withoutQty)
  if (fromSynonyms) return fromSynonyms

  const canon = canonicalIngredient(withoutQty)
  if (canon) {
    const canonLabel = getIngredientLabel(canon, 'he')
    if (canonLabel && !containsLatinText(canonLabel)) return canonLabel
  }

  return findHebrewAlias(withoutQty) ?? withoutQty
}

/**
 * Split a possibly merged ingredient string into separate items.
 */
export function splitIngredientEntry(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return []

  return trimmed
    .split(SPLIT_PATTERN)
    .map((part) => part.replace(PAREN_SUFFIX, '').replace(QUANTITY_PREFIX, '').trim())
    .filter(Boolean)
}

function dedupeIngredients(list) {
  const seen = []
  for (const item of list) {
    const duplicate = seen.some((existing) => ingredientsMatch(existing, item))
    if (!duplicate) seen.push(item)
  }
  return seen
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hebrewizeSteps(steps, ingredientLabels, language = 'he') {
  if (language !== 'he') return steps

  return steps.map((step) => {
    let text = step
    const replacements = [...ingredientLabels].sort((a, b) => b.length - a.length)

    for (const label of replacements) {
      if (!label || /[\u0590-\u05FF]/.test(label)) continue
      const hebrew = toHebrewIngredient(label, 'he')
      if (hebrew && hebrew !== label) {
        const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, 'gi')
        text = text.replace(pattern, hebrew)
      }
    }

    for (const [canonical, aliases] of Object.entries(INGREDIENT_SYNONYMS)) {
      const hebrew = getIngredientLabel(canonical, 'he')
      if (!hebrew || containsLatinText(hebrew)) continue
      for (const alias of [canonical, ...aliases]) {
        if (!alias || /[\u0590-\u05FF]/.test(alias)) continue
        const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'gi')
        text = text.replace(pattern, hebrew)
      }
    }

    return text
  })
}

function ingredientUsedInSteps(ingredient, steps) {
  const stepsText = steps.join('\n')
  if (ingredientAppearsInText(ingredient, stepsText)) return true
  if (isStapleIngredient(ingredient)) return true
  return false
}

function ensureUserIngredientsPresent(userIngredients, ingredients, steps, language) {
  let nextIngredients = [...ingredients]
  let nextSteps = [...steps]

  for (const userIng of userIngredients) {
    const hebrewForm =
      /[\u0590-\u05FF]/.test(userIng) && !containsLatinText(userIng)
        ? userIng.trim()
        : toHebrewIngredient(userIng, language)

    const inList = nextIngredients.some((item) => ingredientsMatch(item, hebrewForm))
    if (!inList) {
      nextIngredients.unshift(hebrewForm)
    }

    const inSteps = ingredientUsedInSteps(hebrewForm, nextSteps)
    if (!inSteps && nextSteps.length > 0) {
      nextSteps[0] = `${nextSteps[0]} (${hebrewForm})`
    }
  }

  return { ingredients: dedupeIngredients(nextIngredients), steps: nextSteps }
}

function filterIngredientsUsedInSteps(ingredients, steps) {
  return ingredients.filter(
    (item) => isStapleIngredient(item) || ingredientUsedInSteps(item, steps),
  )
}

/**
 * Normalize recipe ingredients and steps to Hebrew with clean separation.
 */
export function normalizeRecipeIngredients(recipe, userIngredientsRaw = '', language = 'he') {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  const rawEntries = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

  const expanded = rawEntries.flatMap((entry) => splitIngredientEntry(entry))
  const hebrewized = expanded
    .map((entry) => toHebrewIngredient(entry, language))
    .filter(Boolean)

  let ingredients = dedupeIngredients(hebrewized)
  let steps = Array.isArray(recipe.steps) ? [...recipe.steps] : []

  ;({ ingredients, steps } = ensureUserIngredientsPresent(
    userIngredients,
    ingredients,
    steps,
    language,
  ))

  steps = hebrewizeSteps(steps, ingredients, language)
  ingredients = filterIngredientsUsedInSteps(ingredients, steps)

  ;({ ingredients, steps } = ensureUserIngredientsPresent(
    userIngredients,
    ingredients,
    steps,
    language,
  ))

  return {
    ...recipe,
    ingredients: dedupeIngredients(ingredients),
    steps,
  }
}

/**
 * Full quality validation including Hebrew-only ingredients and step usage.
 */
export function validateRecipeQuality(userIngredients, recipe, language = 'he', options = {}) {
  const relevance = validateRecipeRelevance(userIngredients, recipe)
  const stepsText = (recipe.steps ?? []).join('\n')
  const titleValidation = validateDishTitle(recipe.name, recipe.ingredients ?? [])

  const englishIngredients = (recipe.ingredients ?? []).filter((item) =>
    containsLatinText(item),
  )

  const unusedInSteps = (recipe.ingredients ?? []).filter(
    (item) => !isStapleIngredient(item) && !ingredientAppearsInText(item, stepsText),
  )

  const userExplicitMissing = userIngredients.filter(
    (userIng) =>
      !(recipe.ingredients ?? []).some((item) => ingredientsMatch(item, userIng)) ||
      !ingredientAppearsInText(userIng, stepsText),
  )

  const stepScore =
    recipe.ingredients?.length > 0
      ? 1 - unusedInSteps.length / recipe.ingredients.length
      : 1

  const hebrewScore = englishIngredients.length === 0 ? 1 : 0

  const ingredientRelevanceScore = Math.round(
    relevance.matchRatio * 70 + stepScore * 20 + hebrewScore * 10,
  )

  const ok =
    relevance.ok &&
    englishIngredients.length === 0 &&
    unusedInSteps.length === 0 &&
    userExplicitMissing.length === 0 &&
    titleValidation.ok

  return {
    ok,
    ingredientRelevanceScore,
    matchRatio: relevance.matchRatio,
    titleHasIngredient: relevance.titleHasIngredient,
    matched: relevance.matched,
    unmatched: relevance.unmatched,
    englishIngredients,
    unusedInSteps,
    userExplicitMissing,
    titleValidation,
    relevance,
  }
}

/**
 * Parse, Hebrewize, and validate a generated recipe.
 */
export function applyRecipeIngredientParser(recipe, userIngredientsRaw = '', language = 'he', options = {}) {
  const normalized = normalizeRecipeIngredients(recipe, userIngredientsRaw, language)
  const titled = applyDescriptiveDishTitle(normalized, {
    cookingTime: options.cookingTime,
    style: options.style,
    language,
  })
  const quantified = applyRecipeQuantities(titled, {
    language,
    servings: titled.nutrition?.servings,
  })
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  const validation = validateRecipeQuality(userIngredients, quantified, language, options)

  return {
    recipe: {
      ...quantified,
      matchPercentage: validation.ingredientRelevanceScore,
    },
    validation,
  }
}

export function isRecipeAcceptable(userIngredientsRaw, recipe, language = 'he') {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) {
    const validation = validateRecipeQuality([], recipe, language)
    return validation.ok && validation.englishIngredients.length === 0
  }

  const validation = validateRecipeQuality(userIngredients, recipe, language)
  return validation.ok && validation.matchRatio >= MIN_INGREDIENT_MATCH_RATIO
}
