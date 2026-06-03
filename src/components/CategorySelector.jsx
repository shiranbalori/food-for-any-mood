import { CATEGORIES } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import './CategorySelector.css'

const RECIPE_TYPES = [
  { id: 'meal', emoji: '🍽️' },
  { id: 'dessert', emoji: '🍰' },
]

/** Display order: פרווה, בשרי, חלבי, ללא העדפה */
const CATEGORY_DISPLAY_ORDER = ['parve', 'meat', 'dairy', 'any']

export default function CategorySelector({ selected, onSelect, recipeType, onRecipeTypeChange }) {
  const { t } = useLanguage()

  return (
    <section className="category-selector">
      <h2 className="section-title">{t('chooseCategory')}</h2>

      <div className="category-selector__type">
        <span className="category-selector__type-label">{t('recipeTypeLabel')}</span>
        <div className="category-selector__type-grid">
          {RECIPE_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`category-selector__type-chip ${
                recipeType === type.id ? 'category-selector__type-chip--active' : ''
              }`}
              onClick={() => onRecipeTypeChange(type.id)}
              aria-pressed={recipeType === type.id}
            >
              <span>{type.emoji}</span>
              {t(`recipeTypes.${type.id}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="category-selector__grid">
        {CATEGORY_DISPLAY_ORDER.map((id) => CATEGORIES[id]).map((cat) => (
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
