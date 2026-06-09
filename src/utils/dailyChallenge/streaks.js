import { POINT_AWARDS } from './points'

// ---------------------------------------------------------------------------
// Daily challenge streak (existing — unchanged)
// ---------------------------------------------------------------------------

export const STREAK_MILESTONES = [
  { days: 3, bonus: POINT_AWARDS.STREAK_3 ?? 2 },
  { days: 7, bonus: POINT_AWARDS.STREAK_7 ?? 5 },
  { days: 30, bonus: POINT_AWARDS.STREAK_30 ?? 20 },
]

/**
 * @param {string | null | undefined} lastDate YYYY-MM-DD
 * @param {string} challengeDate YYYY-MM-DD
 */
export function daysBetweenChallengeDates(lastDate, challengeDate) {
  if (!lastDate) return null
  const last = Date.parse(`${lastDate}T00:00:00Z`)
  const current = Date.parse(`${challengeDate}T00:00:00Z`)
  return Math.round((current - last) / 86400000)
}

/**
 * @param {Object} stats
 * @param {string} challengeDate
 */
export function applyStreakOnSubmission(stats, challengeDate) {
  const lastDate = stats.lastChallengeDate ?? null
  let currentStreak = stats.currentStreak ?? 0
  let longestStreak = stats.longestStreak ?? 0

  if (lastDate === challengeDate) {
    return { stats, streakBonus: 0 }
  }

  const gap = daysBetweenChallengeDates(lastDate, challengeDate)
  if (!lastDate || gap === null || gap > 1) {
    currentStreak = 1
  } else if (gap === 1) {
    currentStreak += 1
  }

  longestStreak = Math.max(longestStreak, currentStreak)

  let streakBonus = 0
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak === milestone.days) {
      streakBonus += milestone.bonus
    }
  }

  return {
    stats: {
      ...stats,
      currentStreak,
      longestStreak,
      lastChallengeDate: challengeDate,
    },
    streakBonus,
  }
}

// ---------------------------------------------------------------------------
// Daily quiz streak helpers (new — quiz only, challenge fields untouched)
// ---------------------------------------------------------------------------

/**
 * Update the participation streak after any quiz answer (correct or not).
 * Awards +5 points at every 10-consecutive-day milestone.
 *
 * @param {Object} stats  gamification stats object
 * @param {string} quizDate  YYYY-MM-DD
 * @returns {{ stats: Object, streakBonus: number }}
 */
export function applyQuizParticipationStreak(stats, quizDate) {
  const lastDate = stats.lastQuizDate ?? null
  let quizCurrentStreak = stats.quizCurrentStreak ?? 0
  let quizLongestStreak = stats.quizLongestStreak ?? 0
  let quizStreakBonusCount = stats.quizStreakBonusCount ?? 0

  if (lastDate !== quizDate) {
    const gap = daysBetweenChallengeDates(lastDate, quizDate)
    if (!lastDate || gap === null || gap > 1) {
      quizCurrentStreak = 1
    } else {
      quizCurrentStreak += 1
    }
  }

  quizLongestStreak = Math.max(quizLongestStreak, quizCurrentStreak)

  let streakBonus = 0
  const milestoneReached = Math.floor(quizCurrentStreak / 10)
  if (milestoneReached > quizStreakBonusCount) {
    streakBonus = POINT_AWARDS.QUIZ_PARTICIPATION_STREAK_10
    quizStreakBonusCount = milestoneReached
  }

  return {
    stats: {
      ...stats,
      quizCurrentStreak,
      quizLongestStreak,
      lastQuizDate: quizDate,
      quizStreakBonusCount,
    },
    streakBonus,
  }
}

/**
 * Update the consecutive-correct streak after a quiz answer.
 * Awards +10 points at every 10-correct-in-a-row milestone.
 * Resets to 0 on any wrong answer.
 *
 * @param {Object} stats  gamification stats object
 * @param {boolean} isCorrect
 * @returns {{ stats: Object, streakBonus: number }}
 */
export function applyQuizCorrectStreak(stats, isCorrect) {
  let quizCorrectStreak = stats.quizCorrectStreak ?? 0
  let quizCorrectStreakBonusCount = stats.quizCorrectStreakBonusCount ?? 0

  if (isCorrect) {
    quizCorrectStreak += 1
  } else {
    quizCorrectStreak = 0
  }

  let streakBonus = 0
  if (quizCorrectStreak > 0) {
    const milestoneReached = Math.floor(quizCorrectStreak / 10)
    if (milestoneReached > quizCorrectStreakBonusCount) {
      streakBonus = POINT_AWARDS.QUIZ_CORRECT_STREAK_10
      quizCorrectStreakBonusCount = milestoneReached
    }
  }

  return {
    stats: {
      ...stats,
      quizCorrectStreak,
      quizCorrectStreakBonusCount,
    },
    streakBonus,
  }
}
