import { useEffect, useState } from 'react'
import { getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import { fetchCommunityRecipes } from '../services/communityRecipeService'
import './CommunityRecipes.css'

function formatViews(count, language) {
  try {
    return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US').format(count)
  } catch {
    return String(count)
  }
}

export default function CommunityRecipes() {
  const { t, language } = useLanguage()
  const [recipes, setRecipes] = useState([])

  useEffect(() => {
    let active = true

    fetchCommunityRecipes().then((items) => {
      if (active) setRecipes(items)
    })

    return () => {
      active = false
    }
  }, [])

  const handleUploadClick = () => {
    window.alert(t('communityUploadComingSoon'))
  }

  return (
    <section className="community-recipes">
      <div className="community-recipes__header">
        <h2 className="section-title">{t('communityRecipesTitle')}</h2>
        <button
          type="button"
          className="btn btn--ghost community-recipes__upload"
          onClick={handleUploadClick}
        >
          {t('communityUploadRecipe')}
        </button>
      </div>

      <div className="community-recipes__grid">
        {recipes.map((recipe) => {
          const theme = getTheme(recipe.category ?? 'parve')
          const categoryId = recipe.category ?? 'parve'

          return (
            <article
              key={recipe.id}
              className="community-card"
              style={{
                '--theme-accent': theme.accent,
                '--theme-accent-light': theme.accentLight,
              }}
            >
              <div className="community-card__top">
                <span className="community-card__category">
                  {theme.emoji} {t(`categories.${categoryId}`)}
                </span>
                <span className="community-card__rating">
                  ⭐ {recipe.rating.toFixed(1)}
                </span>
              </div>

              <h3 className="community-card__title">{recipe.title}</h3>

              <p className="community-card__author">
                {t('communityAuthor', { name: recipe.authorName })}
              </p>

              <div className="community-card__meta">
                <span>{t('communityViews', { count: formatViews(recipe.views, language) })}</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
