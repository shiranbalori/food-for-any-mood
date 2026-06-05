import { useLanguage } from '../../i18n/useLanguage'
import './DailyChallenge.css'

/**
 * @param {{ onClick: () => void }} props
 */
export default function DailyChallengeTrigger({ onClick }) {
  const { t } = useLanguage()

  return (
    <div className="challenge-trigger-wrap">
      <button
        type="button"
        className="challenge-trigger"
        onClick={onClick}
        aria-label={t('challengeDailyTitle')}
      >
        <span className="challenge-trigger__icon" aria-hidden="true">
          🎯
        </span>
        <span className="challenge-trigger__label">{t('challengeTriggerLabel')}</span>
      </button>
    </div>
  )
}
