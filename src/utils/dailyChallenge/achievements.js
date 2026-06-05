export const ACHIEVEMENT_DEFS = [
  {
    id: 'first_challenge',
    icon: '🥇',
    labelKey: 'achievementFirstChallenge',
    progressKey: 'achievementProgressChallenges',
    target: 1,
    getProgress: (stats) => stats.challengesCompleted ?? 0,
    check: (stats) => stats.challengesCompleted >= 1,
  },
  {
    id: 'ten_photos',
    icon: '📸',
    labelKey: 'achievementTenPhotos',
    progressKey: 'achievementProgressPhotos',
    target: 10,
    getProgress: (stats) => stats.photosUploaded ?? 0,
    check: (stats) => stats.photosUploaded >= 10,
  },
  {
    id: 'fifty_likes',
    icon: '❤️',
    labelKey: 'achievementFiftyLikes',
    progressKey: 'achievementProgressLikes',
    target: 50,
    getProgress: (stats) => stats.likesReceived ?? 0,
    check: (stats) => stats.likesReceived >= 50,
  },
  {
    id: 'seven_day_streak',
    icon: '🔥',
    labelKey: 'achievementSevenDayStreak',
    progressKey: 'achievementProgressStreak',
    target: 7,
    getProgress: (stats) => Math.max(stats.currentStreak ?? 0, stats.longestStreak ?? 0),
    check: (stats) => (stats.longestStreak ?? 0) >= 7,
  },
  {
    id: 'hundred_points',
    icon: '🏆',
    labelKey: 'achievementHundredPoints',
    progressKey: 'achievementProgressPoints',
    target: 100,
    getProgress: (stats) => stats.totalPoints ?? 0,
    check: (stats) => stats.totalPoints >= 100,
  },
  {
    id: 'three_hundred_points',
    icon: '👑',
    labelKey: 'achievementThreeHundredPoints',
    progressKey: 'achievementProgressPoints',
    target: 300,
    getProgress: (stats) => stats.totalPoints ?? 0,
    check: (stats) => stats.totalPoints >= 300,
  },
  {
    id: 'fifty_challenges',
    icon: '🎯',
    labelKey: 'achievementFiftyChallenges',
    progressKey: 'achievementProgressChallenges',
    target: 50,
    getProgress: (stats) => stats.challengesCompleted ?? 0,
    check: (stats) => stats.challengesCompleted >= 50,
  },
]

/**
 * @param {Object} stats
 */
export function statsForAchievements(stats) {
  return {
    totalPoints: stats?.totalPoints ?? 0,
    challengesCompleted: stats?.challengesCompleted ?? 0,
    photosUploaded: stats?.photosUploaded ?? 0,
    likesReceived: stats?.likesReceived ?? 0,
    currentStreak: stats?.currentStreak ?? 0,
    longestStreak: stats?.longestStreak ?? 0,
  }
}

/**
 * @param {Object} stats
 * @param {string[]} unlockedIds
 */
export function getUnlockedAchievements(stats, unlockedIds = []) {
  const normalized = statsForAchievements(stats)
  const unlocked = new Set(unlockedIds)
  return ACHIEVEMENT_DEFS.filter(
    (achievement) => achievement.check(normalized) || unlocked.has(achievement.id),
  ).map((achievement) => achievement.id)
}

/**
 * @param {Object | null} stats
 * @param {string[]} [unlockedIds]
 */
export function getAchievementList(stats = null, unlockedIds = []) {
  const normalized = statsForAchievements(stats ?? {})
  const unlocked = new Set(unlockedIds.length ? unlockedIds : stats?.unlockedAchievements ?? [])

  return ACHIEVEMENT_DEFS.map((achievement) => {
    const current = achievement.getProgress(normalized)
    const isUnlocked = achievement.check(normalized) || unlocked.has(achievement.id)
    return {
      ...achievement,
      current: Math.min(current, achievement.target),
      unlocked: isUnlocked,
    }
  })
}

/**
 * @param {Object | null} stats
 */
export function countUnlockedAchievements(stats) {
  return getAchievementList(stats).filter((item) => item.unlocked).length
}
