import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import ProfileUsernameForm from './ProfileUsernameForm'
import './ProfileSetupModal.css'

export default function ProfileSetupModal({ onUpdated }) {
  const { t } = useLanguage()
  const { isAuthenticated, isSupabaseReady, loading, needsDisplayNamePrompt } = useAuth()

  const open = isAuthenticated && isSupabaseReady && !loading && needsDisplayNamePrompt

  useEffect(() => {
    if (!open) return undefined

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="profile-setup-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-setup-modal-title"
    >
      <div className="profile-setup-modal__backdrop" aria-hidden="true" />
      <div className="profile-setup-modal__panel">
        <h2 id="profile-setup-modal-title" className="profile-setup-modal__title">
          {t('profileUsernameModalTitle')}
        </h2>
        <p className="profile-setup-modal__hint">{t('profileUsernameModalHint')}</p>
        <ProfileUsernameForm
          onUpdated={onUpdated}
          showTitle={false}
          showCurrent={false}
          compact
          autoFocus
        />
      </div>
    </div>,
    document.body,
  )
}
