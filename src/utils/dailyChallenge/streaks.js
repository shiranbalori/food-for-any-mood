import { POINT_AWARDS } from './points'

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
