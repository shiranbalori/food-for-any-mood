import { useLanguage } from '../i18n/useLanguage'
import './DietaryPreferences.css'

export default function DietaryPreferences({ glutenFree, onChange, theme }) {
  const { t } = useLanguage()

  return (
    <section
      className="dietary-preferences"
      style={{
        '--theme-accent': theme.accent,
        '--theme-accent-light': theme.accentLight,
        '--theme-glow': theme.glow,
      }}
    >
      <h2 className="section-title">{t('dietaryTitle')}</h2>
      <button
        type="button"
        className={`dietary-toggle ${glutenFree ? 'dietary-toggle--active' : ''}`}
        onClick={() => onChange(!glutenFree)}
        aria-pressed={glutenFree}
      >
        <span className="dietary-toggle__icon">🌾🚫</span>
        <span className="dietary-toggle__text">
          <strong>{t('glutenFreeLabel')}</strong>
          <small>{t('glutenFreeHint')}</small>
        </span>
        <span className={`dietary-toggle__switch ${glutenFree ? 'dietary-toggle__switch--on' : ''}`}>
          <span className="dietary-toggle__knob" />
        </span>
      </button>
      {glutenFree && (
        <p className="dietary-preferences__note">{t('glutenFreeNote')}</p>
      )}
    </section>
  )
}
