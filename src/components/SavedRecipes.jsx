import { useState, useEffect } from 'react'
import { getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import SpiceLevel from './SpiceLevel'
import './SavedRecipes.css'

export default function SavedRecipes({
  recipes,
  onRemove,
  onSelect,
  initialExpandedId = null,
  onExpandedChange,
}) {
  const { t } = useLanguage()
  const [expandedId, setExpandedId] = useState(initialExpandedId)

  useEffect(() => {
    setExpandedId(initialExpandedId)
  }, [initialExpandedId])

  const toggleExpand = (id) => {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    onExpandedChange?.(next)
  }

  if (recipes.length === 0) {
    return (
      <section className="saved-recipes saved-recipes--empty">
        <h2 className="section-title">{t('savedRecipes')}</h2>
        <div className="saved-recipes__empty">
          <span>📌</span>
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
          const isCommunity = recipe.isCommunity === true
          const displayName = recipe.name ?? recipe.title ?? ''
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
              </div>
              <h3>{displayName}</h3>
              {isCommunity && recipe.authorName && (
                <p className="saved-card__community-author">{t('communityAuthor', { name: recipe.authorName })}</p>
              )}
              {(isCommunity ? recipe.isGlutenFree : recipe.glutenFree) && (
                <span className="saved-card__gf-badge">{t('glutenFreeBadge')}</span>
              )}
              {!isCommunity && recipe.style && (
                <span className="saved-card__style">{t(`styles.${recipe.style}`)}</span>
              )}
              <p className="saved-card__desc">{recipe.description}</p>
              {!isCommunity && recipe.tags?.length > 0 && (
                <div className="saved-card__tags">
                  {recipe.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{t(`tags.${tag}`)}</span>
                  ))}
                </div>
              )}
              {!isCommunity && (
                <div className="saved-card__stats">
                  <span>{t('matchShort', { percent: recipe.matchPercent ?? 0 })}</span>
                  <span>{recipe.calories ?? '—'} kcal</span>
                  <SpiceLevel level={recipe.spiceLevel ?? 0} max={3} />
                </div>
              )}
              {isCommunity ? (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => toggleExpand(recipe.id)}
                  >
                    {expandedId === recipe.id ? t('communityHideDetails') : t('communityViewDetails')}
                  </button>
                  {expandedId === recipe.id && (
                    <div className="saved-card__community-details">
                      {recipe.ingredients?.length > 0 && (
                        <>
                          <h4 className="saved-card__community-section">{t('ingredients')}</h4>
                          <ul className="saved-card__community-list">
                            {recipe.ingredients.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {recipe.steps?.length > 0 && (
                        <>
                          <h4 className="saved-card__community-section">{t('cookingSteps')}</h4>
                          <ol className="saved-card__community-list">
                            {recipe.steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn--ghost saved-card__remove-btn"
                    onClick={() => onRemove(recipe.id)}
                  >
                    {t('removeFromSaved')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => onSelect(recipe)}
                  >
                    {t('viewRecipe')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost saved-card__remove-btn"
                    onClick={() => onRemove(recipe.id)}
                  >
                    {t('removeFromSaved')}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
