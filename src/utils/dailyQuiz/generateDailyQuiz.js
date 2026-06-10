import { DAILY_QUIZ_QUESTIONS } from '../../data/dailyQuizQuestions'
import { getChallengeDateKey } from '../dailyChallenge/generateDailyChallenge'

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
  const index = hashString(`${dateKey}:daily-quiz`) % DAILY_QUIZ_QUESTIONS.length
  const question = DAILY_QUIZ_QUESTIONS[index]
  return {
    ...localizeQuizQuestion(question, language),
    quizDate: dateKey,
  }
}
