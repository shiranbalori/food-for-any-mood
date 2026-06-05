import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../i18n/useLanguage'
import { CHALLENGE_IMAGE_ACCEPT, submitDailyChallenge } from '../../services/dailyChallengeService'
import './DailyChallenge.css'

export default function ChallengeSubmitModal({
  open,
  onClose,
  userId,
  authorName,
  onSubmitted,
}) {
  const { t } = useLanguage()
  const [dishName, setDishName] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    setDishName('')
    setDescription('')
    setError('')
    setImageFile(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    if (fileInputRef.current) fileInputRef.current.value = ''

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

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await submitDailyChallenge(userId, authorName, {
        dishName,
        description,
        imageFile,
      })
      onSubmitted?.()
      onClose()
    } catch (err) {
      if (err?.message === 'ALREADY_SUBMITTED') {
        setError(t('challengeAlreadySubmitted'))
      } else {
        setError(t('challengeSubmitError'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="challenge-modal" role="presentation">
      <button
        type="button"
        className="challenge-modal__backdrop"
        onClick={onClose}
        aria-label={t('close')}
      />
      <div className="challenge-modal__panel" role="dialog" aria-modal="true">
        <header className="challenge-modal__header">
          <h2>{t('challengeSubmitTitle')}</h2>
          <button type="button" className="challenge-modal__close" onClick={onClose} aria-label={t('close')}>
            ×
          </button>
        </header>
        <form className="challenge-modal__form" onSubmit={handleSubmit}>
          <label className="challenge-modal__field">
            <span>{t('challengeDishName')}</span>
            <input
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              required
            />
          </label>
          <label className="challenge-modal__field">
            <span>{t('challengeDishDescription')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </label>
          <div className="challenge-modal__field">
            <span>{t('challengePhoto')}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={CHALLENGE_IMAGE_ACCEPT}
              onChange={handleImageChange}
              className="challenge-modal__file-input"
            />
            {previewUrl ? (
              <img src={previewUrl} alt="" className="challenge-modal__preview" />
            ) : (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('communityRecipeImageChoose')}
              </button>
            )}
          </div>
          {error && <p className="challenge-modal__error">{error}</p>}
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? t('challengeSubmitLoading') : t('challengeSubmitButton')}
          </button>
        </form>
      </div>
    </div>
  )
}
