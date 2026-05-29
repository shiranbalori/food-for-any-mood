import { getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import SpiceLevel from './SpiceLevel'
import './SavedRecipes.css'

export default function SavedRecipes({ recipes, onRemove, onSelect }) {
  const { t } = useLanguage()

  if (recipes.length === 0) {
    return (
      <section className="saved-recipes saved-recipes--empty">
        <h2 className="section-title">{t('savedRecipes')}</h2>
        <div className="saved-recipes__empty">
          <span>📖</span>
          <p>{t('savedEmpty')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="saved-recipes">
      <h2 className="section-title">
        {t('savedRecipesCount', { count: recipes.length })}
      </h2>
      <div className="saved-recipes__grid">
        {recipes.map((recipe) => {
          const theme = getTheme(recipe.category ?? 'parve')
          const categoryId = recipe.category ?? 'parve'
          return (
            <div
              key={recipe.id}
              className="saved-card"
              style={{
                '--theme-accent': theme.accent,
                '--theme-accent-light': theme.accentLight,
              }}
            >
              <div className="saved-card__header">
                <span className="saved-card__category">
                  {theme.emoji} {t(`categories.${categoryId}`)}
                </span>
                <button
                  type="button"
                  className="saved-card__remove"
                  onClick={() => onRemove(recipe.id)}
                  aria-label={t('removeRecipe')}
                >
                  ×
                </button>
              </div>
              <h3>{recipe.name}</h3>
              {recipe.glutenFree && (
                <span className="saved-card__gf-badge">{t('glutenFreeBadge')}</span>
              )}
              {recipe.style && (
                <span className="saved-card__style">{t(`styles.${recipe.style}`)}</span>
              )}
              <p className="saved-card__desc">{recipe.description}</p>
              {recipe.tags?.length > 0 && (
                <div className="saved-card__tags">
                  {recipe.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{t(`tags.${tag}`)}</span>
                  ))}
                </div>
              )}
              <div className="saved-card__stats">
                <span>{t('matchShort', { percent: recipe.matchPercent ?? 0 })}</span>
                <span>{recipe.calories ?? '—'} kcal</span>
                <SpiceLevel level={recipe.spiceLevel ?? 0} max={3} />
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onSelect(recipe)}
              >
                {t('viewRecipe')}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
