import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../../i18n/useLanguage'
import { translateChallengeCategoryHint } from '../../i18n/challengeLabels'
import { fetchUserGamification, getTodayChallenge } from '../../services/dailyChallengeService'
import ChallengeCountdown from './ChallengeCountdown'
import ChallengeStatus from './ChallengeStatus'
import UserChallengeStats from './UserChallengeStats'
import './DailyChallenge.css'

/**
 * @param {{
 *   userId?: string,
 *   submittedToday?: boolean,
 *   onOpenSubmit?: () => void,
 *   onGenerateRecipe: (ingredients: string[], categoryHint: string) => void,
 *   onOpenChallengePage?: () => void,
 * }} props
 */
export default function DailyChallengePanel({
  userId,
  submittedToday = false,
  onOpenSubmit,
  onGenerateRecipe,
  onOpenChallengePage,
}) {
  const { t } = useLanguage()
  const challenge = useMemo(() => getTodayChallenge(), [])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!userId) {
      setStats(null)
      return undefined
    }
    let cancelled = false
    fetchUserGamification(userId)
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((error) => {
        console.error('[DailyChallengePanel] gamification load failed:', error)
        if (!cancelled) setStats(null)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const categoryLabel = translateChallengeCategoryHint(t, challenge.categoryHint)

  return (
    <div className="challenge-panel">
      {userId ? (
        <div className="challenge-panel__head">
          <UserChallengeStats stats={stats} compact />
        </div>
      ) : null}

      <ChallengeCountdown />

      {userId ? <ChallengeStatus completed={submittedToday} /> : null}

      {categoryLabel ? (
        <p className="challenge-home__category">
          {t('challengeOptionalCategory')}: {categoryLabel}
        </p>
      ) : null}

      <ul className="challenge-home__ingredients">
        {challenge.ingredients.map((ingredient) => (
          <li key={ingredient}>{ingredient}</li>
        ))}
      </ul>

      <p className="challenge-home__rule">{t(challenge.ruleKey)}</p>

      <div className="challenge-panel__actions">
        <button
          type="button"
          className="btn btn--primary challenge-panel__cta"
          onClick={() => onGenerateRecipe(challenge.ingredients, challenge.categoryHint)}
        >
          {t('challengeGenerateRecipe')}
        </button>
        {onOpenSubmit ? (
          <button type="button" className="btn btn--ghost challenge-panel__cta" onClick={onOpenSubmit}>
            {t('challengeParticipated')}
          </button>
        ) : submittedToday ? (
          <span className="challenge-panel__done">{t('challengeAlreadyParticipated')}</span>
        ) : null}
        {onOpenChallengePage ? (
          <button type="button" className="btn btn--ghost challenge-panel__cta" onClick={onOpenChallengePage}>
            {t('challengeOpenPage')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
