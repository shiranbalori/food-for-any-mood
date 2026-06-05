import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getChallengeDateKey } from '../utils/dailyChallenge/generateDailyChallenge'
import { POINT_AWARDS } from '../utils/dailyChallenge/points'
import { generateDailyQuiz } from '../utils/dailyQuiz/generateDailyQuiz'
import { awardGamificationPoints, fetchUserGamification } from './dailyChallengeService'

const LS_QUIZ_ANSWERS = 'ffam_quiz_answers'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getLocalQuizAnswers(userId) {
  const all = readJson(LS_QUIZ_ANSWERS, {})
  return all[userId] ?? {}
}

function saveLocalQuizAnswer(userId, quizDate, answer) {
  const all = readJson(LS_QUIZ_ANSWERS, {})
  const userAnswers = { ...(all[userId] ?? {}), [quizDate]: answer }
  all[userId] = userAnswers
  writeJson(LS_QUIZ_ANSWERS, all)
}

async function getRemoteQuizAnswer(userId, quizDate) {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase
    .from('daily_quiz_answers')
    .select('selected_index, is_correct, points_awarded')
    .eq('user_id', userId)
    .eq('quiz_date', quizDate)
    .maybeSingle()

  if (error) {
    console.error('[dailyQuizService] remote answer fetch:', error)
    return getLocalQuizAnswers(userId)[quizDate] ?? null
  }

  if (!data) return null

  return {
    selectedIndex: data.selected_index,
    correct: data.is_correct,
    pointsAwarded: data.points_awarded ?? 0,
  }
}

async function saveRemoteQuizAnswer(userId, quizDate, answer) {
  if (!isSupabaseConfigured || !supabase) {
    saveLocalQuizAnswer(userId, quizDate, answer)
    return
  }

  const { error } = await supabase.from('daily_quiz_answers').insert({
    user_id: userId,
    quiz_date: quizDate,
    selected_index: answer.selectedIndex,
    is_correct: answer.correct,
    points_awarded: answer.pointsAwarded,
  })

  if (error) {
    console.error('[dailyQuizService] remote answer insert:', error)
    saveLocalQuizAnswer(userId, quizDate, answer)
  }
}

export function getTodayQuiz(language = 'he') {
  return generateDailyQuiz(getChallengeDateKey(), language)
}

export async function fetchUserQuizAnswerToday(userId) {
  if (!userId) return null
  const quizDate = getChallengeDateKey()
  const remote = await getRemoteQuizAnswer(userId, quizDate)
  if (remote) return remote
  return getLocalQuizAnswers(userId)[quizDate] ?? null
}

export async function submitDailyQuizAnswer(userId, selectedIndex, correctIndex) {
  const quizDate = getChallengeDateKey()
  const existing = await fetchUserQuizAnswerToday(userId)
  if (existing) throw new Error('ALREADY_ANSWERED')

  const correct = selectedIndex === correctIndex
  const pointsAwarded = correct ? POINT_AWARDS.QUIZ_CORRECT : 0

  const answer = {
    selectedIndex,
    correct,
    pointsAwarded,
  }

  await saveRemoteQuizAnswer(userId, quizDate, answer)

  if (pointsAwarded > 0) {
    const stats = await fetchUserGamification(userId)
    await awardGamificationPoints(userId, pointsAwarded, {
      quizzesAnswered: (stats.quizzesAnswered ?? 0) + 1,
      quizCorrectCount: (stats.quizCorrectCount ?? 0) + (correct ? 1 : 0),
    })
  } else {
    const stats = await fetchUserGamification(userId)
    await awardGamificationPoints(userId, 0, {
      quizzesAnswered: (stats.quizzesAnswered ?? 0) + 1,
      quizCorrectCount: stats.quizCorrectCount ?? 0,
    })
  }

  return answer
}
