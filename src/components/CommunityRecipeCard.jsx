import { useEffect, useState } from 'react'
import { getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import {
  incrementRecipeViews,
  rateCommunityRecipe,
  toggleRecipeLike,
} from '../services/communityRecipeService'
import './CommunityRecipes.css'

function formatViews(count, language) {
  try {
    return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US').format(count)
  } catch {
    return String(count)
  }
}

export default function CommunityRecipeCard({
  recipe,
  isAuthenticated,
  userId,
  isSupabaseReady,
  onAuthRequired,
  onUpdated,
}) {
  const { t, language } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localLikeCount, setLocalLikeCount] = useState(recipe.likeCount)
  const [localLiked, setLocalLiked] = useState(recipe.userLiked)
  const [localRating, setLocalRating] = useState(recipe.rating)
  const [localUserRating, setLocalUserRating] = useState(recipe.userRating)

  useEffect(() => {
    setLocalLikeCount(recipe.likeCount)
    setLocalLiked(recipe.userLiked)
    setLocalRating(recipe.rating)
    setLocalUserRating(recipe.userRating)
  }, [recipe])

  const theme = getTheme(recipe.category ?? 'parve')
  const categoryId = recipe.category ?? 'parve'

  const handleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && isSupabaseReady && !recipe.id.startsWith('mock-')) {
      await incrementRecipeViews(recipe.id)
      onUpdated?.()
    }
  }

  const requireAuth = () => {
    if (!isAuthenticated) {
      onAuthRequired()
      return false
    }
    return true
  }

  const handleLike = async () => {
    if (!requireAuth() || !isSupabaseReady || recipe.id.startsWith('mock-')) return

    setBusy(true)
    try {
      const liked = await toggleRecipeLike(userId, recipe.id, localLiked)
      setLocalLiked(liked)
      setLocalLikeCount((count) => Math.max(0, count + (liked ? 1 : -1)))
      onUpdated?.()
    } catch (error) {
      console.error('[CommunityRecipeCard] like failed:', error)
    } finally {
      setBusy(false)
    }
  }

  const handleRate = async (stars) => {
    if (!requireAuth() || !isSupabaseReady || recipe.id.startsWith('mock-')) return

    setBusy(true)
    try {
      await rateCommunityRecipe(userId, recipe.id, stars)
      setLocalUserRating(stars)
      onUpdated?.()
    } catch (error) {
      console.error('[CommunityRecipeCard] rate failed:', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className="community-card"
      style={{
        '--theme-accent': theme.accent,
        '--theme-accent-light': theme.accentLight,
      }}
    >
      <div className="community-card__top">
        <div className="community-card__badges">
          <span className="community-card__category">
            {theme.emoji} {t(`categories.${categoryId}`)}
          </span>
          <span className="community-card__type">{t(`recipeTypes.${recipe.recipeType ?? 'meal'}`)}</span>
        </div>
        <span className="community-card__rating">
          ⭐ {localRating > 0 ? localRating.toFixed(1) : '—'}
        </span>
      </div>

      <h3 className="community-card__title">{recipe.title}</h3>

      <p className="community-card__author">{t('communityAuthor', { name: recipe.authorName })}</p>

      <div className="community-card__meta">
        <span>{t('communityViews', { count: formatViews(recipe.views, language) })}</span>
        <span>{t('communityLikes', { count: localLikeCount })}</span>
      </div>

      <div className="community-card__actions">
        <button
          type="button"
          className={`community-card__like ${localLiked ? 'community-card__like--active' : ''}`}
          onClick={handleLike}
          disabled={busy}
        >
          {localLiked ? '❤️' : '🤍'} {t('communityLike')}
        </button>
        <button type="button" className="btn btn--ghost community-card__expand" onClick={handleExpand}>
          {expanded ? t('communityHideDetails') : t('communityViewDetails')}
        </button>
      </div>

      <div className="community-card__stars" aria-label={t('communityRateLabel')}>
        {[1, 2, 3, 4, 5].map((stars) => (
          <button
            key={stars}
            type="button"
            className={`community-card__star ${
              (localUserRating ?? 0) >= stars ? 'community-card__star--active' : ''
            }`}
            onClick={() => handleRate(stars)}
            disabled={busy}
            aria-label={t('communityRateStars', { count: stars })}
          >
            ★
          </button>
        ))}
      </div>

      {expanded && (
        <div className="community-card__details">
          {recipe.description && <p>{recipe.description}</p>}
          {recipe.ingredients?.length > 0 && (
            <>
              <h4>{t('ingredients')}</h4>
              <ul>
                {recipe.ingredients.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {recipe.steps?.length > 0 && (
            <>
              <h4>{t('cookingSteps')}</h4>
              <ol>
                {recipe.steps.map((step, index) => (
                  <li key={`${index}-${step.slice(0, 20)}`}>{step}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </article>
  )
}
