/**
 * Ensures generated recipes include all cooking essentials implied by dish type and steps.
 * Pantry staples (water, salt, oil, etc.) may be added so the dish is realistically cookable.
 */

import { canonicalIngredient, ingredientsMatch } from '../data/ingredientKnowledge'
import { stripQuantityPrefix, parseAnyLeadingMeasurement } from './measurementUnits'
import { getBasicPantryLabel, stripBasicPantryLabel } from './dessertRecipeBuilder'
import { isSystemPantryIngredient } from './ingredientAllowlist'
import {
  applyDishCookingProfile,
  resolveDishCookingOptions,
  stripForbiddenDishIngredients,
} from './dishCookingProfiles'

/** @typedef {{ canon: string, he: string, en: string, needsPantryLabel?: boolean }} EssentialPreset */

/** @type {Record<string, EssentialPreset>} */
const ESSENTIAL_PRESETS = {
  water_rice: { canon: 'water', he: '2 כוסות מים', en: '2 cups water' },
  water_soup: { canon: 'water', he: '1.5 ליטר מים', en: '6 cups water' },
  water_pasta: { canon: 'water', he: '2 ליטר מים (לבישול)', en: '2 L water (for boiling)' },
  water_general: { canon: 'water', he: '2 כוסות מים', en: '2 cups water' },
  salt: { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
  salt_pasta: { canon: 'salt', he: '1 כפית מלח', en: '1 tsp salt' },
  oil: { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
  onion: { canon: 'onion', he: '1 בצל', en: '1 onion' },
  garlic: { canon: 'garlic', he: '2 שיני שום', en: '2 garlic cloves' },
  paprika: { canon: 'paprika', he: '1 כפית פפריקה', en: '1 tsp paprika' },
  'black pepper': { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
  cumin: { canon: 'cumin', he: '1 כפית כמון', en: '1 tsp cumin' },
  flour: { canon: 'flour', he: '1 כוס קמח', en: '1 cup flour', needsPantryLabel: true },
  sugar: { canon: 'sugar', he: '1/2 כוס סוכר', en: '1/2 cup sugar', needsPantryLabel: true },
  egg: { canon: 'egg', he: '2 ביצים', en: '2 eggs', needsPantryLabel: true },
  butter: { canon: 'butter', he: '100 גרם חמאה', en: '100 g butter', needsPantryLabel: true },
  'baking powder': {
    canon: 'baking powder',
    he: '1 כפית אבקת אפייה',
    en: '1 tsp baking powder',
    needsPantryLabel: true,
  },
  vanilla: { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract', needsPantryLabel: true },
}

const STEP_STAPLE_PATTERNS = [
  { canon: 'water', pattern: /\b(?:מים|water|ציר|stock|broth)\b/i },
  { canon: 'salt', pattern: /\b(?:מלח|salt|מומלח(?:ים)?)\b/i },
  { canon: 'oil', pattern: /\b(?:שמן(?:\s+זית)?|oil|olive\s+oil)\b/i },
  { canon: 'onion', pattern: /\b(?:בצל(?:ים|ות)?|onion(?:s)?)\b/i },
  { canon: 'garlic', pattern: /\b(?:שום|garlic)\b/i },
  { canon: 'paprika', pattern: /\b(?:פפריק(?:ה|ת)?|paprika)\b/i },
  { canon: 'black pepper', pattern: /\b(?:פלפל\s+שחור|black\s+pepper)\b/i },
  { canon: 'cumin', pattern: /\b(?:כמון|cumin)\b/i },
  { canon: 'flour', pattern: /\b(?:קמח|flour)\b/i },
  { canon: 'sugar', pattern: /\b(?:סוכר|sugar)\b/i },
  { canon: 'egg', pattern: /\b(?:ביצ(?:ה|ים)|eggs?)\b/i },
  { canon: 'butter', pattern: /\b(?:חמאה|butter)\b/i },
  { canon: 'baking powder', pattern: /\b(?:אבק(?:ת|ה)\s+אפייה|baking\s+powder)\b/i },
  { canon: 'vanilla', pattern: /\b(?:וניל|vanilla)\b/i },
]

function ingredientLines(recipe) {
  return Array.isArray(recipe?.ingredients) ? recipe.ingredients : []
}

function stepsBlob(recipe) {
  return (recipe?.steps ?? []).join('\n')
}

function canonFromLine(line) {
  const stripped = stripBasicPantryLabel(String(line ?? ''))
  const parsed = parseAnyLeadingMeasurement(stripped)
  const base = parsed?.name?.trim() || stripQuantityPrefix(stripped)
  return canonicalIngredient(base)
}

export function ingredientsIncludeCanon(ingredients, canon) {
  if (!canon) return false
  return ingredients.some((line) => {
    const lineCanon = canonFromLine(line)
    if (lineCanon === canon) return true
    if (canon === 'egg' && lineCanon === 'eggs') return true
    if (canon === 'eggs' && lineCanon === 'egg') return true
    return ingredientsMatch(line, canon)
  })
}

function presetKeyForCanon(canon, { recipeType, steps, ingredients }) {
  if (canon === 'water') {
    if (recipeType === 'soup_stew' || /מרק|soup|stew|תבשיל/i.test(steps)) return 'water_soup'
    if (
      ingredientsIncludeCanon(ingredients, 'pasta') ||
      /\b(?:פסטה|pasta|spaghetti|penne)\b/i.test(steps)
    ) {
      if (/מרתיח|boil/i.test(steps)) return 'water_pasta'
    }
    if (ingredientsIncludeCanon(ingredients, 'rice') || /\b(?:אורז|rice)\b/i.test(steps)) {
      return 'water_rice'
    }
    return 'water_general'
  }
  if (canon === 'salt') {
    if (
      ingredientsIncludeCanon(ingredients, 'pasta') &&
      /מרתיח|boil|מומלח/i.test(steps)
    ) {
      return 'salt_pasta'
    }
    return 'salt'
  }
  return canon
}

function dishTypeRequiresLiquid(recipe, recipeType) {
  const steps = stepsBlob(recipe)
  const ingredients = ingredientLines(recipe)
  const title = String(recipe?.name ?? '')

  if (recipeType === 'soup_stew') return true
  if (/\b(?:מים|water|ציר|stock|broth)\b/i.test(steps)) return true
  if (/מרתיח(?:ים|)?\s*(?:סיר\s*)?מים/i.test(steps)) return true
  if (ingredientsIncludeCanon(ingredients, 'rice') || /\b(?:אורז|rice)\b/i.test(steps)) return true
  if (
    ingredientsIncludeCanon(ingredients, 'lentils') ||
    ingredientsIncludeCanon(ingredients, 'lentil') ||
    /\b(?:עדש(?:ים|ה)|lentils?)\b/i.test(steps)
  ) {
    return true
  }
  if (/מרק|soup|stew|תבשיל/i.test(title)) return true
  if (
    (ingredientsIncludeCanon(ingredients, 'pasta') || /\b(?:פסטה|pasta)\b/i.test(steps)) &&
    /מרתיח|boil/i.test(steps)
  ) {
    return true
  }
  return false
}

function dishTypeRequiresSalt(recipe, recipeType) {
  const steps = stepsBlob(recipe)
  if (/\b(?:מלח|salt|מומלח(?:ים)?)\b/i.test(steps)) return true
  return dishTypeRequiresLiquid(recipe, recipeType)
}

function dishUsesButterFat(recipe, options = {}) {
  if (options.useButterNotOil) return true
  const steps = stepsBlob(recipe)
  const ingredients = ingredientLines(recipe)
  if (/\b(?:חמאה|butter)\b/i.test(steps)) return true
  return ingredientsIncludeCanon(ingredients, 'butter')
}

function dishTypeRequiresOil(recipe, options = {}) {
  const profile = options.dishProfile
  if (profile?.useButterNotOil || profile?.forbiddenCanons?.includes('oil')) return false
  if (dishUsesButterFat(recipe, options)) return false

  const steps = stepsBlob(recipe)
  if (/\b(?:שמן(?:\s+זית)?|oil|olive\s+oil)\b/i.test(steps)) return true
  if (/מטגנ(?:ים|)|saut[ée]|fry|brown/i.test(steps)) return true
  return false
}

function bakedDessertNeeds(recipe, recipeType) {
  if (recipeType !== 'dessert') return []
  const steps = stepsBlob(recipe)
  const title = String(recipe?.name ?? '')
  const text = `${title}\n${steps}`
  if (!/\b(?:תנור|oven|bake|אופ(?:ים|ה)|מאפ(?:ים|ה)|עוג(?:ה|ת)|cake|muffin|brownie)\b/i.test(text)) {
    return []
  }

  const needs = []
  if (/\b(?:קמח|flour)\b/i.test(text)) needs.push('flour')
  if (/\b(?:סוכר|sugar)\b/i.test(text)) needs.push('sugar')
  if (/\b(?:ביצ(?:ה|ים)|eggs?)\b/i.test(text)) needs.push('egg')
  if (/\b(?:חמאה|butter)\b/i.test(text)) needs.push('butter')
  if (/\b(?:אבק(?:ת|ה)\s+אפייה|baking\s+powder)\b/i.test(text)) needs.push('baking powder')
  if (/\b(?:וניל|vanilla)\b/i.test(text)) needs.push('vanilla')
  return needs
}

function staplesMentionedInSteps(steps) {
  const mentioned = new Set()
  for (const { canon, pattern } of STEP_STAPLE_PATTERNS) {
    if (pattern.test(steps)) mentioned.add(canon)
  }
  return [...mentioned]
}

function formatEssentialLine(presetKey, { language = 'he', recipeType = 'meal', pantryLabel = '' } = {}) {
  const preset = ESSENTIAL_PRESETS[presetKey] ?? ESSENTIAL_PRESETS[presetKey.replace(/s$/, '')]
  if (!preset) return ''

  const base = language === 'en' ? preset.en : preset.he
  const needsLabel =
    preset.needsPantryLabel ||
    (recipeType === 'dessert' && !isSystemPantryIngredient(preset.canon))
  const label = needsLabel ? pantryLabel || getBasicPantryLabel(language) : ''
  return `${base} ${label}`.trim()
}

function shouldSkipGenericCanon(canon, options = {}) {
  const skip = options.skipGenericCanons ?? options.dishProfile?.skipGenericCanons ?? []
  return skip.includes(canon)
}

/**
 * Determine which essential preset keys are missing from the ingredient list.
 */
export function findMissingCookingEssentials(recipe, options = {}) {
  const resolved = resolveDishCookingOptions(recipe, options)
  const recipeType = resolved.recipeType ?? 'meal'
  const profile = resolved.dishProfile
  const ingredients = ingredientLines(recipe)
  const steps = stepsBlob(recipe)
  const missingKeys = []
  const neededCanons = new Set()

  if (profile?.requiresLiquid || dishTypeRequiresLiquid(recipe, recipeType)) neededCanons.add('water')
  if (dishTypeRequiresSalt(recipe, recipeType)) neededCanons.add('salt')
  if (dishTypeRequiresOil(recipe, resolved)) neededCanons.add('oil')

  for (const canon of bakedDessertNeeds(recipe, recipeType)) {
    neededCanons.add(canon)
  }

  if (profile?.requiresBakingStaples) {
    for (const canon of ['flour', 'sugar', 'egg', 'butter', 'baking powder', 'vanilla']) {
      if (/\b(?:קמח|flour|סוכר|sugar|ביצ|egg|חמאה|butter|אבק(?:ת|ה)\s+אפייה|baking\s+powder|וניל|vanilla)\b/i.test(`${recipe.name}\n${steps}`)) {
        neededCanons.add(canon)
      }
    }
  }

  for (const canon of profile?.requiredCanons ?? []) {
    neededCanons.add(canon)
  }

  for (const canon of staplesMentionedInSteps(steps)) {
    neededCanons.add(canon)
  }

  for (const canon of neededCanons) {
    if (shouldSkipGenericCanon(canon, resolved)) continue
    if (profile?.forbiddenCanons?.includes(canon)) continue
    if (canon === 'oil' && dishUsesButterFat(recipe, resolved)) continue
    if (ingredientsIncludeCanon(ingredients, canon)) continue
    if (canon === 'water' && ingredientsIncludeCanon(ingredients, 'broth')) continue
    const key = presetKeyForCanon(canon, { recipeType, steps, ingredients })
    if (!missingKeys.includes(key)) missingKeys.push(key)
  }

  return missingKeys
}

/**
 * Add missing cooking essentials so the recipe matches its steps and dish type.
 */
export function ensureRecipeCookingEssentials(recipe, options = {}) {
  const resolved = resolveDishCookingOptions(recipe, options)
  const language = resolved.language ?? 'he'
  const recipeType = resolved.recipeType ?? 'meal'
  const pantryLabel = resolved.pantryLabel ?? ''

  let working = applyDishCookingProfile(recipe, resolved)
  const ingredients = [...ingredientLines(working)]
  const missingKeys = findMissingCookingEssentials(working, resolved)

  const additions = missingKeys
    .map((key) => formatEssentialLine(key, { language, recipeType, pantryLabel }))
    .filter(Boolean)

  working = {
    ...working,
    ingredients: [...ingredients, ...additions],
  }

  return stripForbiddenDishIngredients(working, resolved.dishProfile)
}

/**
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function validateRecipeCookingEssentials(recipe, options = {}) {
  const resolved = resolveDishCookingOptions(recipe, options)
  const recipeType = resolved.recipeType ?? 'meal'
  const profile = resolved.dishProfile
  const failures = []
  const steps = stepsBlob(recipe)
  const ingredients = ingredientLines(recipe)

  if (dishTypeRequiresLiquid(recipe, recipeType)) {
    if (!ingredientsIncludeCanon(ingredients, 'water') && !ingredientsIncludeCanon(ingredients, 'broth')) {
      failures.push('missing_liquid')
    }
  }

  if (/\b(?:מים|water)\b/i.test(steps)) {
    if (!ingredientsIncludeCanon(ingredients, 'water') && !ingredientsIncludeCanon(ingredients, 'broth')) {
      failures.push('steps_reference_missing_water')
    }
  }

  if (dishTypeRequiresSalt(recipe, recipeType) && !ingredientsIncludeCanon(ingredients, 'salt')) {
    failures.push('missing_salt')
  }

  if (dishTypeRequiresOil(recipe, resolved) && !ingredientsIncludeCanon(ingredients, 'oil')) {
    failures.push('missing_oil')
  }

  for (const canon of profile?.requiredCanons ?? []) {
    if (!ingredientsIncludeCanon(ingredients, canon)) {
      failures.push(`dish_missing_${canon.replace(/\s+/g, '_')}`)
    }
  }

  for (const canon of staplesMentionedInSteps(steps)) {
    if (canon === 'water' || canon === 'salt' || canon === 'oil') continue
    if (!ingredientsIncludeCanon(ingredients, canon)) {
      failures.push(`steps_reference_missing_${canon.replace(/\s+/g, '_')}`)
    }
  }

  return { ok: failures.length === 0, failures }
}
