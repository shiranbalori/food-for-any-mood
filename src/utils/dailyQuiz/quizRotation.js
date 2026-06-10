import { DAILY_QUIZ_QUESTIONS } from '../../data/dailyQuizQuestions'

export const ALL_QUIZ_IDS = DAILY_QUIZ_QUESTIONS.map((question) => question.id)

const LS_SCHEDULE = 'ffam_quiz_schedule'
const LS_ROTATION = 'ffam_quiz_rotation'

export function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function getQuizQuestionById(quizId) {
  return DAILY_QUIZ_QUESTIONS.find((question) => question.id === quizId) ?? DAILY_QUIZ_QUESTIONS[0]
}

/**
 * Pick the next quiz for a date without repeating until the full bank is used.
 * @param {string} dateKey YYYY-MM-DD
 * @param {string[]} usedQuizIds
 * @param {number} cycleNumber
 */
export function computeNextQuizAssignment(dateKey, usedQuizIds = [], cycleNumber = 1) {
  const allIds = ALL_QUIZ_IDS
  let used = [...usedQuizIds]
  let cycle = cycleNumber
  let unused = allIds.filter((id) => !used.includes(id))

  if (unused.length === 0) {
    cycle += 1
    used = []
    unused = [...allIds]
  }

  unused.sort()
  const index = hashString(`${dateKey}:daily-quiz`) % unused.length
  const quizId = unused[index]

  return {
    quizId,
    cycleNumber: cycle,
    usedQuizIds: [...used, quizId],
  }
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage errors
  }
}

export function getLocalQuizSchedule(dateKey) {
  const schedule = readJson(LS_SCHEDULE, {})
  return schedule[dateKey] ?? null
}

export function setLocalQuizSchedule(dateKey, entry) {
  const schedule = readJson(LS_SCHEDULE, {})
  schedule[dateKey] = entry
  writeJson(LS_SCHEDULE, schedule)
}

export function getLocalQuizRotation() {
  return readJson(LS_ROTATION, { cycleNumber: 1, usedQuizIds: [] })
}

export function setLocalQuizRotation(rotation) {
  writeJson(LS_ROTATION, {
    cycleNumber: rotation.cycleNumber ?? 1,
    usedQuizIds: Array.isArray(rotation.usedQuizIds) ? rotation.usedQuizIds : [],
  })
}

export function assignLocalDailyQuiz(dateKey) {
  const existing = getLocalQuizSchedule(dateKey)
  if (existing?.quizId) {
    return existing.quizId
  }

  const rotation = getLocalQuizRotation()
  const assignment = computeNextQuizAssignment(
    dateKey,
    rotation.usedQuizIds,
    rotation.cycleNumber,
  )

  setLocalQuizSchedule(dateKey, {
    quizId: assignment.quizId,
    cycleNumber: assignment.cycleNumber,
  })
  setLocalQuizRotation({
    cycleNumber: assignment.cycleNumber,
    usedQuizIds: assignment.usedQuizIds,
  })

  return assignment.quizId
}
