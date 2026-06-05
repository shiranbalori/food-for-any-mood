export const USER_LEVELS = [
  { minPoints: 0, maxPoints: 19, icon: '🥄', labelKey: 'challengeLevelBeginner' },
  { minPoints: 20, maxPoints: 39, icon: '🍳', labelKey: 'challengeLevelHomeCook' },
  { minPoints: 40, maxPoints: 79, icon: '👨‍🍳', labelKey: 'challengeLevelAmateurChef' },
  { minPoints: 80, maxPoints: 149, icon: '🔥', labelKey: 'challengeLevelAdvancedChef' },
  { minPoints: 150, maxPoints: 299, icon: '🏆', labelKey: 'challengeLevelKitchenMaster' },
  { minPoints: 300, maxPoints: Infinity, icon: '👑', labelKey: 'challengeLevelLegend' },
]

/**
 * @param {number} totalPoints
 */
export function getUserLevel(totalPoints) {
  const points = Math.max(0, Number(totalPoints) || 0)
  return (
    USER_LEVELS.find((level) => points >= level.minPoints && points <= level.maxPoints) ??
    USER_LEVELS[0]
  )
}
