import { MOODS } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import IngredientImageUpload from './IngredientImageUpload'
import './RecipeForm.css'

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

      <div className="recipe-form__field">
        <label htmlFor="ingredients">{t('ingredientsLabel')}</label>
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

      <div className="recipe-form__row">
        <div className="recipe-form__field">
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
