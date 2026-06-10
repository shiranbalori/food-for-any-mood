import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { ProfileServiceError, ProfileUpdateError } from '../services/profileService'
import {
  getDisplayNameValidationMessage,
  needsDisplayNameSetup,
  normalizeDisplayNameInput,
  resolvePublicDisplayName,
} from '../utils/displayName'

function resolveSaveError(err, t) {
  console.error('[ProfileUsernameForm] save failed:', err)

  if (err instanceof ProfileUpdateError) {
    if (err.code === 'AUTH_MISMATCH') {
      return t('profileUsernameAuthMismatch')
    }
    return getDisplayNameValidationMessage(err.code, t)
  }

  if (err instanceof ProfileServiceError) {
    return err.message
  }

  if (err && typeof err.message === 'string' && err.message.trim()) {
    return err.message
  }

  return t('authErrorGeneric')
}

/**
 * @param {{
 *   onUpdated?: () => void,
 *   showCurrent?: boolean,
 *   showTitle?: boolean,
 *   compact?: boolean,
 *   autoFocus?: boolean,
 * }} props
 */
export default function ProfileUsernameForm({
  onUpdated,
  showCurrent = true,
  showTitle = true,
  compact = false,
  autoFocus = false,
}) {
  const { t, language } = useLanguage()
  const { user, profile, isAuthenticated, isSupabaseReady, updateDisplayName } = useAuth()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(normalizeDisplayNameInput(profile?.display_name))
    setError('')
    setSuccess('')
  }, [profile?.display_name, user?.id])

  if (!isAuthenticated || !isSupabaseReady) return null

  const showPrompt = needsDisplayNameSetup(profile?.display_name)
  const currentLabel = resolvePublicDisplayName(profile?.display_name, language)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await updateDisplayName(value)
      setSuccess(t('profileUsernameSaved'))
      onUpdated?.()
    } catch (err) {
      setError(resolveSaveError(err, t))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`profile-username-form ${compact ? 'profile-username-form--compact' : ''}`.trim()}>
      {showTitle ? (
        <h2 className="profile-username-form__title">{t('profileUsername')}</h2>
      ) : null}
      {showPrompt ? (
        <p className="profile-username-form__prompt">{t('profileUsernamePrompt')}</p>
      ) : showCurrent ? (
        <p className="profile-username-form__current">
          {t('profileUsernameCurrent', { name: currentLabel })}
        </p>
      ) : null}
      <form className="profile-username-form__form" onSubmit={handleSubmit}>
        <label className="profile-username-form__field">
          <span className="visually-hidden">{t('profileUsername')}</span>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
              setSuccess('')
            }}
            maxLength={30}
            autoComplete="nickname"
            autoFocus={autoFocus}
            placeholder={t('profileUsernamePlaceholder')}
          />
        </label>
        {error ? <p className="profile-username-form__error">{error}</p> : null}
        {success ? <p className="profile-username-form__success">{success}</p> : null}
        <button
          type="submit"
          className="btn btn--primary profile-username-form__save"
          disabled={saving}
        >
          {saving ? t('authLoading') : t('profileUsernameSave')}
        </button>
      </form>
    </div>
  )
}
