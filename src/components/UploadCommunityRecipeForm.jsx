import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import {
  COMMUNITY_RECIPE_IMAGE_ACCEPT,
  uploadCommunityRecipe,
  validateCommunityRecipeImage,
} from '../services/communityRecipeService'
import { mergeTranscriptIntoField } from '../utils/speechTranscription'
import VoiceInputButton from './VoiceInputButton'
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

/**
 * @param {{ userId: string, onUploaded?: () => void }} props
 */
export default function UploadCommunityRecipeForm({ userId, onUploaded }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(INITIAL_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    },
    [imagePreviewUrl],
  )

  const categoryTheme = getTheme(form.category)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setError('')
    setImageFile(null)
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
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
      resetForm()
      onUploaded?.()
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
    <form className="upload-recipe-modal__form community-upload__form" onSubmit={handleSubmit}>
      <label className="upload-recipe-modal__field">
        <span>{t('communityRecipeTitle')}</span>
        <input
          type="text"
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
        />
      </label>

      <div className="upload-recipe-modal__field">
        <div className="voice-field__label-row">
          <span>{t('communityRecipeDescription')}</span>
          <VoiceInputButton
            disabled={loading}
            onTranscript={(text) =>
              handleChange('description', mergeTranscriptIntoField(form.description, text, 'text'))
            }
          />
        </div>
        <textarea
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={2}
        />
      </div>

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

      <div className="upload-recipe-modal__field">
        <div className="voice-field__label-row">
          <span>{t('ingredientsLabel')}</span>
          <VoiceInputButton
            disabled={loading}
            onTranscript={(text) =>
              handleChange('ingredients', mergeTranscriptIntoField(form.ingredients, text, 'ingredients'))
            }
          />
        </div>
        <textarea
          value={form.ingredients}
          onChange={(e) => handleChange('ingredients', e.target.value)}
          placeholder={t('ingredientsPlaceholder')}
          rows={3}
          required
        />
      </div>

      <div className="upload-recipe-modal__field">
        <div className="voice-field__label-row">
          <span>{t('cookingSteps')}</span>
          <VoiceInputButton
            disabled={loading}
            onTranscript={(text) =>
              handleChange('steps', mergeTranscriptIntoField(form.steps, text, 'steps'))
            }
          />
        </div>
        <textarea
          value={form.steps}
          onChange={(e) => handleChange('steps', e.target.value)}
          rows={4}
          required
        />
      </div>

      {error && <p className="upload-recipe-modal__error">{error}</p>}

      <button type="submit" className="btn btn--primary" disabled={loading}>
        {loading ? t('communityUploadLoading') : t('communityUploadSubmit')}
      </button>
    </form>
  )
}
