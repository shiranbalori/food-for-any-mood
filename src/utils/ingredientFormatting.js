/** Clean ingredient lines for display and storage. */

import { getIngredientLabel } from '../data/ingredientLabels'
import { canonicalIngredient } from '../data/ingredientKnowledge'
import { stripQuantityPrefix } from './measurementUnits'

const BULLET_PREFIX = /^[\s•·\u2022\u2023\u2043\u2219*\-\u2013\u2014]+/

const NUMBER_ONLY = /^[\d\s./]+$/

const LEADING_QUANTITY = /^(\d+(?:\s+\d+\/\d+)?)\s+/

/**
 * Remove list markers accidentally embedded in ingredient text (CSS already adds a bullet).
 */
export function stripIngredientBullets(text) {
  let line = String(text ?? '').trim()
  while (BULLET_PREFIX.test(line)) {
    line = line.replace(BULLET_PREFIX, '').trim()
  }
  return line
}

export function isNumericOnlyText(text) {
  return NUMBER_ONLY.test(String(text ?? '').trim())
}

/**
 * True when the line is a non-empty, meaningful ingredient (not just numbers).
 */
export function isValidIngredientLine(text) {
  const line = stripIngredientBullets(text)
  if (!line) return false
  if (NUMBER_ONLY.test(line)) return false

  if (/^(\d+(?:\s+\d+\/\d+)?)\s+\1$/.test(line)) return false

  const afterQty = line.replace(LEADING_QUANTITY, '').trim()
  if (afterQty && NUMBER_ONLY.test(afterQty)) return false

  return true
}

/**
 * Normalize one ingredient line: strip bullets and fix duplicated leading quantities.
 */
export function sanitizeIngredientLine(text) {
  let line = stripIngredientBullets(text)
  if (!line) return ''

  const dupWithName = line.match(/^(\d+(?:\s+\d+\/\d+)?)\s+\1\s+(.+)$/)
  if (dupWithName) {
    line = `${dupWithName[1]} ${dupWithName[2]}`
  }

  return isValidIngredientLine(line) ? line : ''
}

/**
 * Keep a readable ingredient phrase when quantification would corrupt it.
 */
export function toReadableIngredientLine(raw, language = 'he') {
  const line = stripIngredientBullets(raw)
  if (!line) return ''

  const sanitized = sanitizeIngredientLine(line)
  if (sanitized) return sanitized

  const bare = stripQuantityPrefix(line).trim()
  if (!bare || isNumericOnlyText(bare)) return ''

  if (language === 'he') {
    const canon = canonicalIngredient(bare)
    const label = getIngredientLabel(canon ?? bare, 'he')
    if (label && isValidIngredientLine(label)) return label
  }

  return isValidIngredientLine(bare) ? bare : ''
}

/**
 * Filter and clean an ingredient list.
 */
export function sanitizeIngredientList(items) {
  if (!Array.isArray(items)) return []
  return items.map(sanitizeIngredientLine).filter(Boolean)
}

const PLACEHOLDER_PATTERNS = [
  /\(strawberry\)/i,
  /\[ingredient\]/i,
  /ingredient_name/i,
  /\bTODO\b/i,
  /\bplaceholder\b/i,
  /\{\{.*?\}\}/,
  /<.*?>/,
  /\bxxx\b/i,
  /lorem ipsum/i,
]

/**
 * Remove duplicated quantity artifacts from cooking steps (e.g. "4 4 מרשמלו").
 */
export function sanitizeStepText(text) {
  let line = stripIngredientBullets(String(text ?? ''))
  line = line.replace(/(\d+(?:\s+\d+\/\d+)?)\s+\1(\s+)(?=[\u0590-\u05FFa-zA-Z])/g, '$1$2')
  line = line.replace(/(\d+(?:\s+\d+\/\d+)?)\s+\1$/g, '$1')
  return line.trim()
}

function removeDuplicateWords(text) {
  let line = String(text ?? '')
  line = line.replace(/\b([\u0590-\u05FFa-z]+)\s+\1\b/gi, '$1')
  return line
}

function removeRepeatedParentheses(text) {
  let line = String(text ?? '')
  line = line.replace(/(\([^)]+\))(?:\s+\1)+/g, '$1')
  return line
}

function stripPlaceholderText(text) {
  let line = String(text ?? '')
  for (const pattern of PLACEHOLDER_PATTERNS) {
    line = line.replace(pattern, '')
  }
  return line.replace(/\s{2,}/g, ' ').trim()
}

/**
 * Minimal step cleanup for Gemini output — no ingredient injection or rewrites.
 */
export function lightSanitizeStepText(text) {
  let line = sanitizeStepText(text)
  line = removeRepeatedParentheses(line)
  line = removeDuplicateWords(line)
  line = stripPlaceholderText(line)
  return line.trim()
}

export function lightSanitizeRecipeSteps(steps) {
  if (!Array.isArray(steps)) return []
  return steps.map(lightSanitizeStepText).filter(Boolean)
}

export function sanitizeRecipeSteps(steps) {
  if (!Array.isArray(steps)) return []
  return steps.map(sanitizeStepText).filter(Boolean)
}

export function hasRepeatedParentheticalIngredients(text) {
  return /(\([^)]+\))(?:\s+\1)+/.test(String(text ?? ''))
}
