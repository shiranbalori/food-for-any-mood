/**
 * Guards daily quiz content — distractors must be plausible food/cooking facts.
 */

/** Patterns that indicate nonsense or non-educational distractors. */
const NONSENSE_OPTION_PATTERNS = [
  /^הוא מתוקן$/i,
  /^הוא הופך לסגול/i,
  /^הופך לסגול/i,
  /^הוא מקבל.*ויטמינ/i,
  /^הוא מקבל יותר/i,
  /^It improves$/i,
  /^It gains more vitamins$/i,
  /^It becomes sweeter$/i,
  /^It turns purple$/i,
  /^הוא נעלם/i,
  /^הוא הופך לסוכר/i,
  /^הופך לשומן$/i,
  /^העלים ויטמינים$/i,
  /^להעלים ויטמינים$/i,
]

/**
 * @param {string} text
 */
export function isPlausibleQuizOption(text) {
  const value = String(text ?? '').trim()
  if (value.length < 4) return false
  if (NONSENSE_OPTION_PATTERNS.some((pattern) => pattern.test(value))) return false
  return true
}

/**
 * @param {import('../../data/dailyQuizQuestions').DailyQuizQuestion} question
 */
export function validateQuizQuestion(question) {
  if (!question?.options || question.correctIndex == null) return false
  if (question.correctIndex < 0 || question.correctIndex > 3) return false

  for (const lang of ['he', 'en']) {
    const options = question.options[lang]
    if (!Array.isArray(options) || options.length !== 4) return false
    if (new Set(options.map((item) => String(item).trim())).size !== 4) return false
    if (options.some((option) => !isPlausibleQuizOption(option))) return false
  }

  return true
}
