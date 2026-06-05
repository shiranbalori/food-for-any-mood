import { useLanguage } from '../../i18n/useLanguage'
import { countUnlockedAchievements } from '../../utils/dailyChallenge/achievements'
import { getUserLevel } from '../../utils/dailyChallenge/levels'
import './DailyChallenge.css'

/**
 * @param {{ stats: object | null, compact?: boolean }} props
 */
export default function UserChallengeStats({ stats, compact = false }) {
  const { t } = useLanguage()
  if (!stats) return null

  const totalPoints = stats.totalPoints ?? 0
  const level = getUserLevel(totalPoints)
  const achievementsUnlocked = countUnlockedAchievements(stats)

  if (compact) {
    return (
      <div className="challenge-user-stats challenge-user-stats--compact">
        <p className="challenge-user-stats__level">
          <span aria-hidden="true">{level.icon}</span> {t(level.labelKey)}
        </p>
        <p className="challenge-user-stats__points">{t('challengePointsCount', { count: totalPoints })}</p>
        {(stats.currentStreak ?? 0) > 0 ? (
          <p className="challenge-user-stats__streak">
            {t('challengeCurrentStreak', { count: stats.currentStreak })}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <section className="challenge-user-stats" aria-labelledby="challenge-user-stats-title">
      <h3 id="challenge-user-stats-title" className="challenge-section-title">
        {t('challengeUserStatsTitle')}
      </h3>
      <div className="challenge-user-stats__card">
        <p className="challenge-user-stats__level challenge-user-stats__level--large">
          <span aria-hidden="true">{level.icon}</span> {t(level.labelKey)}
        </p>
        <p className="challenge-user-stats__points challenge-user-stats__points--large">
          {t('challengePointsCount', { count: totalPoints })}
        </p>
        {(stats.currentStreak ?? 0) > 0 ? (
          <p className="challenge-user-stats__streak-visual" aria-hidden="true">
            {'🔥'.repeat(Math.min(stats.currentStreak, 10))}
            {(stats.currentStreak ?? 0) > 10 ? ` +${stats.currentStreak - 10}` : ''}
          </p>
        ) : null}
        <ul className="challenge-user-stats__metrics">
          <li>{t('challengeCompletedCount', { count: stats.challengesCompleted ?? 0 })}</li>
          <li>{t('challengeCurrentStreak', { count: stats.currentStreak ?? 0 })}</li>
          <li>{t('challengeLongestStreak', { count: stats.longestStreak ?? 0 })}</li>
          <li>{t('challengeAchievementsUnlocked', { count: achievementsUnlocked })}</li>
        </ul>
      </div>
    </section>
  )
}
