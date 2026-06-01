import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import {
  COMMUNITY_RECIPE_IMAGE_ACCEPT,
  uploadCommunityRecipe,
  validateCommunityRecipeImage,
} from '../services/communityRecipeService'
import './UploadCommunityRecipeModal.css'
import './DietaryPreferences.css'

const RECIPE_TYPES = ['meal', 'dessert']

const INITIAL_FORM = {
  title: '',
  description: '',
  ingredients: '',
  steps: '',
  category: 'dairy',
  recipeType: 'meal',
  isGlutenFree: false,
}

export default function UploadCommunityRecipeModal({ open, onClose, userId, onUploaded }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(INITIAL_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM)
      setError('')
      setImageFile(null)
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ''
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])

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

  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    },
    [imagePreviewUrl],
  )

  if (!open) return null

  const categoryTheme = getTheme(form.category)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateCommunityRecipeImage(file)
    if (!validation.ok) {
      setError(
        t(validation.code === 'TOO_LARGE' ? 'communityRecipeImageTooLarge' : 'communityRecipeImageInvalidType'),
      )
      event.target.value = ''
      return
    }

    setError('')
    setImageFile(file)
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await uploadCommunityRecipe(userId, { ...form, imageFile })
      clearImage()
      onUploaded?.()
      onClose()
    } catch (err) {
      const code = err?.message
      if (code === 'INVALID_TYPE' || code === 'INVALID_IMAGE_TYPE') {
        setError(t('communityRecipeImageInvalidType'))
      } else if (code === 'TOO_LARGE') {
        setError(t('communityRecipeImageTooLarge'))
      } else {
        setError(err?.message ?? t('communityUploadError'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-recipe-modal" role="dialog" aria-modal="true" aria-labelledby="upload-recipe-title">
      <button type="button" className="upload-recipe-modal__backdrop" onClick={onClose} aria-label={t('close')} />
      <div className="upload-recipe-modal__panel">
        <div className="upload-recipe-modal__header">
          <h2 id="upload-recipe-title">{t('communityUploadRecipe')}</h2>
          <button type="button" className="upload-recipe-modal__close" onClick={onClose} aria-label={t('close')}>
            ×
          </button>
        </div>

        <form className="upload-recipe-modal__form" onSubmit={handleSubmit}>
          <label className="upload-recipe-modal__field">
            <span>{t('communityRecipeTitle')}</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </label>

          <label className="upload-recipe-modal__field">
            <span>{t('communityRecipeDescription')}</span>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
            />
          </label>

          <div className="upload-recipe-modal__field">
            <span>{t('communityRecipeImage')}</span>
            <p className="upload-recipe-modal__hint">{t('communityRecipeImageHint')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={COMMUNITY_RECIPE_IMAGE_ACCEPT}
              onChange={handleImageChange}
              className="upload-recipe-modal__file-input"
            />
            {imagePreviewUrl ? (
              <div className="upload-recipe-modal__preview">
                <img src={imagePreviewUrl} alt={t('communityRecipeImagePreviewAlt')} />
                <button
                  type="button"
                  className="btn btn--ghost upload-recipe-modal__remove-image"
                  onClick={clearImage}
                >
                  {t('communityRecipeImageRemove')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--ghost upload-recipe-modal__choose-image"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('communityRecipeImageChoose')}
              </button>
            )}
          </div>

          <div className="upload-recipe-modal__field">
            <span>{t('recipeTypeLabel')}</span>
            <div className="upload-recipe-modal__chips">
              {RECIPE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`upload-recipe-modal__chip ${
                    form.recipeType === type ? 'upload-recipe-modal__chip--active' : ''
                  }`}
                  onClick={() => handleChange('recipeType', type)}
                  aria-pressed={form.recipeType === type}
                >
                  {t(`recipeTypes.${type}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="upload-recipe-modal__field">
            <span>{t('chooseCategory')}</span>
            <div className="upload-recipe-modal__chips">
              {Object.values(CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`upload-recipe-modal__chip ${
                    form.category === cat.id ? 'upload-recipe-modal__chip--active' : ''
                  }`}
                  onClick={() => handleChange('category', cat.id)}
                  aria-pressed={form.category === cat.id}
                >
                  {cat.emoji} {t(`categories.${cat.id}`)}
                </button>
              ))}
            </div>
          </div>

          <div
            className="upload-recipe-modal__field"
            style={{
              '--theme-accent': categoryTheme.accent,
              '--theme-accent-light': categoryTheme.accentLight,
              '--theme-glow': categoryTheme.glow,
            }}
          >
            <button
              type="button"
              className={`dietary-toggle upload-recipe-modal__dietary-toggle ${
                form.isGlutenFree ? 'dietary-toggle--active' : ''
              }`}
              onClick={() => handleChange('isGlutenFree', !form.isGlutenFree)}
              aria-pressed={form.isGlutenFree}
            >
              <span className="dietary-toggle__icon">🌾🚫</span>
              <span className="dietary-toggle__text">
                <strong>{t('glutenFreeLabel')}</strong>
                <small>{t('glutenFreeHint')}</small>
              </span>
              <span className={`dietary-toggle__switch ${form.isGlutenFree ? 'dietary-toggle__switch--on' : ''}`}>
                <span className="dietary-toggle__knob" />
              </span>
            </button>
          </div>

          <label className="upload-recipe-modal__field">
            <span>{t('ingredientsLabel')}</span>
            <textarea
              value={form.ingredients}
              onChange={(e) => handleChange('ingredients', e.target.value)}
              placeholder={t('ingredientsPlaceholder')}
              rows={3}
              required
            />
          </label>

          <label className="upload-recipe-modal__field">
            <span>{t('cookingSteps')}</span>
            <textarea
              value={form.steps}
              onChange={(e) => handleChange('steps', e.target.value)}
              rows={4}
              required
            />
          </label>

          {error && <p className="upload-recipe-modal__error">{error}</p>}

          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? t('communityUploadLoading') : t('communityUploadSubmit')}
          </button>
        </form>
      </div>
    </div>
  )
}
