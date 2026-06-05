import { useLanguage } from '../../i18n/useLanguage'
import { getUserLevel } from '../../utils/dailyChallenge/levels'
import './DailyChallenge.css'

/**
 * @param {{ stats: { totalPoints?: number } | null, compact?: boolean }} props
 */
export default function GamificationSummary({ stats, compact = false }) {
  const { t } = useLanguage()
  const totalPoints = stats?.totalPoints ?? 0
  const level = getUserLevel(totalPoints)

  return (
    <div className={`challenge-gamification ${compact ? 'challenge-gamification--compact' : ''}`}>
      <p className="challenge-gamification__level">
        <span aria-hidden="true">{level.icon}</span> {t(level.labelKey)}
      </p>
      <p className="challenge-gamification__points">
        {t('challengePointsCount', { count: totalPoints })}
      </p>
    </div>
  )
}
