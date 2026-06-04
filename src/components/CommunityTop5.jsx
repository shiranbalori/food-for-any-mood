import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { fetchCommunityRecipes } from '../services/communityRecipeService'
import { getTopRatedCommunityRecipes } from '../utils/communityRecipeRanking'
import { getTheme } from '../utils/themes'
import './CommunityTop5.css'

export default function CommunityTop5() {
  const { t } = useLanguage()
  const { user, authLoading } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return undefined

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const items = await fetchCommunityRecipes(user?.id)
        if (!cancelled) {
          setRecipes(getTopRatedCommunityRecipes(items, 5))
        }
      } catch (error) {
        console.error('[CommunityTop5] load failed:', error)
        if (!cancelled) setRecipes([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [authLoading, user?.id])

  if (loading || recipes.length === 0) {
    return null
  }

  return (
    <section className="community-top5" aria-labelledby="community-top5-title">
      <h2 id="community-top5-title" className="community-top5__title section-title">
        {t('communityTop5Title')}
      </h2>

      <div className="community-top5__grid">
        {recipes.map((recipe, index) => {
          const theme = getTheme(recipe.category ?? 'parve')
          const averageRating = recipe.averageRating ?? recipe.rating ?? 0
          const totalRatings = recipe.totalRatings ?? recipe.ratingCount ?? 0
          const savesCount = recipe.savesCount ?? recipe.likeCount ?? 0

          return (
            <article
              key={recipe.id}
              className="community-top5__card"
              style={{
                '--theme-accent': theme.accent,
                '--theme-accent-light': theme.accentLight,
              }}
            >
              <span className="community-top5__rank" aria-hidden="true">
                {index + 1}
              </span>
              <div className="community-top5__media">
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt="" className="community-top5__image" loading="lazy" />
                ) : (
                  <div
                    className="community-top5__placeholder"
                    style={{ background: theme.accentLight }}
                    aria-hidden="true"
                  >
                    <span>{theme.emoji}</span>
                  </div>
                )}
              </div>
              <h3 className="community-top5__name">{recipe.title}</h3>
              <div className="community-top5__stats">
                <span>
                  ⭐ {averageRating > 0 ? averageRating.toFixed(1) : '—'}
                  {totalRatings > 0 ? ` ${t('communityRatingsCount', { count: totalRatings })}` : ''}
                </span>
                <span>❤️ {savesCount}</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
