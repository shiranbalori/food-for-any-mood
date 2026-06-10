import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { fetchCommunityRecipes, toggleRecipeLike } from '../services/communityRecipeService'
import {
  enrichCommunityRecipeSaveCount,
  isCommunityRecipeSaved,
  removeSavedCommunityRecipe,
  saveCommunityRecipe,
} from '../utils/storage'
import { addFavoriteCommunityRecipe, removeFavoriteRecipe } from '../utils/favoritesStorage'
import { getWeeklyTopCommunityRecipes } from '../utils/communityRecipeRanking'
import { getTheme } from '../utils/themes'
import AuthModal from './AuthModal'
import './CommunityTop5.css'

if (import.meta.env.DEV) {
  console.info('[CommunityTop5] strip-v4 module loaded')
}

function stopActionBubble(event) {
  event.stopPropagation()
  event.preventDefault()
}

/**
 * @param {{
 *   recipes?: object[],
 *   onRecipeClick?: (recipeId: string) => void,
 *   onSavedChanged?: () => void,
 *   onFavoritesChanged?: () => void,
 * }} props
 */
export default function CommunityTop5({
  recipes: recipesProp,
  onRecipeClick,
  onSavedChanged,
  onFavoritesChanged,
}) {
  const { t } = useLanguage()
  const { user, isAuthenticated, isSupabaseReady, authLoading, profileRevision } = useAuth()
  const [fetchedRecipes, setFetchedRecipes] = useState([])
  const [loading, setLoading] = useState(!recipesProp)
  const [authOpen, setAuthOpen] = useState(false)
  const [actionBusyId, setActionBusyId] = useState(null)
  const [localLiked, setLocalLiked] = useState({})
  const [localSaved, setLocalSaved] = useState({})

  useEffect(() => {
    if (recipesProp) {
      setLoading(false)
      return undefined
    }

    if (authLoading) return undefined

    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const items = await fetchCommunityRecipes(user?.id)
        if (!cancelled) {
          setFetchedRecipes(items.map(enrichCommunityRecipeSaveCount))
        }
      } catch (error) {
        console.error('[CommunityTop5] load failed:', error)
        if (!cancelled) setFetchedRecipes([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [authLoading, recipesProp, user?.id, profileRevision])

  const sourceRecipes = recipesProp ?? fetchedRecipes

  const recipes = useMemo(
    () => getWeeklyTopCommunityRecipes(sourceRecipes, 5),
    [sourceRecipes],
  )

  useEffect(() => {
    const liked = {}
    const saved = {}
    for (const recipe of recipes) {
      liked[recipe.id] = Boolean(recipe.userLiked)
      saved[recipe.id] = isCommunityRecipeSaved(recipe.id)
    }
    setLocalLiked(liked)
    setLocalSaved(saved)
  }, [recipes])

  const requireAuth = () => {
    if (!isAuthenticated) {
      setAuthOpen(true)
      return false
    }
    return true
  }

  const isRecipeLiked = (recipe) => Boolean(localLiked[recipe.id])
  const isRecipeSaved = (recipe) => Boolean(localSaved[recipe.id])

  const handleRecipeActivate = (recipeId) => {
    onRecipeClick?.(recipeId)
  }

  const handleLike = async (recipe) => {
    if (!requireAuth() || !isSupabaseReady || recipe.id.startsWith('mock-')) return
    if (actionBusyId === recipe.id) return

    setActionBusyId(recipe.id)
    const currentlyLiked = isRecipeLiked(recipe)
    setLocalLiked((prev) => ({ ...prev, [recipe.id]: !currentlyLiked }))
    try {
      const liked = await toggleRecipeLike(user.id, recipe.id, currentlyLiked)
      setLocalLiked((prev) => ({ ...prev, [recipe.id]: liked }))
      if (liked) {
        addFavoriteCommunityRecipe(recipe)
      } else {
        removeFavoriteRecipe(recipe.id)
      }
      onFavoritesChanged?.()
    } catch (error) {
      console.error('[CommunityTop5] like failed:', error)
      setLocalLiked((prev) => ({ ...prev, [recipe.id]: currentlyLiked }))
    } finally {
      setActionBusyId(null)
    }
  }

  const handleSave = (recipe) => {
    if (!requireAuth() || recipe.id.startsWith('mock-')) return
    if (actionBusyId === recipe.id) return

    setActionBusyId(recipe.id)
    const currentlySaved = isRecipeSaved(recipe)
    setLocalSaved((prev) => ({ ...prev, [recipe.id]: !currentlySaved }))
    try {
      if (currentlySaved) {
        removeSavedCommunityRecipe(recipe.id)
      } else {
        saveCommunityRecipe(recipe)
      }
      onSavedChanged?.()
    } catch (error) {
      console.error('[CommunityTop5] save failed:', error)
      setLocalSaved((prev) => ({ ...prev, [recipe.id]: currentlySaved }))
    } finally {
      setActionBusyId(null)
    }
  }

  if (loading) {
    return (
      <section
        className="community-top5"
        data-top5-layout="strip-v4"
        aria-labelledby="community-top5-title"
      >
        <h2 id="community-top5-title" className="community-top5__heading community-section-bar">
          {t('communityWeeklyTop5Title')}
        </h2>
      </section>
    )
  }

  return (
    <section
      className="community-top5"
      data-top5-layout="strip-v4"
      aria-labelledby="community-top5-title"
    >
      <h2 id="community-top5-title" className="community-top5__heading community-section-bar">
        {t('communityWeeklyTop5Title')}
      </h2>

      {recipes.length === 0 ? (
        <p className="community-top5__empty">{t('communityWeeklyTop5Empty')}</p>
      ) : (
        <div className="community-top5__strip" role="list">
          {recipes.map((recipe) => {
            const theme = getTheme(recipe.category ?? 'parve')
            const liked = isRecipeLiked(recipe)
            const saved = isRecipeSaved(recipe)

            return (
              <div
                key={recipe.id}
                className="community-top5__tile"
                role="listitem"
                style={{
                  '--theme-accent-light': theme.accentLight,
                }}
              >
                <span className="community-top5__author">{recipe.authorName || t('defaultDisplayName')}</span>
                <div className="community-top5__body">
                  <div
                    className="community-top5__actions"
                    onPointerDown={stopActionBubble}
                    onMouseDown={stopActionBubble}
                    onTouchStart={stopActionBubble}
                    onClick={stopActionBubble}
                  >
                    <button
                      type="button"
                      className={`community-top5__action community-top5__action--like${
                        liked ? ' community-top5__action--active' : ''
                      }`}
                      aria-label={liked ? t('communityLiked') : t('communityLike')}
                      aria-pressed={liked}
                      disabled={actionBusyId === recipe.id}
                      onPointerDown={stopActionBubble}
                      onMouseDown={stopActionBubble}
                      onTouchStart={stopActionBubble}
                      onClick={(event) => {
                        stopActionBubble(event)
                        void handleLike(recipe)
                      }}
                    >
                      <span aria-hidden="true">{liked ? '❤️' : '♡'}</span>
                    </button>
                    <button
                      type="button"
                      className={`community-top5__action community-top5__action--save${
                        saved ? ' community-top5__action--active' : ''
                      }`}
                      aria-label={saved ? t('communitySaved') : t('communitySave')}
                      aria-pressed={saved}
                      disabled={actionBusyId === recipe.id}
                      onPointerDown={stopActionBubble}
                      onMouseDown={stopActionBubble}
                      onTouchStart={stopActionBubble}
                      onClick={(event) => {
                        stopActionBubble(event)
                        handleSave(recipe)
                      }}
                    >
                      <span aria-hidden="true">📌</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="community-top5__open"
                    aria-label={recipe.title}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleRecipeActivate(recipe.id)
                    }}
                  >
                    <div className="community-top5__thumb">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt=""
                          className="community-top5__image"
                          loading="lazy"
                        />
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
                    <span className="community-top5__name">{recipe.title}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
    </section>
  )
}
