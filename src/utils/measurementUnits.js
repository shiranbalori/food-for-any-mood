/** English → Hebrew measurement unit translation for recipe ingredients. */

export const ENGLISH_UNIT_ALTERNATIVES =
  'tablespoons|tablespoon|teaspoons|teaspoon|cups|cup|grams|gram|pieces|piece|tbsp|tsp|g|ml|pcs'

const HEBREW_UNIT_WORDS = 'כפיות|כפית|כפות|כף|כוסות|כוס|גרם|מ"ל|יחידות|יחידה'

const HEBREW_TO_UNIT_KEY = {
  כפית: 'tsp',
  כפיות: 'tsp',
  כף: 'tbsp',
  כפות: 'tbsp',
  גרם: 'gram',
  'מ"ל': 'ml',
  כוס: 'cup',
  כוסות: 'cup',
  יחידה: 'piece',
  יחידות: 'piece',
}

export const QUANTITY_UNIT_PREFIX = new RegExp(
  `^([\\d./]+(?:\\s+\\d+\\/\\d+)?)\\s*(?:${ENGLISH_UNIT_ALTERNATIVES})\\.?\\s*`,
  'i',
)

const HEBREW_QUANTITY_UNIT_PREFIX = new RegExp(
  `^([\\d./]+(?:\\s+\\d+\\/\\d+)?)\\s*(?:${HEBREW_UNIT_WORDS})\\.?\\s*`,
)

export const MEASURED_UNIT_TOKEN = new RegExp(
  `(?:כפית|כפיות|כף|כפות|גרם|מ"ל|כוס|כוסות|יחידה|יחידות|\\b(?:${ENGLISH_UNIT_ALTERNATIVES})\\b)`,
  'i',
)

const HEBREW_UNITS = {
  cup: { singular: 'כוס', plural: 'כוסות' },
  tbsp: { singular: 'כף', plural: 'כפות' },
  tsp: { singular: 'כפית', plural: 'כפיות' },
  gram: { singular: 'גרם', plural: 'גרם' },
  ml: { singular: 'מ"ל', plural: 'מ"ל' },
  piece: { singular: 'יחידה', plural: 'יחידות' },
}

const ENGLISH_UNIT_ALIASES = {
  cup: 'cup',
  cups: 'cup',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
  gram: 'gram',
  grams: 'gram',
  g: 'gram',
  ml: 'ml',
  piece: 'piece',
  pieces: 'piece',
  pcs: 'piece',
}

export function normalizeUnitKey(unit) {
  return ENGLISH_UNIT_ALIASES[String(unit ?? '').toLowerCase()] ?? String(unit ?? '').toLowerCase()
}

export function parseAmount(value) {
  const text = String(value ?? '').trim()
  if (!text) return 0

  const mixed = text.match(/^(\d+)\s+(\d+\/\d+)$/)
  if (mixed) {
    const [, whole, fraction] = mixed
    const [num, den] = fraction.split('/').map(Number)
    return Number(whole) + num / den
  }

  if (text.includes('/')) {
    const [num, den] = text.split('/').map(Number)
    if (den) return num / den
  }

  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getHebrewUnitLabel(unitKey, amount) {
  const key = normalizeUnitKey(unitKey)
  const labels = HEBREW_UNITS[key]
  if (!labels) return unitKey
  return Math.abs(amount - 1) < 0.001 ? labels.singular : labels.plural
}

/**
 * Format a Hebrew measured ingredient (e.g. "2 כוסות סוכר", "כוס קפה").
 */
export function formatHebrewMeasurement(qty, unitKey, ingredientName) {
  const name = String(ingredientName ?? '').trim()
  const amount = typeof qty === 'number' ? qty : parseAmount(qty)
  const unitWord = getHebrewUnitLabel(unitKey, amount)

  if (!name) return amount === 1 ? unitWord : `${formatQuantity(amount)} ${unitWord}`

  if (Math.abs(amount - 1) < 0.001) {
    return `${unitWord} ${name}`
  }

  return `${formatQuantity(amount)} ${unitWord} ${name}`
}

function formatQuantity(amount) {
  const rounded = Math.round(amount * 4) / 4
  const whole = Math.floor(rounded)
  const frac = Math.round((rounded - whole) * 4)
  const fracMap = { 1: '1/4', 2: '1/2', 3: '3/4' }

  if (whole === 0 && frac > 0) return fracMap[frac] ?? String(rounded)
  if (frac === 0) return String(whole)
  if (whole === 0) return fracMap[frac]
  return `${whole} ${fracMap[frac]}`
}

/**
 * Parse "4 cups coffee" into { qty, unit, name }.
 */
export function parseLeadingMeasurement(raw) {
  const text = String(raw ?? '').trim()
  const match = text.match(
    new RegExp(
      `^([\\d./]+(?:\\s+\\d+\\/\\d+)?)\\s*(${ENGLISH_UNIT_ALTERNATIVES})\\.?\\s+(.+)$`,
      'i',
    ),
  )

  if (!match) return null

  return {
    qty: match[1],
    unit: normalizeUnitKey(match[2]),
    name: match[3].trim(),
  }
}

export function stripQuantityPrefix(raw) {
  const text = String(raw ?? '').trim()
  let without = text.replace(QUANTITY_UNIT_PREFIX, '').trim()
  if (without !== text) return without || text
  without = text.replace(HEBREW_QUANTITY_UNIT_PREFIX, '').trim()
  return without || text
}

/**
 * Parse "4 כוסות קפה" into { qty, unit, name }.
 */
export function parseHebrewLeadingMeasurement(raw) {
  const text = String(raw ?? '').trim()
  const match = text.match(
    new RegExp(
      `^([\\d./]+(?:\\s+\\d+\\/\\d+)?)\\s*(${HEBREW_UNIT_WORDS})\\.?\\s+(.+)$`,
    ),
  )

  if (!match) return null

  const unitWord = match[2]
  return {
    qty: match[1],
    unit: HEBREW_TO_UNIT_KEY[unitWord] ?? unitWord,
    name: match[3].trim(),
  }
}

/** Parse English or Hebrew leading measurement. */
export function parseAnyLeadingMeasurement(raw) {
  return parseLeadingMeasurement(raw) ?? parseHebrewLeadingMeasurement(raw)
}

/** Legacy map for callers that expect singular labels only. */
export const UNIT_LABELS = {
  he: {
    tsp: HEBREW_UNITS.tsp.singular,
    tbsp: HEBREW_UNITS.tbsp.singular,
    gram: HEBREW_UNITS.gram.singular,
    ml: HEBREW_UNITS.ml.singular,
    cup: HEBREW_UNITS.cup.singular,
    piece: HEBREW_UNITS.piece.singular,
  },
  en: {
    tsp: 'tsp',
    tbsp: 'tbsp',
    gram: 'gram',
    ml: 'ml',
    cup: 'cup',
    piece: 'piece',
  },
}
