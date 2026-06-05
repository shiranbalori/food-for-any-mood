import { useLanguage } from '../../i18n/useLanguage'
import { getAchievementList } from '../../utils/dailyChallenge/achievements'
import './DailyChallenge.css'

/**
 * @param {{ stats: object | null }} props
 */
export default function AchievementsPanel({ stats }) {
  const { t } = useLanguage()
  const achievements = getAchievementList(stats)

  return (
    <section className="challenge-achievements">
      <h3 className="challenge-section-title">{t('challengeAchievementsTitle')}</h3>
      <ul className="challenge-achievements__list">
        {achievements.map((achievement) => (
          <li
            key={achievement.id}
            className={`challenge-achievements__item ${
              achievement.unlocked ? 'challenge-achievements__item--unlocked' : ''
            }`}
          >
            <span className="challenge-achievements__icon" aria-hidden="true">
              {achievement.icon}
            </span>
            <div className="challenge-achievements__content">
              <span className="challenge-achievements__label">{t(achievement.labelKey)}</span>
              {!achievement.unlocked ? (
                <span className="challenge-achievements__progress">
                  {t(achievement.progressKey, {
                    current: achievement.current,
                    target: achievement.target,
                  })}
                </span>
              ) : (
                <span className="challenge-achievements__done">{t('challengeAchievementUnlocked')}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
