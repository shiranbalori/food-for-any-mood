import { CATEGORIES } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import './CategorySelector.css'

export default function CategorySelector({ selected, onSelect }) {
  const { t } = useLanguage()

  return (
    <section className="category-selector">
      <h2 className="section-title">{t('chooseCategory')}</h2>
      <div className="category-selector__grid">
        {Object.values(CATEGORIES).map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`category-card ${selected === cat.id ? 'category-card--active' : ''}`}
            style={{
              '--cat-gradient': cat.gradient,
              '--cat-accent': cat.accent,
              '--cat-shadow': cat.shadow,
            }}
            onClick={() => onSelect(cat.id)}
            aria-pressed={selected === cat.id}
          >
            <span className="category-card__emoji">{cat.emoji}</span>
            <span className="category-card__label">{t(`categories.${cat.id}`)}</span>
            {selected === cat.id && <span className="category-card__check">✓</span>}
          </button>
        ))}
      </div>
    </section>
  )
}
