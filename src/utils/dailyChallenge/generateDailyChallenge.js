import { INGREDIENT_LABELS_HE } from '../../data/ingredientLabels'
import { CHALLENGE_CATEGORY_HINTS, CHALLENGE_TYPES } from './challengeTypes'

const INGREDIENT_POOL = [...new Set(Object.values(INGREDIENT_LABELS_HE))].sort()

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createSeededRandom(seed) {
  let state = seed
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/**
 * UTC date key YYYY-MM-DD — same challenge worldwide per calendar day.
 * @param {Date} [date]
 */
export function getChallengeDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

/**
 * @param {Date} [now]
 */
export function getMillisUntilNextChallenge(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return Math.max(0, next.getTime() - now.getTime())
}

/**
 * @param {string} [dateKey]
 */
/**
 * @param {number} [count] Number of past days (excluding today)
 */
export function getPastChallengeDateKeys(count = 14) {
  const keys = []
  for (let offset = 1; offset <= count; offset += 1) {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - offset)
    keys.push(getChallengeDateKey(date))
  }
  return keys
}

export function generateDailyChallenge(dateKey = getChallengeDateKey()) {
  const random = createSeededRandom(hashString(`${dateKey}:${CHALLENGE_TYPES.INGREDIENT}`))
  const pool = [...INGREDIENT_POOL]
  const ingredients = []

  while (ingredients.length < 5 && pool.length > 0) {
    const index = Math.floor(random() * pool.length)
    ingredients.push(pool.splice(index, 1)[0])
  }

  const categoryHint = CHALLENGE_CATEGORY_HINTS[Math.floor(random() * CHALLENGE_CATEGORY_HINTS.length)]

  return {
    challengeDate: dateKey,
    challengeType: CHALLENGE_TYPES.INGREDIENT,
    ingredients,
    categoryHint,
    ruleKey: 'challengeRuleMinIngredients',
    minIngredientsRequired: 3,
  }
}
