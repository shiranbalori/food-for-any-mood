/**
 * Category-based validation for recipe inputs (ingredients + dish name).
 * Blocks offensive, nonsense, and clearly non-food text before generation.
 */

import { INGREDIENT_LABELS_HE } from '../data/ingredientLabels'
import { INGREDIENT_SYNONYMS, canonicalIngredient, normalizeIngredient } from '../data/ingredientKnowledge'
import { parseUserIngredients } from './ingredientRelevance'
import { normalizeDishIdea } from './dishIdeaUtils'
import { resolveDishIdeaTarget } from './dishIdeaGeneration'
import { stripQuantityPrefix } from './measurementUnits'

export const RECIPE_INPUT_REJECTION_HE = 'אנא הזינו מרכיבי מזון או שם מנה תקין.'
export const RECIPE_INPUT_REJECTION_EN = 'Please enter valid food ingredients or a dish name.'

/** @typedef {'offensive' | 'non_food' | 'nonsense'} InputViolationCategory */

/**
 * Pattern groups — matched against normalized / de-obfuscated text.
 * @type {Array<{ category: InputViolationCategory, patterns: RegExp[] }>}
 */
const VIOLATION_PATTERN_GROUPS = [
  {
    category: 'offensive',
    patterns: [
      // Scatological — Hebrew & English
      /ח+ר+א+/,
      /ק+ק+י+/,
      /צ+ו+א+ה/,
      /(?:sh|s)[\W_]*[i1!][\W_]*t/,
      /(?:sh|s)[\W_*-]{0,3}[i1!][\W_*-]{0,3}t/,
      /(?:po+?p|feces|crap)/,
      // Sexual / vulgar slang — Hebrew
      /ז+ו+נ+ה/,
      /בן(?:\s+של)?\s*זונה/,
      /בת(?:\s+של)?\s*זונה/,
      /(?:ת)?ז+י+נ+/,
      /(?:ת)?ז+d+?i+?n+/,
      /(?:מצ|מ)צ+י+צ+/,
      /(?:כ|ק)+ו+ס+(?!\s*(?:סוכר|חלב|מים|קפה|תה|יין|שמנת))/,
      // Insults — Hebrew
      /מ+ט+ו*מ+ט+/,
      /ט+מ+ב+ל/,
      /מ+נ+י+א+ק/,
      /מ+פ+ג+ר/,
      /א+י?ד+י+?ו?ט/,
      /ז+ב+ל/,
      // Insults / profanity — English
      /f[\W_]*u[\W_]*c[\W_]*k/,
      /f[\W_*-]{0,3}c[\W_*-]{0,3}k/,
      /s[\W_]*h[\W_]*[i1][\W_]*t/,
      /s[\W_*-]{0,3}h[\W_*-]{0,3}t/,
      /b[\W_]*i[\W_]*t[\W_]*c[\W_]*h/,
      /a[\W_]*s[\W_]*s[\W_]*h[\W_]*o[\W_]*l[\W_]*e/,
      /c[\W_]*u[\W_]*n[\W_]*t/,
      /d[\W_]*i[\W_]*c[\W_]*k/,
      /c[\W_]*o[\W_]*c[\W_]*k/,
      /w[\W_]*h[\W_]*o[\W_]*r[\W_]*e/,
      /s[\W_]*l[\W_]*u[\W_]*t/,
      /b[\W_]*a[\W_]*s[\W_]*t[\W_]*a[\W_]*r[\W_]*d/,
      // Hate speech
      /n[\W_]*a[\W_]*z[\W_]*i/,
      /n[\W_]*i[\W_]*g+[e]*[\W_]*r/,
      /f[\W_]*a[\W_]*g+[o]*[\W_]*t/,
      /ה+י+ט+ל+ר/,
      // Drugs (unsafe / non-food)
      /(?:cocaine|heroin|marijuana|cannabis|meth|ecstasy)/,
      /(?:קוקאין|הרואין|מריחואנה|קנאביס|חשיש|סמים)/,
      // Toxic / dangerous
      /(?:bleach|poison|gasoline|ammonia|detergent)/,
      /(?:אקונומיקה|רעל|בנזין|אמוניה|אבקת\s*כביסה|הדברה)/,
      // Weapons
      /(?:gun|pistol|rifle|bomb|explosive|weapon)/,
      /(?:אקדח|פצצה|נשק|דינמיט)/,
    ],
  },
  {
    category: 'non_food',
    patterns: [
      // Vehicles
      /(?:מכונ(?:ית|יות)|אוט(?:ו|ו)|car|truck|bus|train|airplane|plane|motorcycle|scooter)/,
      /(?:אופנ(?:יים|יים)|bicycle|bike)/,
      // Electronics
      /(?:מחשב(?:ים)?|computer|laptop|tablet|keyboard|מקלדת|מסך|screen|monitor|television|tv)/,
      /(?:טל(?:פון|פונים)|phone|smartphone|iphone|android)/,
      // Furniture / household objects
      /(?:שולח(?:ן|נות)|כיס(?:א|אות)|ספ(?:ה|ות)|מיט(?:ה|ות)|chair|sofa|bed|table|desk|closet|ארון)/,
      /^(?:בית|דיר(?:ה|ות)|house|home|apartment|building|office)$/,
      // Sports / games (not food)
      /(?:כדור(?:גל|סל|ט(?:enis)?)|football|soccer|basketball|tennis|volleyball|baseball|sport)/,
      // Clothing / accessories
      /(?:נע(?:ל|י)?(?:יים)?|shoe|boot|shirt|pants|trousers|jacket|hat|כובע|חולצ(?:ה|ות)|מכנס(?:יים)?)/,
      // Tools / materials
      /(?:מפתח(?:ות)?|hammer|drill|screwdriver|wrench|plastic|cardboard|battery|סול(?:לה|ות))/,
      /(?:נייר|paper|rubber|גומי|פלסטיק|זכוכית|metal|glass)(?:\s|$)/,
    ],
  },
  {
    category: 'nonsense',
    patterns: [
      /^(?:asdf|qwerty|zxcv|hjkl|qwer|ytrewq)$/i,
      /^(.)\1{3,}$/,
      /^[b-df-hj-np-tv-xz]{5,}$/i,
      /^[xX]{3,}$/,
      /^(?:י|א|ה|ו|מ|ש|כ|ל){4,}$/,
    ],
  },
]

const FOOD_DISH_HINT_PATTERNS = [
  /עוג(?:ה|ת)/,
  /מרק/,
  /סלט/,
  /פסטה/,
  /ספגט/i,
  /פיצ(?:ה|ה)/,
  /לחם/,
  /שקשוק/,
  /חביתה/,
  /סטייק/,
  /cake|soup|salad|pasta|pizza|stew|curry|pie|cookie|bread|pancake|shakshuka|risotto|lasagna/i,
]

const KNOWN_FOOD_LABELS = new Set(
  Object.values(INGREDIENT_LABELS_HE).map((label) => normalizeIngredient(label)).filter(Boolean),
)

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeSafetyText(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
}

function deobfuscateText(text) {
  return normalizeSafetyText(text)
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
}

function compactText(text) {
  return deobfuscateText(text).replace(/[\W_]+/g, '')
}

function tokenVariants(token) {
  const raw = stripQuantityPrefix(token)
  const normalized = normalizeSafetyText(raw)
  const deob = deobfuscateText(raw)
  return [...new Set([normalized, deob, compactText(raw), compactText(deob)].filter(Boolean))]
}

function matchesPatternGroup(variants, patterns) {
  return patterns.some((pattern) => variants.some((variant) => pattern.test(variant)))
}

/**
 * @param {string} text
 * @returns {{ blocked: boolean, category?: InputViolationCategory }}
 */
export function detectInputViolation(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { blocked: false }

  const variants = [
    ...tokenVariants(trimmed),
    compactText(trimmed),
    deobfuscateText(trimmed),
  ]

  for (const group of VIOLATION_PATTERN_GROUPS) {
    if (matchesPatternGroup(variants, group.patterns)) {
      return { blocked: true, category: group.category }
    }
  }

  return { blocked: false }
}

function ingredientTermMatchesKnownFood(token) {
  const core = stripQuantityPrefix(token)
  if (!core) return false

  const normalized = normalizeIngredient(core)
  if (!normalized) return false

  const canon = canonicalIngredient(core)
  if (canon && INGREDIENT_SYNONYMS[canon]) return true

  for (const [canonical, aliases] of Object.entries(INGREDIENT_SYNONYMS)) {
    const canonicalNorm = normalizeIngredient(canonical)
    if (normalized === canonicalNorm || normalized.includes(canonicalNorm) || canonicalNorm.includes(normalized)) {
      return true
    }
    if (
      aliases.some((alias) => {
        const aliasNorm = normalizeIngredient(alias)
        return (
          normalized === aliasNorm ||
          normalized.includes(aliasNorm) ||
          aliasNorm.includes(normalized)
        )
      })
    ) {
      return true
    }
  }

  if (KNOWN_FOOD_LABELS.has(normalized)) return true
  if ([...KNOWN_FOOD_LABELS].some((label) => normalized.includes(label) || label.includes(normalized))) {
    return true
  }

  return false
}

function isPlausibleDishName(text) {
  const dish = normalizeDishIdea(text)
  if (!dish) return false

  if (resolveDishIdeaTarget(dish, { category: 'any', recipeType: 'meal', language: 'he' })) {
    return true
  }
  if (resolveDishIdeaTarget(dish, { category: 'any', recipeType: 'dessert', language: 'he' })) {
    return true
  }

  const normalized = normalizeIngredient(dish)
  if (FOOD_DISH_HINT_PATTERNS.some((pattern) => pattern.test(dish) || pattern.test(normalized))) {
    return true
  }

  const tokens = dish.split(/\s+/).filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => ingredientTermMatchesKnownFood(token))) {
    return true
  }

  if (ingredientTermMatchesKnownFood(dish)) return true

  return false
}

function isKeyboardMash(text) {
  const compact = compactText(text)
  if (compact.length < 4) return false

  const keyboardSequences = ['asdf', 'qwer', 'wert', 'zxcv', 'hjkl', 'uiop', 'vbnm', 'ytre']
  if (keyboardSequences.some((seq) => compact.includes(seq))) return true

  if (/^(.)\1{3,}$/.test(compact)) return true

  return false
}

function isLikelyNonsenseToken(token) {
  const core = stripQuantityPrefix(token)
  if (!core || core.length < 4) return false

  if (isKeyboardMash(core)) return true

  const variants = tokenVariants(core)
  const nonsensePatterns = VIOLATION_PATTERN_GROUPS.find((group) => group.category === 'nonsense')?.patterns ?? []
  if (matchesPatternGroup(variants, nonsensePatterns)) return true

  const compact = compactText(core)
  if (compact.length >= 6 && /^[a-z]+$/i.test(compact) && !/[aeiouy]/i.test(compact)) {
    return true
  }

  return false
}

/**
 * @param {string} rawText
 * @param {'ingredient' | 'dish'} mode
 * @returns {{ blocked: boolean, category?: InputViolationCategory }}
 */
function validateField(rawText, mode = 'ingredient') {
  const text = String(rawText ?? '').trim()
  if (!text) return { blocked: false }

  const violation = detectInputViolation(text)
  if (violation.blocked) return violation

  const tokens = mode === 'dish' ? [normalizeDishIdea(text)] : parseUserIngredients(text)
  const tokenList = tokens.length ? tokens : [text]

  for (const token of tokenList) {
    const tokenViolation = detectInputViolation(token)
    if (tokenViolation.blocked) return tokenViolation

    if (isLikelyNonsenseToken(token)) {
      if (mode === 'dish' && isPlausibleDishName(token)) continue
      if (mode === 'ingredient' && ingredientTermMatchesKnownFood(token)) continue
      return { blocked: true, category: 'nonsense' }
    }

    if (mode === 'dish') {
      if (isPlausibleDishName(token)) continue
      if (isLikelyNonsenseToken(token) || isKeyboardMash(token)) {
        return { blocked: true, category: 'nonsense' }
      }
      const nonFoodPatterns =
        VIOLATION_PATTERN_GROUPS.find((group) => group.category === 'non_food')?.patterns ?? []
      if (matchesPatternGroup(tokenVariants(token), nonFoodPatterns)) {
        return { blocked: true, category: 'non_food' }
      }
      continue
    }

    if (ingredientTermMatchesKnownFood(token)) continue

    const nonFoodPatterns =
      VIOLATION_PATTERN_GROUPS.find((group) => group.category === 'non_food')?.patterns ?? []
    if (matchesPatternGroup(tokenVariants(token), nonFoodPatterns)) {
      return { blocked: true, category: 'non_food' }
    }
  }

  return { blocked: false }
}

function buildInputRejectionReason(language = 'he') {
  return language === 'en' ? RECIPE_INPUT_REJECTION_EN : RECIPE_INPUT_REJECTION_HE
}

/**
 * Validate ingredients and dish-name fields before generation.
 * Never returns blocked words — only a generic user-facing message.
 *
 * @param {{ ingredients?: string, dishIdea?: string, language?: string }} [options]
 */
export function assessRecipeInputSafety({ ingredients = '', dishIdea = '', language = 'he' } = {}) {
  const ingredientCheck = validateField(ingredients, 'ingredient')
  if (ingredientCheck.blocked) {
    return {
      ok: false,
      recipePossible: false,
      inputValidationFailed: true,
      blockedCategory: ingredientCheck.category,
      reason: buildInputRejectionReason(language),
      invalidTerms: [],
      invalidIngredients: [],
      missingIngredients: [],
    }
  }

  const dishCheck = validateField(dishIdea, 'dish')
  if (dishCheck.blocked) {
    return {
      ok: false,
      recipePossible: false,
      inputValidationFailed: true,
      blockedCategory: dishCheck.category,
      reason: buildInputRejectionReason(language),
      invalidTerms: [],
      invalidIngredients: [],
      missingIngredients: [],
    }
  }

  return {
    ok: true,
    recipePossible: true,
    inputValidationFailed: false,
    reason: '',
    invalidTerms: [],
    invalidIngredients: [],
    missingIngredients: [],
  }
}

/** @deprecated Prefer assessRecipeInputSafety */
export function assessIngredientSafety(raw, { language = 'he' } = {}) {
  return assessRecipeInputSafety({ ingredients: raw, dishIdea: '', language })
}

/** @deprecated Use assessRecipeInputSafety — kept for legacy imports */
export function findInvalidIngredients(tokens, rawText = '') {
  void tokens
  const result = assessRecipeInputSafety({ ingredients: rawText, dishIdea: '', language: 'he' })
  return result.ok ? [] : ['blocked']
}

/** @deprecated */
export const BLOCKED_INGREDIENT_TERMS = []
/** @deprecated */
export const BLOCKED_OFFENSIVE_TERMS = []
/** @deprecated */
export const BLOCKED_NON_FOOD_OBJECT_TERMS = []
/** @deprecated */
export const INGREDIENT_SAFETY_REJECTION_HE = RECIPE_INPUT_REJECTION_HE
/** @deprecated */
export const INGREDIENT_SAFETY_REJECTION_EN = RECIPE_INPUT_REJECTION_EN

/** @deprecated */
export function tokenMatchesBlocked() {
  return false
}

/** @deprecated */
export function tokenMatchesNonFoodObject() {
  return false
}

/** @deprecated */
export function fullTextMatchesBlocked() {
  return false
}
