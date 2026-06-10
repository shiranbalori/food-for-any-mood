import { getChallengeDateKey } from '../dailyChallenge/generateDailyChallenge'
import {
  assignLocalDailyQuiz,
  getQuizQuestionById,
} from './quizRotation'

/**
 * @param {string} language
 * @param {import('../../data/dailyQuizQuestions').DailyQuizQuestion} question
 * @param {string} dateKey
 */
export function localizeQuizQuestion(question, language = 'he', dateKey = getChallengeDateKey()) {
  const lang = language === 'en' ? 'en' : 'he'
  return {
    id: question.id,
    quizDate: dateKey,
    question: question.question[lang] ?? question.question.he,
    options: question.options[lang] ?? question.options.he,
    correctIndex: question.correctIndex,
    explanation: question.explanation[lang] ?? question.explanation.he,
  }
}

/**
 * Build a localized quiz object from a scheduled quiz id.
 * @param {string} quizId
 * @param {string} [dateKey]
 * @param {string} [language]
 */
export function buildDailyQuizFromId(quizId, dateKey = getChallengeDateKey(), language = 'he') {
  const question = getQuizQuestionById(quizId)
  return localizeQuizQuestion(question, language, dateKey)
}

/** Local-only fallback when Supabase schedule is unavailable. */
export function generateDailyQuiz(dateKey = getChallengeDateKey(), language = 'he') {
  const quizId = assignLocalDailyQuiz(dateKey)
  return buildDailyQuizFromId(quizId, dateKey, language)
}
