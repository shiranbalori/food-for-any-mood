import { getIngredientLabel } from '../data/ingredientLabels'
import { canonicalIngredient, normalizeIngredient } from '../data/ingredientKnowledge'
import {
  isNumericOnlyText,
  isValidIngredientLine,
  sanitizeIngredientList,
  sanitizeRecipeSteps,
  toReadableIngredientLine,
} from './ingredientFormatting'
import { alignStepsWithIngredientList, naturalizeRecipeSteps, toStepIngredientReference } from './recipeStepWording'
import { calculateHealthScoreFromRecipe } from './nutritionScore'
import {
  formatHebrewMeasurement,
  MEASURED_UNIT_TOKEN,
  parseAmount,
  parseAnyLeadingMeasurement,
  stripQuantityPrefix,
  UNIT_LABELS,
} from './measurementUnits'

export const DEFAULT_SERVINGS = 2

const PANTRY_SUFFIX = /\s*\([^)]*\)\s*$/

const STAPLE_PROFILE_KEYS = {
  salt: 'salt',
  מלח: 'salt',
  pepper: 'black pepper',
  'black pepper': 'black pepper',
  'פלפל שחור': 'black pepper',
  'olive oil': 'olive oil',
  'שמן זית': 'olive oil',
  olive: 'olive oil',
  oil: 'olive oil',
  egg: 'egg',
  eggs: 'eggs',
  ביצה: 'egg',
  ביצים: 'eggs',
}

const MEASURED_UNIT_PATTERN = MEASURED_UNIT_TOKEN

/** @type {Record<string, { unit: string, base: number, perServing?: boolean, wholeSingular?: string, wholePlural?: string }>} */
const QUANTITY_PROFILES = {
  egg: { unit: 'whole', base: 1, perServing: true, wholeSingular: 'ביצה', wholePlural: 'ביצים' },
  eggs: { unit: 'whole', base: 1, perServing: true, wholeSingular: 'ביצה', wholePlural: 'ביצים' },
  tomato: {
    unit: 'whole',
    base: 0.5,
    perServing: true,
    wholeSingular: 'עגבניה בינונית',
    wholePlural: 'עגבניות בינוניות',
  },
  onion: {
    unit: 'whole',
    base: 0.5,
    perServing: true,
    wholeSingular: 'בצל בינוני',
    wholePlural: 'בצלות בינוניות',
  },
  garlic: { unit: 'whole', base: 2, perServing: false, wholeSingular: 'שן שום', wholePlural: 'שיני שום' },
  potato: {
    unit: 'whole',
    base: 1,
    perServing: true,
    wholeSingular: 'תפוח אדמה בינוני',
    wholePlural: 'תפוחי אדמה בינוניים',
  },
  carrot: { unit: 'whole', base: 1, perServing: true, wholeSingular: 'גזר', wholePlural: 'גזרים' },
  'bell pepper': {
    unit: 'whole',
    base: 1,
    perServing: true,
    wholeSingular: 'פלפל גמבה',
    wholePlural: 'פלפלים גמבה',
  },
  lemon: { unit: 'whole', base: 0.5, perServing: true, wholeSingular: 'לימון', wholePlural: 'לימונים' },
  lime: { unit: 'whole', base: 0.5, perServing: true, wholeSingular: 'ליים', wholePlural: 'ליים' },
  avocado: { unit: 'whole', base: 0.5, perServing: true, wholeSingular: 'אבוקדו', wholePlural: 'אבוקדו' },
  cucumber: { unit: 'whole', base: 0.5, perServing: true, wholeSingular: 'מלפפון', wholePlural: 'מלפפונים' },
  salt: { unit: 'tsp', base: 0.25, perServing: false },
  'black pepper': { unit: 'tsp', base: 0.125, perServing: false },
  'olive oil': { unit: 'tbsp', base: 1, perServing: false },
  olive: { unit: 'tbsp', base: 1, perServing: false },
  oil: { unit: 'tbsp', base: 1, perServing: false },
  pasta: { unit: 'gram', base: 100, perServing: true },
  rice: { unit: 'cup', base: 0.5, perServing: true },
  cream: { unit: 'ml', base: 100, perServing: true },
  milk: { unit: 'ml', base: 150, perServing: true },
  chicken: { unit: 'gram', base: 150, perServing: true },
  beef: { unit: 'gram', base: 150, perServing: true },
  steak: { unit: 'gram', base: 180, perServing: true },
  lamb: { unit: 'gram', base: 150, perServing: true },
  tofu: { unit: 'gram', base: 120, perServing: true },
  mushroom: { unit: 'gram', base: 80, perServing: true },
  broccoli: { unit: 'gram', base: 100, perServing: true },
  spinach: { unit: 'gram', base: 80, perServing: true },
  cheese: { unit: 'gram', base: 50, perServing: true },
  butter: { unit: 'tbsp', base: 1, perServing: false },
  lentils: { unit: 'cup', base: 0.5, perServing: true },
  chickpeas: { unit: 'cup', base: 0.5, perServing: true },
  quinoa: { unit: 'cup', base: 0.5, perServing: true },
  flour: { unit: 'cup', base: 0.25, perServing: false },
  sugar: { unit: 'tbsp', base: 1, perServing: false },
  cinnamon: { unit: 'tsp', base: 0.5, perServing: false },
  honey: { unit: 'tbsp', base: 1, perServing: false },
  coffee: { unit: 'cup', base: 1, perServing: false },
  tahini: { unit: 'tbsp', base: 2, perServing: false },
  marshmallow: { unit: 'whole', base: 4, perServing: false, wholeSingular: 'מרשמלו', wholePlural: 'מרשמלו' },
  marshmallows: { unit: 'whole', base: 4, perServing: false, wholeSingular: 'מרשמלו', wholePlural: 'מרשמלו' },
  strawberry: { unit: 'whole', base: 4, perServing: false, wholeSingular: 'תות', wholePlural: 'תותים' },
  strawberries: { unit: 'whole', base: 4, perServing: false, wholeSingular: 'תות', wholePlural: 'תותים' },
  'soy sauce': { unit: 'tbsp', base: 2, perServing: false },
  'coconut milk': { unit: 'ml', base: 200, perServing: true },
  broth: { unit: 'ml', base: 250, perServing: true },
  tuna: { unit: 'gram', base: 120, perServing: true },
  yogurt: { unit: 'ml', base: 120, perServing: true },
}

/** Nutrition per single unit amount (1 whole, 1 tsp, 1 tbsp, 1 gram, 1 ml, 1 cup). */
const NUTRITION_PER_UNIT = {
  whole: {
    egg: { calories: 70, protein: 6, carbs: 0.5, fat: 5 },
    eggs: { calories: 70, protein: 6, carbs: 0.5, fat: 5 },
    tomato: { calories: 22, protein: 1, carbs: 4.8, fat: 0.2 },
    onion: { calories: 40, protein: 1, carbs: 9, fat: 0.1 },
    garlic: { calories: 4, protein: 0.2, carbs: 1, fat: 0 },
    potato: { calories: 110, protein: 2, carbs: 26, fat: 0.1 },
    default: { calories: 25, protein: 1, carbs: 5, fat: 0.2 },
  },
  tsp: {
    salt: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    pepper: { calories: 5, protein: 0.2, carbs: 1, fat: 0.1 },
    'black pepper': { calories: 5, protein: 0.2, carbs: 1, fat: 0.1 },
    default: { calories: 3, protein: 0, carbs: 0.5, fat: 0.1 },
  },
  tbsp: {
    'olive oil': { calories: 119, protein: 0, carbs: 0, fat: 14 },
    olive: { calories: 119, protein: 0, carbs: 0, fat: 14 },
    oil: { calories: 119, protein: 0, carbs: 0, fat: 14 },
    butter: { calories: 102, protein: 0.1, carbs: 0, fat: 11.5 },
    honey: { calories: 64, protein: 0, carbs: 17, fat: 0 },
    sugar: { calories: 48, protein: 0, carbs: 12, fat: 0 },
    'soy sauce': { calories: 10, protein: 1.5, carbs: 1, fat: 0 },
    default: { calories: 45, protein: 0.5, carbs: 3, fat: 3 },
  },
  gram: {
    pasta: { calories: 3.5, protein: 0.12, carbs: 0.71, fat: 0.02 },
    chicken: { calories: 1.65, protein: 0.31, carbs: 0, fat: 0.036 },
    beef: { calories: 2.5, protein: 0.26, carbs: 0, fat: 0.15 },
    tofu: { calories: 0.76, protein: 0.08, carbs: 0.02, fat: 0.045 },
    mushroom: { calories: 0.22, protein: 0.03, carbs: 0.03, fat: 0.003 },
    broccoli: { calories: 0.34, protein: 0.028, carbs: 0.07, fat: 0.004 },
    cheese: { calories: 4, protein: 0.25, carbs: 0.01, fat: 0.33 },
    default: { calories: 1.5, protein: 0.05, carbs: 0.2, fat: 0.05 },
  },
  ml: {
    cream: { calories: 3.5, protein: 0.02, carbs: 0.03, fat: 0.35 },
    milk: { calories: 0.6, protein: 0.03, carbs: 0.05, fat: 0.03 },
    'coconut milk': { calories: 2.3, protein: 0.02, carbs: 0.03, fat: 0.24 },
    broth: { calories: 0.15, protein: 0.02, carbs: 0.01, fat: 0.005 },
    yogurt: { calories: 0.6, protein: 0.035, carbs: 0.05, fat: 0.015 },
    default: { calories: 0.5, protein: 0.02, carbs: 0.04, fat: 0.02 },
  },
  cup: {
    rice: { calories: 685, protein: 13, carbs: 151, fat: 1.3 },
    lentils: { calories: 230, protein: 18, carbs: 40, fat: 0.8 },
    chickpeas: { calories: 210, protein: 10, carbs: 35, fat: 3.5 },
    quinoa: { calories: 220, protein: 8, carbs: 39, fat: 3.5 },
    flour: { calories: 455, protein: 13, carbs: 95, fat: 1.2 },
    default: { calories: 180, protein: 5, carbs: 35, fat: 2 },
  },
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatFraction(value) {
  const rounded = Math.round(value * 4) / 4
  const whole = Math.floor(rounded)
  const frac = Math.round((rounded - whole) * 4)

  const fracMap = { 1: '1/4', 2: '1/2', 3: '3/4' }
  if (whole === 0 && frac > 0) return fracMap[frac] ?? String(rounded)
  if (frac === 0) return String(whole)
  if (whole === 0) return fracMap[frac]
  return `${whole} ${fracMap[frac]}`
}

function roundAmount(value, unit) {
  if (unit === 'whole') return Math.max(1, Math.round(value))
  if (unit === 'tsp' || unit === 'tbsp' || unit === 'cup') {
    return Math.max(0.25, Math.round(value * 4) / 4)
  }
  if (unit === 'gram') return Math.max(10, Math.round(value / 10) * 10)
  if (unit === 'ml') return Math.max(25, Math.round(value / 25) * 25)
  return Math.round(value * 100) / 100
}

function computeAmount(profile, servings, baseServings = DEFAULT_SERVINGS) {
  const scale = servings / baseServings
  const raw = profile.perServing ? profile.base * servings : profile.base * scale
  return roundAmount(raw, profile.unit)
}

function stripQuantity(raw) {
  const trimmed = String(raw ?? '').trim().replace(PANTRY_SUFFIX, '').trim()
  const measured = parseAnyLeadingMeasurement(trimmed)
  if (measured) {
    return { name: measured.name, canonical: canonicalIngredient(measured.name), measured }
  }

  const withoutQty = stripQuantityPrefix(trimmed) || trimmed
  return { name: withoutQty, canonical: canonicalIngredient(withoutQty), measured: null }
}

function resolveProfileKey(canon, name) {
  const normalized = normalizeIngredient(name)
  const normalizedCanon = canon ? normalizeIngredient(canon) : ''

  for (const [alias, key] of Object.entries(STAPLE_PROFILE_KEYS)) {
    const aliasNorm = normalizeIngredient(alias)
    if (normalized === aliasNorm || normalized.includes(aliasNorm)) return key
    if (normalizedCanon === aliasNorm) return key
  }

  if (
    (canon === 'pepper' || normalized.includes('שחור') || normalized.includes('black pepper')) &&
    !normalized.includes('גמבה') &&
    !normalized.includes('bell')
  ) {
    return 'black pepper'
  }
  if (canon === 'pepper') return 'bell pepper'
  if (canon && QUANTITY_PROFILES[canon]) return canon

  const label = getIngredientLabel(canon ?? name, 'he')
  const labelNorm = normalizeIngredient(label)
  for (const [alias, key] of Object.entries(STAPLE_PROFILE_KEYS)) {
    if (labelNorm === normalizeIngredient(alias)) return key
  }

  return canon ?? normalized.split(/\s+/)[0]
}

function resolveProfile(canon, name, language) {
  const profileKey = resolveProfileKey(canon, name)
  if (profileKey && QUANTITY_PROFILES[profileKey]) {
    return { ...QUANTITY_PROFILES[profileKey], canon: profileKey }
  }
  const label = getIngredientLabel(profileKey ?? canon ?? name, language)
  return {
    unit: 'whole',
    base: 1,
    perServing: true,
    wholeSingular: label,
    wholePlural: label,
    canon: profileKey ?? canon ?? label,
  }
}

/**
 * A measured ingredient must include its unit word; whole items must not look like "2 מלח".
 */
export function isValidQuantifiedDisplay(display, unit) {
  const text = String(display ?? '').trim()
  if (!text || !isValidIngredientLine(text)) return false

  if (unit === 'whole') {
    if (MEASURED_UNIT_PATTERN.test(text)) return false
    return /^\d+(?:\s+\d+\/\d+)?\s+\S/.test(text)
  }

  return MEASURED_UNIT_PATTERN.test(text)
}

function formatWholeDisplay(amount, profile, language) {
  const count = Math.round(amount)
  if (language === 'he') {
    const singular = profile.wholeSingular ?? getIngredientLabel(profile.canon, 'he')
    const plural = profile.wholePlural ?? singular
    const noun = count === 1 ? singular : plural
    return `${count} ${noun}`
  }
  const enLabel = getIngredientLabel(profile.canon, 'en')
  return `${count} ${enLabel}${count === 1 ? '' : 's'}`
}

function formatMeasuredDisplay(amount, unit, name, language) {
  if (language === 'he') {
    return formatHebrewMeasurement(amount, unit, name)
  }

  const qty = formatFraction(amount)
  const unitLabel = UNIT_LABELS.en[unit] ?? unit
  return `${qty} ${unitLabel} ${name}`
}

function buildReadableQuantifiedItem(raw, language, pantryNote = '') {
  const readable = toReadableIngredientLine(raw, language)
  if (!readable) return null

  const { name, canonical: canon } = stripQuantity(readable)
  if (!name || isNumericOnlyText(name)) return null

  const displayName = getIngredientLabel(canon ?? name, language) || name
  const display = pantryNote ? `${readable} ${pantryNote}` : readable
  const stepPhrase =
    language === 'he' ? toStepIngredientReference(displayName, language) : displayName

  return {
    raw,
    canon: canon ?? name,
    name: displayName,
    amount: 1,
    unit: 'whole',
    display,
    stepPhrase,
  }
}

function getNutritionForItem(canon, unit, amount) {
  const unitTable = NUTRITION_PER_UNIT[unit] ?? NUTRITION_PER_UNIT.gram
  const macros = unitTable[canon] ?? unitTable.default ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
  return {
    calories: macros.calories * amount,
    protein: macros.protein * amount,
    carbs: macros.carbs * amount,
    fat: macros.fat * amount,
  }
}

export function quantifyIngredient(raw, servings = DEFAULT_SERVINGS, language = 'he') {
  const pantryNote = String(raw ?? '').match(PANTRY_SUFFIX)?.[0]?.trim() ?? ''
  const trimmed = String(raw ?? '')
    .trim()
    .replace(PANTRY_SUFFIX, '')
    .trim()

  if (!trimmed || !isValidIngredientLine(trimmed)) {
    return buildReadableQuantifiedItem(raw, language, pantryNote)
  }

  const existing = parseAnyLeadingMeasurement(trimmed)

  if (existing && language === 'he') {
    const { name, canonical: canon } = stripQuantity(trimmed)
    if (!name || isNumericOnlyText(name)) {
      return buildReadableQuantifiedItem(raw, language, pantryNote)
    }

    const displayName = getIngredientLabel(canon ?? name, language) || name
    const display = formatHebrewMeasurement(existing.qty, existing.unit, displayName)
    const stepPhrase = toStepIngredientReference(displayName, language)
    const result = {
      raw,
      canon: canon ?? name,
      name: displayName,
      amount: parseAmount(existing.qty),
      unit: existing.unit,
      display: pantryNote ? `${display} ${pantryNote}` : display,
      stepPhrase: pantryNote ? `${stepPhrase} ${pantryNote}` : stepPhrase,
    }

    if (!isValidQuantifiedDisplay(result.display, result.unit)) {
      return buildReadableQuantifiedItem(raw, language, pantryNote)
    }
    return result
  }

  const { name, canonical: canon } = stripQuantity(raw)
  if (!name || isNumericOnlyText(name)) {
    return buildReadableQuantifiedItem(raw, language, pantryNote)
  }

  const profileKey = resolveProfileKey(canon, name)
  const hasKnownProfile = Boolean(profileKey && QUANTITY_PROFILES[profileKey])

  if (!hasKnownProfile) {
    return buildReadableQuantifiedItem(raw, language, pantryNote)
  }

  const profile = resolveProfile(canon, name, language)
  const amount = computeAmount(profile, servings)
  const displayName = getIngredientLabel(profile.canon, language) || name
  const display =
    profile.unit === 'whole'
      ? formatWholeDisplay(amount, { ...profile, canon: profile.canon }, language)
      : formatMeasuredDisplay(amount, profile.unit, displayName, language)
  const stepPhrase =
    language === 'he' ? toStepIngredientReference(displayName, language) : displayName
  const result = {
    raw,
    canon: profile.canon,
    name: displayName,
    amount,
    unit: profile.unit,
    display: pantryNote ? `${display} ${pantryNote}` : display,
    stepPhrase: pantryNote ? `${stepPhrase} ${pantryNote}` : stepPhrase,
  }

  if (!isValidQuantifiedDisplay(result.display, result.unit)) {
    return buildReadableQuantifiedItem(raw, language, pantryNote)
  }
  return result
}

export function syncStepsWithQuantities(steps, quantifiedItems) {
  const replacements = quantifiedItems
    .map((item) => ({
      bare: item.name,
      stepPhrase: item.stepPhrase,
      display: item.display,
    }))
    .filter(
      (item) =>
        item.bare &&
        item.stepPhrase &&
        isValidIngredientLine(item.stepPhrase) &&
        !isNumericOnlyText(item.bare) &&
        item.bare.length > 1,
    )
    .sort((a, b) => b.bare.length - a.bare.length)

  return steps.map((step) => {
    let text = String(step ?? '')
    if (!text) return text

    for (const { bare, stepPhrase, display } of replacements) {
      if (text.includes(display) || text.includes(stepPhrase)) continue
      const barePattern = new RegExp(escapeRegExp(bare), 'g')
      text = text.replace(barePattern, stepPhrase)
    }
    return text
  })
}

export function computeNutritionFromQuantities(quantifiedItems, servings = DEFAULT_SERVINGS, scoreMeta = {}) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }

  for (const item of quantifiedItems) {
    const macros = getNutritionForItem(item.canon, item.unit, item.amount)
    totals.calories += macros.calories
    totals.protein += macros.protein
    totals.carbs += macros.carbs
    totals.fat += macros.fat
  }

  const calories = Math.round(totals.calories)
  const protein = Math.round(totals.protein)
  const carbs = Math.round(totals.carbs)
  const fat = Math.round(totals.fat)

  const healthScore = calculateHealthScoreFromRecipe({
    ingredients: quantifiedItems.map((item) => item.display || item.name),
    calories,
    protein,
    carbs,
    servings,
    name: scoreMeta.name,
    recipeType: scoreMeta.recipeType,
  })

  return { calories, protein, carbs, fat, servings, healthScore }
}

/**
 * Add realistic quantities to every ingredient, sync steps, and recalculate nutrition.
 */
export function applyRecipeQuantities(recipe, options = {}) {
  const language = options.language ?? 'he'
  const servings = recipe.nutrition?.servings ?? options.servings ?? DEFAULT_SERVINGS
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  let quantifiedItems = ingredients
    .map((entry) => quantifyIngredient(entry, servings, language))
    .filter(Boolean)

  quantifiedItems = quantifiedItems
    .map((item) => {
      if (isValidQuantifiedDisplay(item.display, item.unit)) return item
      return buildReadableQuantifiedItem(item.raw, language) ?? null
    })
    .filter(Boolean)

  const nextIngredients = sanitizeIngredientList(quantifiedItems.map((item) => item.display))
  const preserveOriginalSteps = Boolean(options.preserveOriginalSteps)
  const nextSteps = preserveOriginalSteps
    ? lightSanitizeRecipeSteps(recipe.steps ?? [])
    : sanitizeRecipeSteps(
        alignStepsWithIngredientList(
          naturalizeRecipeSteps(
            syncStepsWithQuantities(recipe.steps ?? [], quantifiedItems),
            quantifiedItems.map((item) => item.name),
            language,
          ),
          quantifiedItems.map((item) => item.display),
          language,
        ),
      )
  const nutrition = computeNutritionFromQuantities(quantifiedItems, servings, {
    name: recipe.name,
    recipeType: options.recipeType ?? recipe.recipeType,
  })
  const { healthScore, ...macroNutrition } = nutrition

  return {
    ...recipe,
    ingredients: nextIngredients,
    steps: nextSteps,
    nutrition: {
      ...(recipe.nutrition ?? {}),
      ...macroNutrition,
      servings,
    },
    healthScore,
  }
}
