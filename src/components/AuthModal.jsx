import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth, ProfileUpdateError } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { ProfileServiceError } from '../services/profileService'
import { getDisplayNameValidationMessage, validateDisplayName } from '../utils/displayName'
import './AuthModal.css'

export default function AuthModal({ open, onClose, initialMode = 'login' }) {
  const { t } = useLanguage()
  const { signIn, signUp, isSupabaseReady } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setError('')
      setSuccessMessage('')
    }
  }, [open, initialMode])

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      if (!isSupabaseReady) {
        setError(t('authSupabaseMissing'))
        return
      }

      if (mode === 'signup') {
        const validation = validateDisplayName(displayName)
        if (!validation.ok) {
          setError(getDisplayNameValidationMessage(validation.code, t))
          return
        }
        await signUp({ email, password, displayName: validation.value })
        setSuccessMessage(t('authSignupSuccess'))
      } else {
        await signIn({ email, password })
        onClose()
      }
    } catch (err) {
      console.error('[AuthModal] submit failed:', err)
      if (err instanceof ProfileUpdateError) {
        setError(getDisplayNameValidationMessage(err.code, t))
      } else if (err instanceof ProfileServiceError) {
        setError(err.message)
      } else {
        setError(err?.message ?? t('authErrorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <button type="button" className="auth-modal__backdrop" onClick={onClose} aria-label={t('close')} />
      <div className="auth-modal__panel">
        <div className="auth-modal__header">
          <h2 id="auth-modal-title">{mode === 'signup' ? t('authSignupTitle') : t('authLoginTitle')}</h2>
          <button type="button" className="auth-modal__close" onClick={onClose} aria-label={t('close')}>
            ×
          </button>
        </div>

        <form className="auth-modal__form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className="auth-modal__field">
              <span>{t('authDisplayName')}</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                minLength={3}
                maxLength={30}
                required
              />
            </label>
          )}

          <label className="auth-modal__field">
            <span>{t('authEmail')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-modal__field">
            <span>{t('authPassword')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </label>

          {error && <p className="auth-modal__error">{error}</p>}
          {successMessage && <p className="auth-modal__success">{successMessage}</p>}

          <button type="submit" className="btn btn--primary auth-modal__submit" disabled={loading}>
            {loading
              ? t('authLoading')
              : mode === 'signup'
                ? t('authSignupButton')
                : t('authLoginButton')}
          </button>
        </form>

        <p className="auth-modal__switch">
          {mode === 'signup' ? t('authHaveAccount') : t('authNoAccount')}{' '}
          <button
            type="button"
            className="auth-modal__switch-btn"
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup')
              setError('')
              setSuccessMessage('')
            }}
          >
            {mode === 'signup' ? t('authLoginLink') : t('authSignupLink')}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  )
}
