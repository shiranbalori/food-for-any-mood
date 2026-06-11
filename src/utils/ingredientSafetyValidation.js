/**
 * Lightweight pre-validation for obviously invalid / unsafe ingredient inputs.
 * Focused blocklist only — does not reject unfamiliar but valid foods.
 */

import { parseUserIngredients } from './ingredientRelevance'

export const INGREDIENT_SAFETY_REJECTION_HE =
  'נראה שחלק מהמרכיבים שהוזנו אינם מתאימים למתכון. נסו להזין מרכיבי אוכל אמיתיים כמו ירקות, פירות, קמח, ביצים, אורז, פסטה או תבלינים.'

export const INGREDIENT_SAFETY_REJECTION_EN =
  'Some of the ingredients you entered do not look suitable for a recipe. Try real food ingredients such as vegetables, fruit, flour, eggs, rice, pasta, or spices.'

/** Obvious non-food, unsafe, offensive, or illegal terms — lowercase normalized form. */
export const BLOCKED_INGREDIENT_TERMS = [
  // Profanity / disgusting non-food
  'חרא',
  'קקי',
  'צואה',
  'shit',
  'poop',
  'feces',
  'crap',
  // Drugs / illegal substances
  'סמים',
  'סם',
  'קוקאין',
  'cocaine',
  'הרואין',
  'heroin',
  'מריחואנה',
  'marijuana',
  'קנאביס',
  'cannabis',
  'weed',
  'hashish',
  'חשיש',
  'lsd',
  'mdma',
  'ecstasy',
  'meth',
  'crack',
  'opium',
  'אופיום',
  // Unsafe / toxic non-food
  'אקונומיקה',
  'רעל',
  'poison',
  'bleach',
  'דבק',
  'glue',
  'בנזין',
  'gasoline',
  'petrol',
  'ammonia',
  'אמוניה',
  'detergent',
  'אבקת כביסה',
  'insecticide',
  'הדברה',
  // Clearly non-food objects
  'נעל',
  'shoe',
  'פלסטיק',
  'plastic',
  'זכוכית',
  'glass',
  'battery',
  'סוללה',
  'metal',
  'נייר',
  'paper',
  'rubber',
  'גומי',
  'cardboard',
  'carton',
  // Violent / harmful items
  'אקדח',
  'gun',
  'pistol',
  'rifle',
  'פצצה',
  'bomb',
  'explosive',
  'נשק',
  'weapon',
  'dynamite',
  'דינמיט',
]

const QTY_PREFIX =
  /^[\d\s/]+(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ"?ל|כוס(?:ות)?|יח(?:ידה|ידות)?|tsp|tbsp|cup|cups|g|ml|kg|lb|lbs)\.?\s*/i

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

function stripQuantityPrefix(token) {
  return String(token ?? '')
    .replace(QTY_PREFIX, '')
    .trim()
}

function isLatinTerm(term) {
  return /^[a-z0-9][a-z0-9\s'-]*$/i.test(term)
}

function latinWholeWordMatch(term, text) {
  const re = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i')
  return re.test(text)
}

export function tokenMatchesBlocked(blockedTerm, token) {
  const blocked = normalizeSafetyText(blockedTerm)
  const normalizedToken = normalizeSafetyText(stripQuantityPrefix(token))
  if (!blocked || !normalizedToken) return false

  if (normalizedToken === blocked) return true

  const words = normalizedToken.split(/\s+/).filter(Boolean)
  if (words.some((word) => word === blocked)) return true

  if (isLatinTerm(blocked)) {
    return latinWholeWordMatch(blocked, normalizedToken)
  }

  if (normalizedToken.includes(blocked)) {
    if (words.some((word) => word === blocked || word.startsWith(blocked))) return true
    if (normalizedToken.length <= blocked.length + 1) return true
  }

  return false
}

export function fullTextMatchesBlocked(blockedTerm, rawText) {
  const blocked = normalizeSafetyText(blockedTerm)
  const full = normalizeSafetyText(rawText)
  if (!blocked || !full) return false

  if (isLatinTerm(blocked)) {
    return latinWholeWordMatch(blocked, full)
  }

  return full
    .split(/[,;\n]+/)
    .map((part) => normalizeSafetyText(stripQuantityPrefix(part)))
    .some((part) => part === blocked || part.includes(blocked))
}

export function findInvalidIngredients(tokens, rawText = '') {
  const invalid = new Set()

  for (const token of tokens) {
    for (const blocked of BLOCKED_INGREDIENT_TERMS) {
      if (tokenMatchesBlocked(blocked, token)) {
        invalid.add(token)
        break
      }
    }
  }

  if (invalid.size === 0 && String(rawText ?? '').trim()) {
    for (const blocked of BLOCKED_INGREDIENT_TERMS) {
      if (fullTextMatchesBlocked(blocked, rawText)) {
        invalid.add(blocked)
        break
      }
    }
  }

  return [...invalid]
}

/**
 * @param {string} raw
 * @param {{ language?: string }} [options]
 */
export function assessIngredientSafety(raw, { language = 'he' } = {}) {
  const ingredients = parseUserIngredients(raw)
  if (ingredients.length === 0) {
    return { ok: true, recipePossible: true, reason: '', invalidIngredients: [] }
  }

  const invalidIngredients = findInvalidIngredients(ingredients, raw)
  if (invalidIngredients.length === 0) {
    return { ok: true, recipePossible: true, reason: '', invalidIngredients: [] }
  }

  return {
    ok: false,
    recipePossible: false,
    reason: language === 'en' ? INGREDIENT_SAFETY_REJECTION_EN : INGREDIENT_SAFETY_REJECTION_HE,
    invalidIngredients,
  }
}
