import { getIngredientLabel } from '../data/ingredientLabels'
import { canonicalIngredient } from '../data/ingredientKnowledge'
import { ingredientAppearsInText } from './ingredientRelevance'
import { sanitizeHomeCookingStep } from './homeCookingLanguage'
import { stripIngredientBullets } from './ingredientFormatting'
import {
  ENGLISH_UNIT_ALTERNATIVES,
  parseAnyLeadingMeasurement,
  stripQuantityPrefix,
} from './measurementUnits'

const HEBREW_UNITS = 'כפית|כפיות|כף|כפות|גרם|מ"ל|כוס|כוסות|יחידה|יחידות'
const ALL_UNITS = `${HEBREW_UNITS}|${ENGLISH_UNIT_ALTERNATIVES}`
const QTY = String.raw`\d+(?:\s+\d+\/\d+)?`

const HEBREW_UNNATURAL_PATTERNS = [
  /מכינים ומסדרים את/,
  /מקפלים פנימה/,
  /מבצעים אמולסיה/,
  /אינקורפורציה/,
  /טמפרור/,
  /הומוגניזציה/,
  /רדוקציה/,
  /מבצעים פיזור אחיד/,
  new RegExp(String.raw`אבקת\s+${QTY}\s*(?:${ALL_UNITS})`, 'i'),
  new RegExp(String.raw`(?<=^|[\s(,])${QTY}\s+(?!דק(?:ות)?|שע(?:ות)?)[\u0590-\u05FF]`, 'i'),
  /(?:ה[\u0590-\u05FF]+\s+){1,}ו(?:ה[\u0590-\u05FF]+\s+)+ו/,
]

const ENGLISH_UNNATURAL_PATTERNS = [
  new RegExp(String.raw`(?:^|[\s(,])${QTY}\s*(?:${ALL_UNITS})\.?\s+[a-z]`, 'i'),
  new RegExp(String.raw`(?<=^|[\s(,])${QTY}\s+(?!minutes?|mins?|hours?|seconds?|sec)[a-z]`, 'i'),
  /\bpowdered\s+\d+/i,
]

export function withHebrewDefiniteArticle(name) {
  const word = String(name ?? '').trim()
  if (!word) return word
  if (word.startsWith('ה') && word.length > 2) return word
  if (/^אבקת\s/.test(word)) return word
  if (/^ו[\u0590-\u05FF]/.test(word)) return `ה${word}`

  if (word.includes(' ')) {
    const [first, second, ...rest] = word.split(/\s+/)
    if (first === 'שמן' && second) {
      return `שמן ה${second}${rest.length ? ` ${rest.join(' ')}` : ''}`
    }
    return `ה${word}`
  }

  return `ה${word}`
}

function withEnglishArticle(name) {
  const word = String(name ?? '').trim().toLowerCase()
  if (!word) return word
  if (word.startsWith('the ')) return word
  return `the ${word}`
}

function bareIngredientName(nameOrDisplay, language) {
  const raw = stripIngredientBullets(String(nameOrDisplay ?? '').trim())
  if (!raw) return ''

  const measured = parseAnyLeadingMeasurement(raw)
  const bare = measured?.name?.trim() || stripQuantityPrefix(raw).trim() || raw
  const canon = canonicalIngredient(bare)
  return getIngredientLabel(canon ?? bare, language) || bare
}

export function toStepIngredientReference(nameOrDisplay, language = 'he') {
  const label = bareIngredientName(nameOrDisplay, language)
  if (!label) return ''
  return language === 'he' ? withHebrewDefiniteArticle(label) : withEnglishArticle(label)
}

/**
 * Hebrew: "הקפה, הסוכר והווניל"
 */
export function formatHebrewStepIngredientList(references) {
  const items = (references ?? []).map((item) => String(item ?? '').trim()).filter(Boolean)
  if (items.length === 0) return 'המרכיבים'
  if (items.length === 1) return items[0]
  if (items.length === 2) {
    const [first, second] = items
    const a = first.startsWith('ה') ? first : `ה${first}`
    const b = second.startsWith('ה') ? second : `ה${second}`
    return `${a} ו${b.replace(/^ה/, '')}`
  }
  const last = items[items.length - 1]
  const head = items.slice(0, -1).join(', ')
  return `${head} ו${last.replace(/^ה/, '')}`
}

/**
 * English: "the coffee, the sugar, and the vanilla"
 */
export function formatEnglishStepIngredientList(references) {
  const items = (references ?? []).map((item) => String(item ?? '').trim()).filter(Boolean)
  if (items.length === 0) return 'the ingredients'
  if (items.length === 1) return items[0]
  if (items.length === 2) {
    const [first, second] = items
    return `${first} and ${second.replace(/^the\s+/i, 'the ')}`
  }
  const last = items[items.length - 1]
  const head = items.slice(0, -1).join(', ')
  return `${head}, and ${last}`
}

export function formatStepIngredientList(references, language = 'he') {
  return language === 'he'
    ? formatHebrewStepIngredientList(references)
    : formatEnglishStepIngredientList(references)
}

function fixHebrewRepeatedVavLists(text) {
  return text.replace(
    /((?:ה[\u0590-\u05FF]+(?:\s|$))+(?:\s+ו\s*ה[\u0590-\u05FF]+)+)/g,
    (match) => {
      const parts = match
        .split(/\s+ו\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => (part.startsWith('ה') ? part : `ה${part}`))
      return formatHebrewStepIngredientList(parts)
    },
  )
}

export function stripQuantitiesFromStepText(text, language = 'he') {
  let line = String(text ?? '').trim()
  if (!line) return line

  if (language === 'he') {
    line = line.replace(
      new RegExp(String.raw`(אבקת\s+)${QTY}\s*(?:${ALL_UNITS})\.?\s+`, 'gi'),
      '$1',
    )

    line = line.replace(
      new RegExp(String.raw`${QTY}\s*(?:${ALL_UNITS})\.?\s+([\u0590-\u05FF][\u0590-\u05FF\s"']*)`, 'gi'),
      (_, name) => withHebrewDefiniteArticle(name.trim()),
    )

    line = line.replace(
      new RegExp(String.raw`(את\s+)${QTY}\s+([\u0590-\u05FF][\u0590-\u05FF]+)`, 'g'),
      (_, prefix, noun) => `${prefix}${withHebrewDefiniteArticle(noun)}`,
    )

    line = line.replace(
      new RegExp(String.raw`(?<=^|[\s(,])${QTY}\s+([\u0590-\u05FF][\u0590-\u05FF]+)(?=[\s,.)]|$)`, 'g'),
      (_, noun) => withHebrewDefiniteArticle(noun),
    )

    line = line.replace(
      /([\u0590-\u05FF]+),\s+(ו?[\u0590-\u05FF]+)/g,
      (_, first, second) => {
        const a = withHebrewDefiniteArticle(first.replace(/^ה/, ''))
        const b = withHebrewDefiniteArticle(second.replace(/^ו?/, ''))
        return `${a} ו${b.replace(/^ה/, '')}`
      },
    )

    line = line.replace(/מכינים ומסדרים את/g, 'מסדרים את')
    line = fixHebrewRepeatedVavLists(line)
  } else {
    line = line.replace(
      new RegExp(String.raw`\b(?:powdered|ground)\s+${QTY}\s*(?:${ALL_UNITS})\.?\s+`, 'gi'),
      'powdered ',
    )

    line = line.replace(
      new RegExp(String.raw`\b${QTY}\s*(?:${ALL_UNITS})\.?\s+([a-z][a-z\s'-]*)`, 'gi'),
      (_, name) => withEnglishArticle(name.trim()),
    )

    line = line.replace(
      new RegExp(String.raw`(?<=^|[\s(,])${QTY}\s+([a-z][a-z'-]*)(?=[\s,.)]|$)`, 'gi'),
      (_, name) => withEnglishArticle(name.trim()),
    )

    line = line.replace(/\bprepare and arrange\b/gi, 'Arrange')
    line = line.replace(/\b(\w[\w\s'-]*),\s+(\w[\w\s'-]*)\s+and\b/gi, '$1 and')
  }

  return line.replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim()
}

function replaceBareWithReference(text, bare, ref, language) {
  if (!bare || !ref || text.includes(ref)) return text

  if (language === 'he') {
    const bareHe = bare.replace(/^ה/, '')
    return text.replace(
      new RegExp(`(^|[^\\u0590-\\u05FF])${escapeRegExp(bareHe)}(?=[^\\u0590-\\u05FF]|$)`, 'g'),
      `$1${ref}`,
    )
  }

  return text.replace(new RegExp(`\\b${escapeRegExp(bare)}\\b`, 'gi'), ref)
}

export function naturalizeRecipeSteps(steps, ingredientNames = [], language = 'he') {
  const refs = (ingredientNames ?? [])
    .map((name) => toStepIngredientReference(name, language))
    .filter(Boolean)

  return (steps ?? []).map((step) => {
    let text = stripQuantitiesFromStepText(step, language)

    for (let i = 0; i < (ingredientNames ?? []).length; i += 1) {
      const bare = bareIngredientName(ingredientNames[i], language)
      const ref = refs[i]
      if (bare && ref) {
        text = replaceBareWithReference(text, bare, ref, language)
      }
    }

    return sanitizeHomeCookingStep(stripQuantitiesFromStepText(text, language), language)
  })
}

export function hasUnnaturalStepPhrasing(steps, language = 'he') {
  const patterns = language === 'he' ? HEBREW_UNNATURAL_PATTERNS : ENGLISH_UNNATURAL_PATTERNS
  const issues = []

  for (const step of steps ?? []) {
    const text = String(step ?? '')
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        issues.push(text)
        break
      }
    }
  }

  return issues
}

export function verifyStepIngredientAlignment(ingredients, steps, language = 'he', options = {}) {
  const stepsText = (steps ?? []).join('\n')
  const staples = options.staples ?? new Set(['salt', 'pepper', 'black pepper', 'oil', 'olive', 'olive oil', 'water', 'sugar'])

  const missing = (ingredients ?? []).filter((item) => {
    const canon = canonicalIngredient(item)
    if (canon && staples.has(canon)) return false
    return !ingredientAppearsInText(item, stepsText)
  })

  return missing.length === 0
}

export function alignStepsWithIngredientList(steps, ingredients, language = 'he') {
  if (!Array.isArray(steps) || steps.length === 0 || !ingredients?.length) return steps ?? []
  return naturalizeRecipeSteps(steps, ingredients, language)
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Backward-compatible exports
export const naturalizeHebrewSteps = naturalizeRecipeSteps
