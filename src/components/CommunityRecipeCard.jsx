import { useEffect, useRef, useState, useCallback } from 'react'
import { getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import { sanitizeIngredientList } from '../utils/ingredientFormatting'
import {
  addRecipeComment,
  deleteRecipeComment,
  deleteCommunityRecipe,
  fetchRecipeComments,
  fetchUserCommentReports,
  incrementRecipeShare,
  incrementRecipeViews,
  rateCommunityRecipe,
  updateCommunityRecipeRating,
  clearCommunityRecipeRating,
  reportRecipeComment,
  toggleRecipeLike,
  updateRecipeComment,
} from '../services/communityRecipeService'
import { removeSavedCommunityRecipe, saveCommunityRecipe, isCommunityRecipeSaved } from '../utils/storage'
import { addFavoriteCommunityRecipe, removeFavoriteRecipe } from '../utils/favoritesStorage'
import { resolveCommunityAuthorName } from '../utils/displayName'
import './CommunityRecipes.css'

function normalizeUserRating(value) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return null
  return parsed
}

function formatRelativeDate(isoString, language) {
  if (!isoString) return ''
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000
    const rtf = new Intl.RelativeTimeFormat(language === 'he' ? 'he' : 'en', { numeric: 'auto' })
    if (diff < 60)   return rtf.format(-Math.floor(diff), 'second')
    if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute')
    if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour')
    if (diff < 2592000) return rtf.format(-Math.floor(diff / 86400), 'day')
    return new Date(isoString).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')
  } catch {
    return ''
  }
}

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
  currentUserDisplayName,
  initialExpanded = false,
  onOpenRecipeChange,
  onSavedChanged,
  onFavoritesChanged,
}) {
  const { t, language } = useLanguage()
  const [expanded, setExpanded] = useState(initialExpanded)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ratingBusy, setRatingBusy] = useState(false)
  const [localLikeCount, setLocalLikeCount] = useState(recipe.likeCount ?? 0)
  const [localLiked, setLocalLiked] = useState(recipe.userLiked)
  const [localSavesCount, setLocalSavesCount] = useState(recipe.savesCount ?? 0)
  const [localSaved, setLocalSaved] = useState(() => isCommunityRecipeSaved(recipe.id))
  const [localRating, setLocalRating] = useState(recipe.averageRating ?? recipe.rating ?? 0)
  const [localRatingCount, setLocalRatingCount] = useState(recipe.totalRatings ?? recipe.ratingCount ?? 0)
  const [localUserRating, setLocalUserRating] = useState(() => normalizeUserRating(recipe.userRating))
  const localUserRatingRef = useRef(normalizeUserRating(recipe.userRating))

  // Comments state
  const [comments, setComments] = useState([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [localCommentCount, setLocalCommentCount] = useState(recipe.commentCount ?? 0)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [reportedCommentIds, setReportedCommentIds] = useState(() => new Set())
  const commentInputRef = useRef(null)
  const commentsSectionRef = useRef(null)
  const [mobileRecipeDetails, setMobileRecipeDetails] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const syncLayout = () => setMobileRecipeDetails(mq.matches)
    syncLayout()
    mq.addEventListener('change', syncLayout)
    return () => mq.removeEventListener('change', syncLayout)
  }, [])

  const commentPlaceholder = mobileRecipeDetails
    ? language === 'he'
      ? 'כתבו תגובה...'
      : 'Add a comment...'
    : t('communityCommentPlaceholder')

  useEffect(() => {
    localUserRatingRef.current = localUserRating
  }, [localUserRating])

  useEffect(() => {
    if (ratingBusy) return
    setLocalLikeCount(recipe.likeCount ?? 0)
    setLocalLiked(recipe.userLiked)
    setLocalSavesCount(recipe.savesCount ?? 0)
    setLocalSaved(isCommunityRecipeSaved(recipe.id))
    setLocalRating(recipe.averageRating ?? recipe.rating ?? 0)
    setLocalRatingCount(recipe.totalRatings ?? recipe.ratingCount ?? 0)
    setLocalCommentCount(recipe.commentCount ?? 0)
  }, [recipe, ratingBusy])

  useEffect(() => {
    const syncedRating = normalizeUserRating(recipe.userRating)
    setLocalUserRating(syncedRating)
    localUserRatingRef.current = syncedRating
  }, [recipe.id])

  useEffect(() => {
    setExpanded(initialExpanded)
    if (initialExpanded) {
      setCommentsOpen(true)
    }
  }, [initialExpanded, recipe.id])

  const theme = getTheme(recipe.category ?? 'parve')
  const categoryId = recipe.category ?? 'parve'
  const fallbackAuthor = t('defaultDisplayName')
  const authorLabel = resolveCommunityAuthorName(
    recipe,
    userId,
    currentUserDisplayName,
    fallbackAuthor,
  )
  const displayIngredients = sanitizeIngredientList(recipe.ingredients ?? [])

  const canUseLiveComments = isSupabaseReady && !recipe.id.startsWith('mock-')

  const loadComments = useCallback(async () => {
    if (!canUseLiveComments || commentsLoaded) return
    setCommentsLoading(true)
    try {
      const loaded = await fetchRecipeComments(recipe.id)
      setComments(loaded)
      if (loaded.length > 0) {
        setLocalCommentCount(loaded.length)
      }
      if (userId && loaded.length > 0) {
        const reportedIds = await fetchUserCommentReports(userId, recipe.id)
        if (reportedIds.length > 0) {
          setReportedCommentIds(new Set(reportedIds))
        }
      }
    } catch {
      // graceful — empty state shown
    } finally {
      setCommentsLoaded(true)
      setCommentsLoading(false)
    }
  }, [canUseLiveComments, commentsLoaded, recipe.id, userId])

  useEffect(() => {
    if ((expanded || commentsOpen) && canUseLiveComments && !commentsLoaded) {
      void loadComments()
    }
  }, [expanded, commentsOpen, canUseLiveComments, commentsLoaded, loadComments])

  const scrollToComments = () => {
    window.requestAnimationFrame(() => {
      commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const openCommentsSection = () => {
    setCommentsOpen(true)
    void loadComments()
    scrollToComments()
  }

  const handleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    onOpenRecipeChange?.(next ? recipe.id : null)
    if (!next) {
      setCommentsOpen(false)
      return
    }

    setCommentsOpen(true)

    if (canUseLiveComments) {
      void loadComments()
      void incrementRecipeViews(recipe.id).then(() => {
        onUpdated?.()
      })
    }

    scrollToComments()
  }

  const handleCollapse = () => {
    if (!expanded) return
    setExpanded(false)
    setCommentsOpen(false)
    onOpenRecipeChange?.(null)
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    const body = commentText.trim()
    if (!body || !requireAuth() || !canUseLiveComments || submitting) return

    setSubmitting(true)
    try {
      const newComment = await addRecipeComment(userId, recipe.id, body, currentUserDisplayName)
      setComments((prev) => [...prev, newComment])
      setLocalCommentCount((n) => n + 1)
      setCommentText('')
    } catch (error) {
      console.error('[CommunityRecipeCard] addComment failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm(t('communityCommentDeleteConfirm'))) return
    if (editingCommentId === commentId) {
      setEditingCommentId(null)
      setEditText('')
    }
    try {
      await deleteRecipeComment(userId, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setLocalCommentCount((n) => Math.max(0, n - 1))
    } catch (error) {
      console.error('[CommunityRecipeCard] deleteComment failed:', error)
    }
  }

  const startEditComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditText(comment.body)
  }

  const cancelEditComment = () => {
    setEditingCommentId(null)
    setEditText('')
  }

  const handleSaveEditComment = async (commentId) => {
    const body = editText.trim()
    if (!body || editSaving) return

    setEditSaving(true)
    try {
      const updated = await updateRecipeComment(userId, commentId, body)
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? { ...comment, body: updated.body } : comment,
        ),
      )
      cancelEditComment()
    } catch (error) {
      console.error('[CommunityRecipeCard] editComment failed:', error)
    } finally {
      setEditSaving(false)
    }
  }

  const handleReportComment = async (commentId) => {
    if (!isAuthenticated) {
      onAuthRequired()
      return
    }
    if (reportedCommentIds.has(commentId)) return

    try {
      await reportRecipeComment(userId, commentId)
      setReportedCommentIds((prev) => new Set(prev).add(commentId))
    } catch (error) {
      console.error('[CommunityRecipeCard] reportComment failed:', error)
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
      if (liked) {
        addFavoriteCommunityRecipe(recipe)
      } else {
        removeFavoriteRecipe(recipe.id)
      }
      onFavoritesChanged?.()
      onUpdated?.()
    } catch (error) {
      console.error('[CommunityRecipeCard] like failed:', error)
    } finally {
      setBusy(false)
    }
  }

  const handleSaveRecipe = () => {
    if (!requireAuth() || recipe.id.startsWith('mock-')) return

    setBusy(true)
    try {
      if (localSaved) {
        removeSavedCommunityRecipe(recipe.id)
        setLocalSaved(false)
        setLocalSavesCount((count) => Math.max(0, count - 1))
      } else {
        saveCommunityRecipe(recipe)
        setLocalSaved(true)
        setLocalSavesCount((count) => count + 1)
      }
      onSavedChanged?.()
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

  const handleRate = async (starValue) => {
    if (!requireAuth() || !userId || !isSupabaseReady || recipe.id.startsWith('mock-')) return

    const stars = Number(starValue)
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) return

    const currentRating = normalizeUserRating(localUserRatingRef.current)
    const previousUserRating = currentRating
    const previousCount = localRatingCount
    const previousAverage = localRating

    let nextUserRating = currentRating
    let nextCount = previousCount
    let nextAverage = previousAverage

    if (currentRating === stars) {
      nextUserRating = null
      nextCount = Math.max(0, previousCount - 1)
      nextAverage =
        nextCount > 0 ? (previousAverage * previousCount - currentRating) / nextCount : 0
      nextAverage = Math.round(nextAverage * 10) / 10
    } else if (currentRating == null) {
      nextUserRating = stars
      nextCount = previousCount + 1
      nextAverage =
        previousCount > 0
          ? (previousAverage * previousCount + stars) / nextCount
          : stars
      nextAverage = Math.round(nextAverage * 10) / 10
    } else {
      nextUserRating = stars
      nextAverage =
        previousCount > 0
          ? (previousAverage * previousCount - currentRating + stars) / previousCount
          : stars
      nextAverage = Math.round(nextAverage * 10) / 10
    }

    setLocalUserRating(nextUserRating)
    setLocalRatingCount(nextCount)
    setLocalRating(nextAverage)
    localUserRatingRef.current = nextUserRating

    setRatingBusy(true)
    try {
      if (currentRating === stars) {
        await clearCommunityRecipeRating(userId, recipe.id)
      } else if (currentRating == null) {
        try {
          await rateCommunityRecipe(userId, recipe.id, stars)
        } catch (error) {
          if (error?.message === 'ALREADY_RATED') {
            await updateCommunityRecipeRating(userId, recipe.id, stars)
            setLocalRatingCount(previousCount)
            setLocalRating(previousAverage)
            localUserRatingRef.current = stars
            setLocalUserRating(stars)
          } else {
            throw error
          }
        }
      } else {
        await updateCommunityRecipeRating(userId, recipe.id, stars)
      }
    } catch (error) {
      setLocalUserRating(previousUserRating)
      setLocalRatingCount(previousCount)
      setLocalRating(previousAverage)
      localUserRatingRef.current = previousUserRating
      console.error('[CommunityRecipeCard] rate failed:', error)
    } finally {
      setRatingBusy(false)
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
      id={`community-recipe-${recipe.id}`}
      className="community-card"
      style={{
        '--theme-accent': theme.accent,
        '--theme-accent-light': theme.accentLight,
      }}
    >
      {isOwner && (
        <button
          type="button"
          className="community-card__delete-icon"
          onClick={handleDelete}
          disabled={busy}
          aria-label={t('communityDeleteButton')}
        >
          🗑️
        </button>
      )}
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
        {(localRating > 0 && localRatingCount > 0) ? (
        <div className="community-card__rating" aria-label={t('communityRateLabel')}>
          <span className="community-card__rating-value">
            ⭐ {localRating.toFixed(1)}
          </span>
          <span className="community-card__rating-count">
            {t('communityRatingsCount', { count: localRatingCount })}
          </span>
        </div>
        ) : null}
      </div>

      <h3 className="community-card__title">{recipe.title}</h3>

      <p className="community-card__author">{t('communityAuthor', { name: authorLabel })}</p>

      {(expanded || commentsOpen) && (
        <div className="community-card__comments" ref={commentsSectionRef}>
          <h4 className="community-card__comments-title">
            {t('communityComments')}
            {localCommentCount > 0 && (
              <span className="community-card__comments-count-badge">
                {localCommentCount}
              </span>
            )}
          </h4>

          {!canUseLiveComments ? (
            <p className="community-card__comments-empty">{t('communityMockNotice')}</p>
          ) : (
            <>
              {commentsLoading && (
                <p className="community-card__comments-status">{t('communityCommentsLoading')}</p>
              )}

              {!commentsLoading && commentsLoaded && comments.length === 0 && (
                <p className="community-card__comments-empty">{t('communityCommentsEmpty')}</p>
              )}

              {comments.length > 0 && (
                <ul className="community-card__comments-list">
                  {comments.map((c) => {
                    const isOwnerComment = c.userId === userId
                    const isEditing = editingCommentId === c.id
                    const isReported = reportedCommentIds.has(c.id)

                    return (
                    <li key={c.id} className="community-card__comment">
                      <div className="community-card__comment-header">
                        <span className="community-card__comment-author">
                          {c.userId === userId
                            ? (currentUserDisplayName || fallbackAuthor)
                            : (c.authorName || fallbackAuthor)}
                        </span>
                        <span className="community-card__comment-date">
                          {formatRelativeDate(c.createdAt, language)}
                        </span>
                        <div className="community-card__comment-actions">
                          {isOwnerComment && !isEditing && (
                            <>
                              <button
                                type="button"
                                className="community-card__comment-action"
                                onClick={() => startEditComment(c)}
                              >
                                {t('communityCommentEdit')}
                              </button>
                              <button
                                type="button"
                                className="community-card__comment-action community-card__comment-action--danger"
                                onClick={() => handleDeleteComment(c.id)}
                                aria-label={t('communityCommentDelete')}
                              >
                                {t('communityCommentDelete')}
                              </button>
                            </>
                          )}
                          {!isOwnerComment && (
                            <button
                              type="button"
                              className="community-card__comment-action"
                              onClick={() => handleReportComment(c.id)}
                              disabled={isAuthenticated && isReported}
                              aria-label={t('communityCommentReport')}
                            >
                              {isAuthenticated && isReported
                                ? t('communityCommentReported')
                                : t('communityCommentReport')}
                            </button>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="community-card__comment-edit">
                          <textarea
                            className="community-card__comment-input"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value.slice(0, 500))}
                            rows={2}
                            disabled={editSaving}
                          />
                          <div className="community-card__comment-footer">
                            <span className="community-card__comment-char-count">
                              {editText.length}/500
                            </span>
                            <div className="community-card__comment-edit-actions">
                              <button
                                type="button"
                                className="community-card__comment-action"
                                onClick={cancelEditComment}
                                disabled={editSaving}
                              >
                                {t('communityCommentCancel')}
                              </button>
                              <button
                                type="button"
                                className="community-card__comment-action community-card__comment-action--primary"
                                onClick={() => handleSaveEditComment(c.id)}
                                disabled={editSaving || !editText.trim()}
                              >
                                {editSaving ? t('communityCommentSaving') : t('communityCommentSave')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="community-card__comment-body">{c.body}</p>
                      )}
                    </li>
                    )
                  })}
                </ul>
              )}

              {isAuthenticated ? (
                <form className="community-card__comment-form" onSubmit={handleAddComment}>
                  <textarea
                    ref={commentInputRef}
                    className="community-card__comment-input"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
                    placeholder={commentPlaceholder}
                    rows={2}
                    disabled={submitting}
                  />
                  <div className="community-card__comment-footer">
                    <span className="community-card__comment-char-count">
                      {commentText.length}/500
                    </span>
                    <button
                      type="submit"
                      className="btn btn--primary community-card__comment-submit"
                      disabled={submitting || !commentText.trim()}
                    >
                      {submitting ? t('communityCommentSubmitting') : t('communityCommentSubmit')}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost community-card__comment-login"
                  onClick={onAuthRequired}
                >
                  {t('communityCommentLoginPrompt')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="community-card__actions">
        <button
          type="button"
          className={`community-card__like ${localLiked ? 'community-card__like--active' : ''}`}
          onClick={handleLike}
          disabled={busy}
          aria-pressed={localLiked}
        >
          <span className="community-card__like-label">{t('communityLike')}</span>
          <span className="community-card__like-icon" aria-hidden="true">
            {localLiked ? '❤️' : '♡'}
          </span>
        </button>
        <button
          type="button"
          className={`community-card__save ${localSaved ? 'community-card__save--active' : ''}`}
          onClick={handleSaveRecipe}
          disabled={busy}
        >
          📌 {t('communitySave')}
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

      <div className="community-card__meta">
        <span>{t('communityViews', { count: formatViews(recipe.viewsCount ?? recipe.views ?? 0, language) })}</span>
        <span className="community-card__likes">❤️ {localLikeCount}</span>
        <span className="community-card__saves">📌 {localSavesCount}</span>
        <button
          type="button"
          className="community-card__comment-count"
          onClick={openCommentsSection}
          aria-label={t('communityCommentsCount', { count: localCommentCount })}
        >
          <span className="community-card__comment-count-emoji" aria-hidden="true">
            💬
          </span>
          <span className="community-card__comment-count-text">
            {t('communityCommentsCount', { count: localCommentCount })}
          </span>
        </button>
      </div>

      <div className="community-card__stars">
        <span className="community-card__stars-label">{t('communityRateLabel')}</span>
        <div className="community-card__stars-row" role="group" aria-label={t('communityRateLabel')}>
          {[1, 2, 3, 4, 5].map((stars) => {
            const selectedRating = normalizeUserRating(localUserRating) ?? 0
            const isActive = selectedRating >= stars

            return (
            <button
              key={stars}
              type="button"
              className={`community-card__star ${isActive ? 'community-card__star--active' : ''}`}
              onClick={() => handleRate(stars)}
              disabled={ratingBusy}
              aria-label={t('communityRateStars', { count: stars })}
              aria-pressed={isActive}
            >
              ★
            </button>
            )
          })}
        </div>
      </div>

      {expanded && (
        <>
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
          <button
            type="button"
            className="community-card__collapse-less"
            onClick={handleCollapse}
          >
            {t('communityShowLess')}
          </button>
        </>
      )}
    </article>
  )
}
