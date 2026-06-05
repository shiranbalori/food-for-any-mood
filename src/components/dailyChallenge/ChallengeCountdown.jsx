import { useLanguage } from '../../i18n/useLanguage'
import { useChallengeCountdown } from '../../hooks/useChallengeCountdown'
import './DailyChallenge.css'

export default function ChallengeCountdown() {
  const { t } = useLanguage()
  const { countdown } = useChallengeCountdown()

  return (
    <p className="challenge-countdown" aria-live="polite">
      <span className="challenge-countdown__label">{t('challengeNextIn')}</span>
      <span className="challenge-countdown__time">{countdown}</span>
    </p>
  )
}
