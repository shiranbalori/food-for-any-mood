import { useEffect, useState } from 'react'
import { getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import { sanitizeIngredientList } from '../utils/ingredientFormatting'
import {
  deleteCommunityRecipe,
  incrementRecipeShare,
  incrementRecipeViews,
  rateCommunityRecipe,
  toggleRecipeLike,
} from '../services/communityRecipeService'
import { removeSavedCommunityRecipe, saveCommunityRecipe } from '../utils/storage'
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
  const [localSavesCount, setLocalSavesCount] = useState(recipe.savesCount ?? recipe.likeCount ?? 0)
  const [localLiked, setLocalLiked] = useState(recipe.userLiked)
  const [localRating, setLocalRating] = useState(recipe.averageRating ?? recipe.rating ?? 0)
  const [localRatingCount, setLocalRatingCount] = useState(recipe.totalRatings ?? recipe.ratingCount ?? 0)
  const [localUserRating, setLocalUserRating] = useState(recipe.userRating)
  const hasRated = localUserRating != null

  useEffect(() => {
    setLocalSavesCount(recipe.savesCount ?? recipe.likeCount ?? 0)
    setLocalLiked(recipe.userLiked)
    setLocalRating(recipe.averageRating ?? recipe.rating ?? 0)
    setLocalRatingCount(recipe.totalRatings ?? recipe.ratingCount ?? 0)
    setLocalUserRating(recipe.userRating)
  }, [recipe])

  const theme = getTheme(recipe.category ?? 'parve')
  const categoryId = recipe.category ?? 'parve'
  const displayIngredients = sanitizeIngredientList(recipe.ingredients ?? [])

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

  const handleSave = async () => {
    if (!requireAuth() || !isSupabaseReady || recipe.id.startsWith('mock-')) return

    setBusy(true)
    try {
      const liked = await toggleRecipeLike(userId, recipe.id, localLiked)
      setLocalLiked(liked)
      setLocalSavesCount((count) => Math.max(0, count + (liked ? 1 : -1)))
      // Mirror like state into localStorage so Saved Recipes page shows this recipe
      if (liked) {
        saveCommunityRecipe(recipe)
      } else {
        removeSavedCommunityRecipe(recipe.id)
      }
      onUpdated?.()
    } catch (error) {
      console.error('[CommunityRecipeCard] save failed:', error)
    } finally {
      setBusy(false)
    }
  }

  const isOwner = isAuthenticated && userId && recipe.authorId === userId

  const handleDelete = async () => {
    if (!isOwner || !isSupabaseReady) return
    if (!window.confirm(t('communityDeleteConfirm'))) return

    setBusy(true)
    try {
      await deleteCommunityRecipe(userId, recipe.id)
      removeSavedCommunityRecipe(recipe.id)
      onUpdated?.()
    } catch (error) {
      console.error('[CommunityRecipeCard] delete failed:', error)
    } finally {
      setBusy(false)
    }
  }

  const handleRate = async (stars) => {
    if (hasRated || !requireAuth() || !isSupabaseReady || recipe.id.startsWith('mock-')) return

    setBusy(true)
    try {
      await rateCommunityRecipe(userId, recipe.id, stars)
      setLocalUserRating(stars)
      setLocalRatingCount((count) => count + 1)
      onUpdated?.()
    } catch (error) {
      if (error?.message === 'ALREADY_RATED') return
      console.error('[CommunityRecipeCard] rate failed:', error)
    } finally {
      setBusy(false)
    }
  }

  const handleShare = async () => {
    if (recipe.id.startsWith('mock-')) return

    const shareUrl = window.location.href
    const shareData = {
      title: recipe.title,
      text: recipe.title,
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      }
    } catch (error) {
      if (error?.name === 'AbortError') return
      console.error('[CommunityRecipeCard] share failed:', error)
    }

    if (isSupabaseReady) {
      await incrementRecipeShare(userId ?? null, recipe.id)
      onUpdated?.()
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
      <div className="community-card__media">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            className="community-card__image"
            loading="lazy"
          />
        ) : (
          <div
            className="community-card__placeholder"
            style={{ background: theme.accentLight }}
            aria-hidden="true"
          >
            <span>{theme.emoji}</span>
          </div>
        )}
      </div>

      <div className="community-card__top">
        <div className="community-card__badges">
          <span className="community-card__category">
            {theme.emoji} {t(`categories.${categoryId}`)}
          </span>
          <span className="community-card__type">{t(`recipeTypes.${recipe.recipeType ?? 'meal'}`)}</span>
          {recipe.isGlutenFree ? (
            <span className="community-card__gf-badge">{t('glutenFreeBadge')}</span>
          ) : null}
        </div>
        <div className="community-card__rating" aria-label={t('communityRateLabel')}>
          <span className="community-card__rating-value">
            ⭐ {localRating > 0 ? localRating.toFixed(1) : '—'}
          </span>
          {localRatingCount > 0 ? (
            <span className="community-card__rating-count">
              {t('communityRatingsCount', { count: localRatingCount })}
            </span>
          ) : null}
        </div>
      </div>

      <h3 className="community-card__title">{recipe.title}</h3>

      <p className="community-card__author">{t('communityAuthor', { name: recipe.authorName })}</p>

      <div className="community-card__meta">
        <span>{t('communityViews', { count: formatViews(recipe.viewsCount ?? recipe.views ?? 0, language) })}</span>
        <span className="community-card__saves">❤️ {localSavesCount}</span>
      </div>

      <div className="community-card__actions">
        <button
          type="button"
          className={`community-card__like ${localLiked ? 'community-card__like--active' : ''}`}
          onClick={handleSave}
          disabled={busy}
        >
          {localLiked ? '❤️' : '🤍'} {t('communitySave')}
        </button>
        <button
          type="button"
          className="btn btn--ghost community-card__share"
          onClick={handleShare}
          disabled={busy}
        >
          {t('communityShare')}
        </button>
        <button type="button" className="btn btn--ghost community-card__expand" onClick={handleExpand}>
          {expanded ? t('communityHideDetails') : t('communityViewDetails')}
        </button>
        {isOwner && (
          <button
            type="button"
            className="btn btn--ghost community-card__delete"
            onClick={handleDelete}
            disabled={busy}
            aria-label={t('communityDeleteButton')}
          >
            🗑️ {t('communityDeleteButton')}
          </button>
        )}
      </div>

      <div className="community-card__stars">
        <span className="community-card__stars-label">{t('communityRateLabel')}</span>
        <div className="community-card__stars-row" role="group" aria-label={t('communityRateLabel')}>
          {[1, 2, 3, 4, 5].map((stars) => (
            <button
              key={stars}
              type="button"
              className={`community-card__star ${
                (localUserRating ?? 0) >= stars ? 'community-card__star--active' : ''
              }`}
              onClick={() => handleRate(stars)}
              disabled={busy || hasRated}
              aria-label={t('communityRateStars', { count: stars })}
            >
              ★
            </button>
          ))}
        </div>
        {hasRated ? (
          <p className="community-card__rated-note">{t('communityRatedOnce')}</p>
        ) : null}
      </div>

      {expanded && (
        <div className="community-card__details">
          {recipe.isGlutenFree ? (
            <span className="community-card__gf-badge community-card__gf-badge--details">
              {t('glutenFreeBadge')}
            </span>
          ) : null}
          {recipe.description && <p>{recipe.description}</p>}
          {displayIngredients.length > 0 && (
            <>
              <h4>{t('ingredients')}</h4>
              <ul>
                {displayIngredients.map((item) => (
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
