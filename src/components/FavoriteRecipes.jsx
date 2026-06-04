import { getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import './FavoriteRecipes.css'

function formatSavedDate(iso, language) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export default function FavoriteRecipes({ recipes, onRemove, onSelect }) {
  const { t, language } = useLanguage()

  if (recipes.length === 0) {
    return (
      <section className="favorite-recipes favorite-recipes--empty">
        <h2 className="section-title">{t('favoriteRecipesTitle')}</h2>
        <div className="favorite-recipes__empty">
          <span aria-hidden="true">❤️</span>
          <p>{t('favoritesEmpty')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="favorite-recipes">
      <h2 className="section-title">
        {t('favoriteRecipesCount', { count: recipes.length })}
      </h2>
      <div className="favorite-recipes__grid">
        {recipes.map((recipe) => {
          const theme = getTheme(recipe.category ?? 'parve')
          const categoryId = recipe.category ?? 'parve'
          return (
            <article
              key={recipe.id}
              className="favorite-card"
              style={{
                '--theme-accent': theme.accent,
                '--theme-accent-light': theme.accentLight,
              }}
            >
              <div className="favorite-card__top">
                <span className="favorite-card__category">
                  {theme.emoji} {t(`categories.${categoryId}`)}
                </span>
                <time className="favorite-card__date" dateTime={recipe.savedAt}>
                  {formatSavedDate(recipe.savedAt, language)}
                </time>
              </div>
              <h3 className="favorite-card__title">{recipe.name}</h3>
              <div className="favorite-card__meta">
                <span>
                  {recipe.cookTime != null || recipe.time != null
                    ? t('cookTime', { count: recipe.cookTime ?? recipe.time })
                    : '—'}
                </span>
                <span>{recipe.calories ?? '—'} kcal</span>
              </div>
              <div className="favorite-card__actions">
                <button
                  type="button"
                  className="btn btn--ghost favorite-card__view"
                  onClick={() => onSelect(recipe)}
                >
                  {t('viewRecipe')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost favorite-card__remove"
                  onClick={() => onRemove(recipe.id)}
                >
                  {t('removeFromFavorites')}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
