import { useLanguage } from '../../i18n/useLanguage'
import './DailyChallenge.css'

/**
 * @param {{ completed: boolean, showPending?: boolean }} props
 */
export default function ChallengeStatus({ completed, showPending = true }) {
  const { t } = useLanguage()

  if (!showPending && !completed) return null

  return (
    <p
      className={`challenge-status ${completed ? 'challenge-status--done' : 'challenge-status--pending'}`}
      role="status"
    >
      {completed ? t('challengeStatusCompleted') : t('challengeStatusPending')}
    </p>
  )
}
