import { useLanguage } from '../i18n/useLanguage'
import './FeatureCards.css'

const FEATURE_KEYS = [
  { id: 'aiRecipes', icon: '🤖' },
  { id: 'nutritionCoach', icon: '🥗' },
  { id: 'shoppingList', icon: '🛒' },
  { id: 'weeklyPlanner', icon: '📅' },
  { id: 'spotifyMood', icon: '🎵' },
  { id: 'imageUpload', icon: '📷' },
]

export default function FeatureCards() {
  const { t } = useLanguage()

  return (
    <section className="feature-cards" aria-labelledby="features-title">
      <h2 id="features-title" className="feature-cards__title">
        {t('featuresTitle')}
      </h2>
      <div className="feature-cards__grid">
        {FEATURE_KEYS.map(({ id, icon }, index) => (
          <article
            key={id}
            className="feature-card"
            style={{ animationDelay: `${0.08 + index * 0.06}s` }}
          >
            <span className="feature-card__icon" aria-hidden="true">
              {icon}
            </span>
            <h3>{t(`features.${id}.title`)}</h3>
            <p>{t(`features.${id}.desc`)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
