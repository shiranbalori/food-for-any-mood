import { useEffect, useState } from 'react'
import { CATEGORIES, getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import { createUserRecipe } from '../services/userRecipeService'
import { mergeTranscriptIntoField } from '../utils/speechTranscription'
import VoiceInputButton from './VoiceInputButton'
import './UploadCommunityRecipeModal.css'

const RECIPE_TYPES = ['meal', 'dessert', 'soup_stew']
const SERVING_OPTIONS = [1, 2, 4, 6, 8]

const INITIAL_FORM = {
  title: '',
  description: '',
  ingredients: '',
  steps: '',
  category: 'dairy',
  recipeType: 'meal',
  cookingTime: 30,
  servings: 4,
}

export default function PrivateRecipeFormModal({ open, onClose, userId, onSaved }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM)
      setError('')
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

  if (!open) return null

  const categoryTheme = getTheme(form.category)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await createUserRecipe(userId, form)
      onSaved?.()
      onClose()
    } catch (err) {
      if (err?.message === 'VALIDATION_FAILED') {
        setError(t('myRecipesValidationError'))
      } else {
        setError(err?.message ?? t('myRecipesSaveError'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-recipe-modal" role="dialog" aria-modal="true" aria-labelledby="private-recipe-title">
      <button type="button" className="upload-recipe-modal__backdrop" onClick={onClose} aria-label={t('close')} />
      <div className="upload-recipe-modal__panel">
        <div className="upload-recipe-modal__header">
          <h2 id="private-recipe-title">{t('myRecipesAddRecipe')}</h2>
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

          <div className="upload-recipe-modal__field">
            <div className="voice-field__label-row">
              <span>{t('communityRecipeDescription')}</span>
              <VoiceInputButton
                disabled={loading}
                onTranscript={(text) =>
                  handleChange(
                    'description',
                    mergeTranscriptIntoField(form.description, text, 'text'),
                  )
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
            <label className="upload-recipe-modal__field">
              <span>
                {t('timeLabel')}: <strong>{t('timeMinutes', { count: form.cookingTime })}</strong>
              </span>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={form.cookingTime}
                onChange={(e) => handleChange('cookingTime', Number(e.target.value))}
              />
            </label>
          </div>

          <div className="upload-recipe-modal__field">
            <span>{t('servingsLabel')}</span>
            <div className="upload-recipe-modal__chips">
              {SERVING_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`upload-recipe-modal__chip ${
                    form.servings === count ? 'upload-recipe-modal__chip--active' : ''
                  }`}
                  onClick={() => handleChange('servings', count)}
                  aria-pressed={form.servings === count}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="upload-recipe-modal__field">
            <div className="voice-field__label-row">
              <span>{t('ingredientsLabel')}</span>
              <VoiceInputButton
                disabled={loading}
                onTranscript={(text) =>
                  handleChange(
                    'ingredients',
                    mergeTranscriptIntoField(form.ingredients, text, 'ingredients'),
                  )
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
            {loading ? t('myRecipesSaveLoading') : t('myRecipesSaveSubmit')}
          </button>
        </form>
      </div>
    </div>
  )
}
