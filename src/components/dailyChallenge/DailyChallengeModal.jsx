import { useEffect } from 'react'
import { useLanguage } from '../../i18n/useLanguage'
import DailyChallengePanel from './DailyChallengePanel'
import './DailyChallenge.css'

export default function DailyChallengeModal({
  open,
  onClose,
  userId,
  submittedToday = false,
  onOpenSubmit,
  onGenerateRecipe,
  onOpenChallengePage,
}) {
  const { t } = useLanguage()

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="challenge-overlay" role="presentation">
      <button
        type="button"
        className="challenge-overlay__backdrop"
        onClick={onClose}
        aria-label={t('close')}
      />
      <div
        className="challenge-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-overlay-title"
      >
        <header className="challenge-overlay__header">
          <h2 id="challenge-overlay-title" className="challenge-overlay__header-title">
            {t('challengeDailyTitle')}
          </h2>
          <button
            type="button"
            className="challenge-overlay__close"
            onClick={onClose}
            aria-label={t('close')}
          >
            ×
          </button>
        </header>
        <div className="challenge-overlay__body">
          <DailyChallengePanel
            userId={userId}
            submittedToday={submittedToday}
            onOpenSubmit={onOpenSubmit}
            onGenerateRecipe={onGenerateRecipe}
            onOpenChallengePage={onOpenChallengePage}
          />
        </div>
      </div>
    </div>
  )
}
