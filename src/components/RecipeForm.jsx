import { MOODS } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import { mergeTranscriptIntoField } from '../utils/speechTranscription'
import IngredientImageUpload from './IngredientImageUpload'
import VoiceInputButton from './VoiceInputButton'
import './RecipeForm.css'

const SERVING_OPTIONS = [1, 2, 4, 6, 8]

export default function RecipeForm({ form, onChange, onSubmit, disabled, theme }) {
  const { t } = useLanguage()

  return (
    <section
      className="recipe-form"
      style={{
        '--theme-accent': theme.accent,
        '--theme-accent-light': theme.accentLight,
        '--theme-gradient': theme.gradient,
      }}
    >
      <h2 className="section-title">{t('formTitle')}</h2>

      <div className="recipe-form__field recipe-form__field--ingredients">
        <div className="voice-field__label-row">
          <label htmlFor="ingredients">{t('ingredientsLabel')}</label>
          <VoiceInputButton
            disabled={disabled}
            onTranscript={(text) =>
              onChange(
                'ingredients',
                mergeTranscriptIntoField(form.ingredients, text, 'ingredients'),
              )
            }
          />
        </div>
        <IngredientImageUpload
          disabled={disabled}
          onIngredientsDetected={(value) => onChange('ingredients', value)}
        />
        <textarea
          id="ingredients"
          placeholder={t('ingredientsPlaceholder')}
          value={form.ingredients}
          onChange={(e) => onChange('ingredients', e.target.value)}
          rows={3}
        />
        <span className="recipe-form__hint">{t('ingredientsHint')}</span>
      </div>

      <div className="recipe-form__field recipe-form__field--time">
          <label htmlFor="time">
            {t('timeLabel')}: <strong>{t('timeMinutes', { count: form.time })}</strong>
          </label>
          <input
            id="time"
            type="range"
            min={5}
            max={120}
            step={5}
            value={form.time}
            onChange={(e) => onChange('time', Number(e.target.value))}
          />
          <div className="recipe-form__range-labels">
            <span>{t('timeMin')}</span>
            <span>{t('timeMax')}</span>
          </div>
      </div>

      <div className="recipe-form__field">
        <label>{t('moodLabel')}</label>
        <div className="mood-grid">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              type="button"
              className={`mood-chip ${form.mood === mood.id ? 'mood-chip--active' : ''}`}
              onClick={() => onChange('mood', mood.id)}
              aria-pressed={form.mood === mood.id}
            >
              <span>{mood.emoji}</span>
              {t(`moods.${mood.id}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="recipe-form__field">
        <label>{t('servingsLabel')}</label>
        <div className="servings-row">
          {SERVING_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              className={`mood-chip ${form.servings === count ? 'mood-chip--active' : ''}`}
              onClick={() => onChange('servings', count)}
              aria-pressed={form.servings === count}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={onSubmit}
        disabled={disabled}
      >
        {t('generateRecipe')}
      </button>
    </section>
  )
}
