import { useEffect, useState } from 'react'
import { CATEGORIES } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import { uploadCommunityRecipe } from '../services/communityRecipeService'
import './UploadCommunityRecipeModal.css'

const RECIPE_TYPES = ['meal', 'dessert']

const INITIAL_FORM = {
  title: '',
  description: '',
  ingredients: '',
  steps: '',
  category: 'dairy',
  recipeType: 'meal',
}

export default function UploadCommunityRecipeModal({ open, onClose, userId, onUploaded }) {
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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await uploadCommunityRecipe(userId, form)
      onUploaded?.()
      onClose()
    } catch (err) {
      setError(err?.message ?? t('communityUploadError'))
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
