import { useLanguage } from '../../i18n/useLanguage'
import './DailyQuiz.css'

/**
 * @param {{ onClick: () => void }} props
 */
export default function DailyQuizTrigger({ onClick }) {
  const { t } = useLanguage()

  return (
    <button
      type="button"
      className="home-pill home-pill--quiz"
      onClick={onClick}
      aria-label={t('quizDailyTitle')}
    >
      <span className="home-pill__icon" aria-hidden="true">
        🧠
      </span>
      <span className="home-pill__label">{t('quizTriggerLabel')}</span>
    </button>
  )
}
