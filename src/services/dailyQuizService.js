import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getChallengeDateKey } from '../utils/dailyChallenge/generateDailyChallenge'
import { POINT_AWARDS } from '../utils/dailyChallenge/points'
import {
  applyQuizParticipationStreak,
  applyQuizCorrectStreak,
} from '../utils/dailyChallenge/streaks'
import { buildDailyQuizFromId } from '../utils/dailyQuiz/generateDailyQuiz'
import {
  assignLocalDailyQuiz,
  computeNextQuizAssignment,
  getLocalQuizRotation,
  getLocalQuizSchedule,
  setLocalQuizRotation,
  setLocalQuizSchedule,
} from '../utils/dailyQuiz/quizRotation'
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

function normalizeAnswer(raw, quizDate = getChallengeDateKey()) {
  if (!raw) return null
  return {
    quizId: raw.quizId ?? raw.quiz_id ?? null,
    quizDate: raw.quizDate ?? raw.quiz_date ?? quizDate,
    selectedIndex: raw.selectedIndex ?? raw.selected_index,
    correct: Boolean(raw.correct ?? raw.is_correct),
    pointsAwarded: raw.pointsAwarded ?? raw.points_awarded ?? 0,
    answeredAt: raw.answeredAt ?? raw.answered_at ?? raw.created_at ?? null,
    completed: true,
  }
}

function saveLocalQuizAnswer(userId, quizDate, answer) {
  const all = readJson(LS_QUIZ_ANSWERS, {})
  const userAnswers = { ...(all[userId] ?? {}), [quizDate]: answer }
  all[userId] = userAnswers
  writeJson(LS_QUIZ_ANSWERS, all)
}

async function fetchRemoteSchedule(quizDate) {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase
    .from('daily_quiz_schedule')
    .select('quiz_id, cycle_number')
    .eq('quiz_date', quizDate)
    .maybeSingle()

  if (error) {
    console.error('[dailyQuizService] schedule fetch:', error)
    return null
  }

  return data
}

async function fetchRemoteRotation() {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalQuizRotation()
  }

  const { data, error } = await supabase
    .from('daily_quiz_rotation')
    .select('cycle_number, used_quiz_ids')
    .eq('id', 'global')
    .maybeSingle()

  if (error) {
    console.error('[dailyQuizService] rotation fetch:', error)
    return getLocalQuizRotation()
  }

  return {
    cycleNumber: data?.cycle_number ?? 1,
    usedQuizIds: data?.used_quiz_ids ?? [],
  }
}

async function assignRemoteDailyQuiz(quizDate, assignment) {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase.rpc('assign_daily_quiz', {
    p_quiz_date: quizDate,
    p_quiz_id: assignment.quizId,
    p_cycle_number: assignment.cycleNumber,
    p_used_quiz_ids: assignment.usedQuizIds,
  })

  if (error) {
    console.error('[dailyQuizService] assign_daily_quiz:', error)
    return null
  }

  const row = Array.isArray(data) ? data[0] : data
  return row?.quiz_id ?? null
}

function cacheScheduleLocally(quizDate, quizId, cycleNumber) {
  setLocalQuizSchedule(quizDate, { quizId, cycleNumber })
}

async function resolveScheduledQuizId(quizDate) {
  const cached = getLocalQuizSchedule(quizDate)
  const remoteSchedule = await fetchRemoteSchedule(quizDate)

  if (remoteSchedule?.quiz_id) {
    cacheScheduleLocally(quizDate, remoteSchedule.quiz_id, remoteSchedule.cycle_number ?? 1)
    return remoteSchedule.quiz_id
  }

  if (cached?.quizId) {
    return cached.quizId
  }

  const rotation = await fetchRemoteRotation()
  const assignment = computeNextQuizAssignment(
    quizDate,
    rotation.usedQuizIds,
    rotation.cycleNumber,
  )

  const assignedId = await assignRemoteDailyQuiz(quizDate, assignment)

  if (assignedId) {
    cacheScheduleLocally(quizDate, assignedId, assignment.cycleNumber)
    if (assignedId === assignment.quizId) {
      setLocalQuizRotation({
        cycleNumber: assignment.cycleNumber,
        usedQuizIds: assignment.usedQuizIds,
      })
    } else {
      const refreshed = await fetchRemoteSchedule(quizDate)
      if (refreshed?.quiz_id) {
        cacheScheduleLocally(quizDate, refreshed.quiz_id, refreshed.cycle_number ?? 1)
      }
    }
    return assignedId
  }

  return assignLocalDailyQuiz(quizDate)
}

export async function resolveTodayQuiz(language = 'he') {
  const quizDate = getChallengeDateKey()
  const quizId = await resolveScheduledQuizId(quizDate)
  return buildDailyQuizFromId(quizId, quizDate, language)
}

async function getRemoteQuizAnswer(userId, quizDate) {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase
    .from('daily_quiz_answers')
    .select('quiz_id, quiz_date, selected_index, is_correct, points_awarded, created_at')
    .eq('user_id', userId)
    .eq('quiz_date', quizDate)
    .maybeSingle()

  if (error) {
    console.error('[dailyQuizService] remote answer fetch:', error)
    return normalizeAnswer(getLocalQuizAnswers(userId)[quizDate], quizDate)
  }

  if (!data) return null
  return normalizeAnswer(data, quizDate)
}

async function saveRemoteQuizAnswer(userId, quizDate, answer) {
  saveLocalQuizAnswer(userId, quizDate, answer)

  if (!isSupabaseConfigured || !supabase) return

  const { error } = await supabase.from('daily_quiz_answers').insert({
    user_id: userId,
    quiz_date: quizDate,
    quiz_id: answer.quizId,
    selected_index: answer.selectedIndex,
    is_correct: answer.correct,
    points_awarded: answer.pointsAwarded,
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('ALREADY_ANSWERED')
    }
    console.error('[dailyQuizService] remote answer insert:', error)
  }
}

export async function fetchUserQuizAnswerToday(userId) {
  if (!userId) return null
  const quizDate = getChallengeDateKey()

  const localAnswer = normalizeAnswer(getLocalQuizAnswers(userId)[quizDate], quizDate)
  const remoteAnswer = await getRemoteQuizAnswer(userId, quizDate)

  return remoteAnswer ?? localAnswer
}

export async function submitDailyQuizAnswer(userId, selectedIndex, correctIndex, quizId) {
  const quizDate = getChallengeDateKey()

  const localExisting = normalizeAnswer(getLocalQuizAnswers(userId)[quizDate], quizDate)
  if (localExisting) throw new Error('ALREADY_ANSWERED')

  const existing = await fetchUserQuizAnswerToday(userId)
  if (existing) throw new Error('ALREADY_ANSWERED')

  const correct = selectedIndex === correctIndex
  const pointsAwarded = correct ? POINT_AWARDS.QUIZ_CORRECT : 0
  const answeredAt = new Date().toISOString()

  const answer = {
    quizId,
    quizDate,
    selectedIndex,
    correct,
    pointsAwarded,
    answeredAt,
    completed: true,
  }

  await saveRemoteQuizAnswer(userId, quizDate, answer)

  const stats = await fetchUserGamification(userId)

  const { stats: statsAfterParticipation, streakBonus: participationBonus } =
    applyQuizParticipationStreak(stats, quizDate)

  const { stats: statsAfterCorrect, streakBonus: correctBonus } =
    applyQuizCorrectStreak(statsAfterParticipation, correct)

  const totalBonus = participationBonus + correctBonus

  await awardGamificationPoints(userId, pointsAwarded + totalBonus, {
    quizzesAnswered: (statsAfterCorrect.quizzesAnswered ?? 0) + 1,
    quizCorrectCount: (statsAfterCorrect.quizCorrectCount ?? 0) + (correct ? 1 : 0),
    quizCurrentStreak: statsAfterCorrect.quizCurrentStreak,
    quizLongestStreak: statsAfterCorrect.quizLongestStreak,
    lastQuizDate: statsAfterCorrect.lastQuizDate,
    quizStreakBonusCount: statsAfterCorrect.quizStreakBonusCount,
    quizCorrectStreak: statsAfterCorrect.quizCorrectStreak,
    quizCorrectStreakBonusCount: statsAfterCorrect.quizCorrectStreakBonusCount,
  })

  return { ...answer, participationStreakBonus: participationBonus, correctStreakBonus: correctBonus }
}
