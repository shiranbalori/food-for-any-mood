import { getIngredientLabel, INGREDIENT_LABELS_HE } from '../data/ingredientLabels'
import {
  INGREDIENT_SYNONYMS,
  canonicalIngredient,
  ingredientsMatch,
  normalizeIngredient,
} from '../data/ingredientKnowledge'
import {
  MIN_INGREDIENT_MATCH_RATIO,
  computeUserIngredientMatchPercent,
  ingredientAppearsInText,
  parseUserIngredients,
  validateRecipeRelevance,
} from './ingredientRelevance'
import { applyDescriptiveDishTitle, validateDishTitle } from './recipeTitle'
import { applyRecipeQuantities } from './recipeQuantities'
import { sanitizeIngredientList, sanitizeRecipeSteps, stripIngredientBullets, isValidIngredientLine, lightSanitizeRecipeSteps } from './ingredientFormatting'
import {
  formatStepIngredientList,
  hasUnnaturalStepPhrasing,
  verifyStepIngredientAlignment,
} from './recipeStepWording'
import {
  formatHebrewMeasurement,
  parseAnyLeadingMeasurement,
  stripQuantityPrefix,
} from './measurementUnits'
import {
  stepHasMeaningfulAction,
  validateRecipeBeforeReturn,
} from './recipePreReturnValidation'
import { applyDerivedRecipeTags } from './recipeTags'
import { logRecipeQualitySnapshot } from './recipeQualityLog'
import {
  logRecipeGroundingDecision,
  repairRecipeGrounding,
  validateRecipeGrounding,
} from './recipeGrounding'
import { buildStepsFromUserIngredients } from './userIngredientSteps'

const LATIN_PATTERN = /[a-z]/i

import {
  findUnauthorizedRecipeIngredients,
  isRecipeIngredientAllowed,
  isSystemPantryIngredient,
  SYSTEM_PANTRY_CANONICAL,
} from './ingredientAllowlist'

const SPLIT_PATTERN = /\s*(?:,|;|\n|\+|\band\b|\&|\u05d5(?=\s[\u0590-\u05FFa-z]))\s*/i

const PAREN_SUFFIX = /\s*\([^)]*\)\s*$/

const SORTED_LABEL_KEYS = Object.keys(INGREDIENT_LABELS_HE).sort((a, b) => b.length - a.length)

export function containsLatinText(text) {
  return LATIN_PATTERN.test(String(text ?? ''))
}

function isStapleIngredient(name) {
  return isSystemPantryIngredient(name)
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
 * Translate an ingredient name (without leading quantity/unit) to Hebrew.
 */
function toHebrewIngredientName(raw) {
  const withoutQty = stripQuantityPrefix(String(raw ?? '').trim())
  if (!withoutQty) return ''

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
 * Convert a single ingredient phrase to Hebrew. Never returns English for `language === 'he'`.
 */
export function toHebrewIngredient(raw, language = 'he') {
  const trimmed = stripIngredientBullets(String(raw ?? '').trim())
  if (!trimmed || !isValidIngredientLine(trimmed)) return ''

  if (language !== 'he') return trimmed

  const withoutSuffix = trimmed.replace(PAREN_SUFFIX, '').trim()
  const measured = parseAnyLeadingMeasurement(withoutSuffix)
  if (measured) {
    return formatHebrewMeasurement(measured.qty, measured.unit, toHebrewIngredientName(measured.name))
  }

  return toHebrewIngredientName(withoutSuffix)
}

/**
 * Split a possibly merged ingredient string into separate items.
 */
export function splitIngredientEntry(raw) {
  const trimmed = stripIngredientBullets(String(raw ?? '').trim())
  if (!trimmed) return []

  return trimmed
    .split(SPLIT_PATTERN)
    .map((part) => part.replace(PAREN_SUFFIX, '').trim())
    .filter((part) => part && isValidIngredientLine(part))
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

function toLocalizedIngredient(raw, language = 'he') {
  if (language === 'he') return toHebrewIngredient(raw, language)
  const trimmed = stripIngredientBullets(String(raw ?? '').trim())
  if (!trimmed || !isValidIngredientLine(trimmed)) return ''
  const canon = canonicalIngredient(stripQuantityPrefix(trimmed))
  return getIngredientLabel(canon ?? stripQuantityPrefix(trimmed), 'en') || trimmed
}

function ensureUserIngredientsInList(userIngredients, ingredients, language) {
  const nextIngredients = [...ingredients]

  for (const userIng of userIngredients) {
    const localized =
      /[\u0590-\u05FF]/.test(userIng) && !containsLatinText(userIng) && language === 'he'
        ? userIng.trim()
        : toLocalizedIngredient(userIng, language)

    const inList = nextIngredients.some((item) => ingredientsMatch(item, localized))
    if (!inList && localized) {
      nextIngredients.unshift(localized)
    }
  }

  return dedupeIngredients(nextIngredients)
}

function filterIngredientsUsedInSteps(ingredients, steps, userIngredients = [], language = 'he') {
  return ingredients.filter((item) => {
    if (userIngredients.length > 0 && !isRecipeIngredientAllowed(item, userIngredients)) {
      return false
    }
    const isUserIngredient = userIngredients.some((userIng) =>
      ingredientsMatch(item, toLocalizedIngredient(userIng, language)),
    )
    if (isUserIngredient) return true
    return isStapleIngredient(item) || ingredientUsedInSteps(item, steps)
  })
}

/**
 * Normalize recipe ingredients and steps to Hebrew with clean separation.
 */
export function normalizeRecipeIngredients(recipe, userIngredientsRaw = '', language = 'he') {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  const rawEntries = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

  const expanded = rawEntries.flatMap((entry) => splitIngredientEntry(entry))
  const localized = expanded
    .map((entry) => (language === 'he' ? toHebrewIngredient(entry, language) : toLocalizedIngredient(entry, language)))
    .filter(Boolean)

  let ingredients = dedupeIngredients(localized)
  let steps = Array.isArray(recipe.steps) ? [...recipe.steps] : []

  ingredients = ensureUserIngredientsInList(userIngredients, ingredients, language)
  steps = hebrewizeSteps(steps, ingredients, language)
  ingredients = filterIngredientsUsedInSteps(ingredients, steps, userIngredients, language)
  ingredients = ensureUserIngredientsInList(userIngredients, ingredients, language)

  return {
    ...recipe,
    ingredients: sanitizeIngredientList(dedupeIngredients(ingredients)),
    steps: sanitizeRecipeSteps(steps),
  }
}

/**
 * Full quality validation. Returns a detailed report; rules are advisory except
 * invalid ingredients, language mix, and missing user ingredients in the list.
 */
function buildSafeValidationReport(partial = {}) {
  return {
    ok: false,
    checks: partial.checks ?? {},
    ingredientRelevanceScore: partial.ingredientRelevanceScore ?? 0,
    matchRatio: partial.matchRatio ?? 0,
    titleHasIngredient: partial.titleHasIngredient ?? false,
    matched: partial.matched ?? [],
    unmatched: partial.unmatched ?? [],
    englishIngredients: partial.englishIngredients ?? [],
    hebrewIngredients: partial.hebrewIngredients ?? [],
    unusedInSteps: partial.unusedInSteps ?? [],
    userExplicitMissing: partial.userExplicitMissing ?? [],
    userMissingFromSteps: partial.userMissingFromSteps ?? [],
    titleValidation: partial.titleValidation ?? { ok: false },
    relevance: partial.relevance ?? { ok: false, matchRatio: 0, matched: [], unmatched: [] },
    invalidIngredients: partial.invalidIngredients ?? [],
    unnaturalSteps: partial.unnaturalSteps ?? [],
    weakSteps: partial.weakSteps ?? [],
    preReturn: partial.preReturn ?? {
      ok: false,
      failures: ['validation_error'],
      unauthorizedIngredients: [],
    },
    stepsAligned: partial.stepsAligned ?? true,
    stepScore: partial.stepScore ?? 0,
    unauthorizedIngredients: partial.unauthorizedIngredients ?? [],
    validationError: partial.validationError ?? null,
  }
}

export function validateRecipeQuality(userIngredients, recipe, language = 'he', options = {}) {
  try {
    return validateRecipeQualityCore(userIngredients, recipe, language, options)
  } catch (error) {
    console.warn('[recipeIngredientParser] validateRecipeQuality failed:', error)
    return buildSafeValidationReport({
      validationError: error instanceof Error ? error.message : String(error),
      unauthorizedIngredients: [],
    })
  }
}

function validateRecipeQualityCore(userIngredients, recipe, language = 'he', options = {}) {
  const relevance = validateRecipeRelevance(userIngredients, recipe)
  const stepsText = (recipe.steps ?? []).join('\n')
  const titleValidation = validateDishTitle(recipe.name, recipe.ingredients ?? [], language, userIngredients)
  const grounding = validateRecipeGrounding(userIngredients, recipe, language)

  const englishIngredients = (recipe.ingredients ?? []).filter((item) =>
    containsLatinText(item),
  )

  const hebrewIngredients = (recipe.ingredients ?? []).filter(
    (item) => /[\u0590-\u05FF]/.test(item) && !containsLatinText(item),
  )

  const unusedInSteps = (recipe.ingredients ?? []).filter(
    (item) => !isStapleIngredient(item) && !ingredientAppearsInText(item, stepsText),
  )

  const userExplicitMissing = userIngredients.filter(
    (userIng) => !(recipe.ingredients ?? []).some((item) => ingredientsMatch(item, userIng)),
  )

  const userMissingFromSteps = userIngredients.filter(
    (userIng) => !ingredientAppearsInText(userIng, stepsText),
  )

  const stepScore =
    recipe.ingredients?.length > 0
      ? 1 - unusedInSteps.length / recipe.ingredients.length
      : 1

  const hebrewScore = englishIngredients.length === 0 ? 1 : 0
  const englishScore = hebrewIngredients.length === 0 ? 1 : 0
  const languageScore = language === 'en' ? englishScore : hebrewScore

  const ingredientRelevanceScore = computeUserIngredientMatchPercent(userIngredients, recipe)

  const languageOk = language === 'he' ? englishIngredients.length === 0 : hebrewIngredients.length === 0

  const invalidIngredients = (recipe.ingredients ?? []).filter(
    (item) => !isValidIngredientLine(item),
  )

  const unnaturalSteps = hasUnnaturalStepPhrasing(recipe.steps ?? [], language)
  const weakSteps = (recipe.steps ?? []).filter((step) => !stepHasMeaningfulAction(step))
  const preReturn = validateRecipeBeforeReturn(recipe, userIngredients.join(', '), { language })
  const unauthorizedIngredients = preReturn?.unauthorizedIngredients ?? []
  const unauthorizedOk = userIngredients.length === 0 || unauthorizedIngredients.length === 0
  const stepsAligned = verifyStepIngredientAlignment(
    recipe.ingredients ?? [],
    recipe.steps ?? [],
    language,
    { staples: SYSTEM_PANTRY_CANONICAL },
  )

  const ingredientCount = recipe.ingredients?.length ?? 0
  const maxUnusedNonStaples = Math.max(2, Math.ceil(ingredientCount * 0.4))
  const relevanceOk =
    userIngredients.length === 0 ||
    (relevance.matchRatio >= MIN_INGREDIENT_MATCH_RATIO && relevance.titleHasIngredient)
  const unusedOk = unusedInSteps.length <= maxUnusedNonStaples
  const invalidOk = invalidIngredients.length === 0
  const userIngredientsOk = userExplicitMissing.length === 0
  const titleOk = titleValidation.ok
  const groundingOk = userIngredients.length === 0 || grounding.ok
  const maxAllowedWeakSteps = (recipe.steps?.length ?? 0) >= 4 ? 1 : 0
  const stepsQualityOk =
    stepsAligned && unnaturalSteps.length === 0 && weakSteps.length <= maxAllowedWeakSteps

  const checks = {
    invalidIngredients: invalidOk,
    languageOk,
    relevanceOk,
    unusedInStepsOk: unusedOk,
    userIngredientsInList: userIngredientsOk,
    titleOk,
    groundingOk,
    stepsAligned,
    noUnnaturalSteps: unnaturalSteps.length === 0,
    meaningfulStepActions: weakSteps.length <= ((recipe.steps?.length ?? 0) >= 4 ? 1 : 0),
    preReturnOk: preReturn.ok,
    unauthorizedIngredientsOk: unauthorizedOk,
  }

  const ok =
    invalidOk &&
    languageOk &&
    relevanceOk &&
    unusedOk &&
    userIngredientsOk &&
    preReturn.ok &&
    unauthorizedOk &&
    titleOk &&
    groundingOk &&
    stepsQualityOk

  let finalOk = ok
  if (!finalOk && userIngredients.length === 0) {
    const structuralOk =
      (recipe.ingredients?.length ?? 0) >= 3 &&
      (recipe.steps?.length ?? 0) >= 4 &&
      invalidOk &&
      languageOk &&
      Boolean(String(recipe.name ?? '').trim())
    if (structuralOk) {
      finalOk = true
      checks.preferenceBasedRelaxed = true
    }
  }

  return {
    ok: finalOk,
    checks,
    ingredientRelevanceScore,
    matchRatio: relevance.matchRatio,
    titleHasIngredient: relevance.titleHasIngredient,
    matched: relevance.matched,
    unmatched: relevance.unmatched,
    englishIngredients,
    hebrewIngredients,
    unusedInSteps,
    userExplicitMissing,
    userMissingFromSteps,
    titleValidation,
    grounding,
    relevance,
    invalidIngredients,
    unnaturalSteps,
    weakSteps,
    preReturn,
    stepsAligned,
    stepScore,
    unauthorizedIngredients,
  }
}

/**
 * Log every validation dimension to the console for debugging rejections.
 */
export function logRecipeValidationDetails(report, extra = {}) {
  const failedChecks = Object.entries(report.checks ?? {})
    .filter(([, passed]) => !passed)
    .map(([name]) => name)

  console.group('[aiRecipeService] Recipe validation details')
  console.log('validationPassed:', report.ok)
  console.log('failedChecks:', failedChecks.length ? failedChecks : '(none)')
  console.log('checks:', report.checks)
  console.log('invalidIngredients:', report.invalidIngredients ?? [])
  console.log('unauthorizedIngredients:', report.unauthorizedIngredients ?? [])
  console.log('unusedInSteps:', report.unusedInSteps ?? [])
  console.log('userExplicitMissing (not in list):', report.userExplicitMissing ?? [])
  console.log('userMissingFromSteps:', report.userMissingFromSteps ?? [])
  console.log('unnaturalSteps:', report.unnaturalSteps ?? [])
  console.log('stepsAligned:', report.stepsAligned)
  console.log('titleMismatch:', report.titleValidation?.ok === false ? report.titleValidation : null)
  console.log('grounding:', report.grounding ?? null)
  console.log('relevance:', {
    ok: report.relevance?.ok,
    matchRatio: report.matchRatio,
    matched: report.matched,
    unmatched: report.unmatched,
    titleHasIngredient: report.titleHasIngredient,
  })
  if (extra.categoryMismatch != null) {
    console.log('categoryMismatch:', extra.categoryMismatch)
  }
  if (extra.languageMismatch != null) {
    console.log('languageMismatch:', extra.languageMismatch)
  }
  if (extra.generatedTitle) {
    console.log('generatedTitle:', extra.generatedTitle)
  }
  console.groupEnd()
}

/**
 * Parse, Hebrewize, and validate a generated recipe.
 */
export function applyRecipeIngredientParser(recipe, userIngredientsRaw = '', language = 'he', options = {}) {
  const preserveOriginalSteps = Boolean(options.preserveOriginalSteps)
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  const normalized = normalizeRecipeIngredients(recipe, userIngredientsRaw, language)
  const titled = applyDescriptiveDishTitle(normalized, {
    cookingTime: options.cookingTime,
    style: options.style,
    language,
    recipeType: options.recipeType ?? 'meal',
    category: options.category ?? 'dairy',
    userIngredients,
  })
  const quantified = applyRecipeQuantities(titled, {
    language,
    servings: options.servings ?? titled.nutrition?.servings,
    preserveOriginalSteps,
    recipeType: options.recipeType ?? 'meal',
  })
  const ingredients = sanitizeIngredientList(
    dedupeIngredients(quantified.ingredients ?? []),
  )
  const steps = preserveOriginalSteps
    ? lightSanitizeRecipeSteps(quantified.steps ?? [])
    : sanitizeRecipeSteps(quantified.steps ?? [])

  const finalized = {
    ...quantified,
    ingredients,
    steps,
  }

  let tagged = applyDerivedRecipeTags(finalized, {
    category: options.category ?? 'dairy',
    isGlutenFree: Boolean(options.isGlutenFree),
    recipeType: options.recipeType ?? 'meal',
    spiceLevel: finalized.spiceLevel ?? 0,
    cookTime: options.cookingTime ?? 30,
  })

  if (userIngredients.length > 0) {
    tagged = repairRecipeGrounding(tagged, userIngredientsRaw, language, {
      excludeTitles: options.excludeTitles ?? [],
    })
  }

  if (
    userIngredients.length > 0 &&
    (hasUnnaturalStepPhrasing(tagged.steps ?? [], language).length > 0 ||
      !verifyStepIngredientAlignment(tagged.ingredients ?? [], tagged.steps ?? [], language, {
        staples: SYSTEM_PANTRY_CANONICAL,
      }))
  ) {
    const currentSteps = tagged.steps ?? []
    const currentWeakCount = currentSteps.filter((step) => !stepHasMeaningfulAction(step)).length
    const rebuiltSteps = buildStepsFromUserIngredients(tagged.ingredients ?? [], {
      recipeType: options.recipeType ?? 'meal',
      language,
      cookingTime: options.cookingTime ?? 30,
    })
    const rebuiltWeakCount = rebuiltSteps.filter((step) => !stepHasMeaningfulAction(step)).length
    if (
      rebuiltSteps.length >= 4 &&
      (currentWeakCount > 1 || rebuiltWeakCount < currentWeakCount)
    ) {
      tagged = { ...tagged, steps: rebuiltSteps }
    }
  }

  let validation = validateRecipeQuality(userIngredients, tagged, language, options)
  const safeValidation = {
    ...validation,
    unauthorizedIngredients: validation?.unauthorizedIngredients ?? [],
  }

  const hasUserIngredients = userIngredients.length > 0

  logRecipeQualitySnapshot({
    userIngredientsRaw,
    recipe: tagged,
    validation,
    tags: tagged.tags,
    source: options.source ?? 'parser',
  })

  logRecipeGroundingDecision({
    userIngredientsRaw,
    recipe: tagged,
    grounding: validation.grounding,
    accepted: validation.ok,
    source: options.source ?? 'parser',
  })

  return {
    recipe: {
      ...tagged,
      matchPercentage: hasUserIngredients
        ? computeUserIngredientMatchPercent(userIngredients, tagged)
        : tagged.matchPercentage,
      generatedFromPreferences: !hasUserIngredients,
      optionalUpgrades: hasUserIngredients ? (tagged.optionalUpgrades ?? []) : [],
    },
    validation: safeValidation,
  }
}

export function isRecipeAcceptable(userIngredientsRaw, recipe, language = 'he') {
  const userIngredients = parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) {
    const validation = validateRecipeQuality([], recipe, language)
    if (language === 'en') {
      return validation.ok
    }
    return validation.ok && validation.englishIngredients.length === 0
  }

  const validation = validateRecipeQuality(userIngredients, recipe, language)
  return validation.ok && validation.matchRatio >= MIN_INGREDIENT_MATCH_RATIO
}
