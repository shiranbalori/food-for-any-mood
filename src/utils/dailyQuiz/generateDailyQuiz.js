import { DAILY_QUIZ_QUESTIONS } from '../../data/dailyQuizQuestions'
import { getChallengeDateKey } from '../dailyChallenge/generateDailyChallenge'
import { validateQuizQuestion } from './validateQuizQuestion'

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * @param {string} language
 * @param {import('../../data/dailyQuizQuestions').DailyQuizQuestion} question
 */
export function localizeQuizQuestion(question, language = 'he') {
  const lang = language === 'en' ? 'en' : 'he'
  return {
    id: question.id,
    quizDate: getChallengeDateKey(),
    question: question.question[lang] ?? question.question.he,
    options: question.options[lang] ?? question.options.he,
    correctIndex: question.correctIndex,
    explanation: question.explanation[lang] ?? question.explanation.he,
  }
}

/**
 * @param {string} [dateKey]
 * @param {string} [language]
 */
export function generateDailyQuiz(dateKey = getChallengeDateKey(), language = 'he') {
  const baseIndex = hashString(`${dateKey}:daily-quiz`) % DAILY_QUIZ_QUESTIONS.length

  for (let offset = 0; offset < DAILY_QUIZ_QUESTIONS.length; offset += 1) {
    const question = DAILY_QUIZ_QUESTIONS[(baseIndex + offset) % DAILY_QUIZ_QUESTIONS.length]
    if (!validateQuizQuestion(question)) {
      console.warn('[dailyQuiz] Skipping invalid question:', question.id)
      continue
    }
    return {
      ...localizeQuizQuestion(question, language),
      quizDate: dateKey,
    }
  }

  const fallback = DAILY_QUIZ_QUESTIONS.find((question) => validateQuizQuestion(question))
  if (!fallback) {
    throw new Error('No valid daily quiz questions configured')
  }

  return {
    ...localizeQuizQuestion(fallback, language),
    quizDate: dateKey,
  }
}
