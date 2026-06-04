import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { getTheme } from '../utils/themes'
import {
  deleteUserRecipe,
  fetchUserRecipes,
  isUserRecipesAvailable,
  shareUserRecipeToCommunity,
  unshareUserRecipeFromCommunity,
} from '../services/userRecipeService'
import AuthModal from './AuthModal'
import PrivateRecipeFormModal from './PrivateRecipeFormModal'
import './MyRecipes.css'

export default function MyRecipes({ onRecipesChanged }) {
  const { t } = useLanguage()
  const { user, isAuthenticated, isSupabaseReady, loading: authLoading } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [formOpen, setFormOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [shareConfirmId, setShareConfirmId] = useState(null)
  const [unshareConfirmId, setUnshareConfirmId] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [flashMessage, setFlashMessage] = useState(null)
  const [actionError, setActionError] = useState('')

  const loadRecipes = useCallback(async () => {
    if (!user?.id || !isUserRecipesAvailable()) {
      setRecipes([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const items = await fetchUserRecipes(user.id)
      setRecipes(items)
      onRecipesChanged?.()
    } catch (err) {
      console.error('[MyRecipes] load failed:', err)
      setError(t('myRecipesLoadError'))
    } finally {
      setLoading(false)
    }
  }, [user?.id, t, onRecipesChanged])

  useEffect(() => {
    if (authLoading) return
    loadRecipes()
  }, [authLoading, loadRecipes])

  useEffect(() => {
    if (!flashMessage) return undefined
    const timer = setTimeout(() => setFlashMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [flashMessage])

  const openAuth = (mode = 'login') => {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  const handleAddClick = () => {
    if (!isSupabaseReady) {
      window.alert(t('authSupabaseMissing'))
      return
    }
    if (!isAuthenticated) {
      openAuth('login')
      return
    }
    setFormOpen(true)
  }

  const handleDelete = async (recipeId) => {
    if (!user?.id) return
    setActionError('')
    try {
      await deleteUserRecipe(user.id, recipeId)
      setRecipes((prev) => prev.filter((item) => item.id !== recipeId))
      if (expandedId === recipeId) setExpandedId(null)
      onRecipesChanged?.()
    } catch (err) {
      console.error('[MyRecipes] delete failed:', err)
      setActionError(t('myRecipesDeleteError'))
    }
  }

  const handleShareConfirm = async (recipe) => {
    if (!user?.id) return
    setActionLoadingId(recipe.id)
    setActionError('')
    setShareConfirmId(null)

    try {
      await shareUserRecipeToCommunity(user.id, recipe)
      setFlashMessage({ recipeId: recipe.id, type: 'shared' })
      await loadRecipes()
    } catch (err) {
      if (err?.message === 'ALREADY_SHARED') {
        setActionError(t('myRecipesAlreadyShared'))
      } else {
        console.error('[MyRecipes] share failed:', err)
        setActionError(t('myRecipesShareError'))
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleUnshareConfirm = async (recipe) => {
    if (!user?.id) return
    setActionLoadingId(recipe.id)
    setActionError('')
    setUnshareConfirmId(null)

    try {
      await unshareUserRecipeFromCommunity(user.id, recipe)
      setFlashMessage({ recipeId: recipe.id, type: 'private' })
      await loadRecipes()
    } catch (err) {
      if (err?.message === 'NOT_SHARED') {
        setActionError(t('myRecipesNotShared'))
      } else {
        console.error('[MyRecipes] unshare failed:', err)
        setActionError(t('myRecipesUnshareError'))
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  const pendingShareRecipe = recipes.find((item) => item.id === shareConfirmId)
  const pendingUnshareRecipe = recipes.find((item) => item.id === unshareConfirmId)

  return (
    <section className="my-recipes">
      <div className="my-recipes__header">
        <h2 className="section-title">{t('myRecipesTitle')}</h2>
        <button type="button" className="btn btn--ghost my-recipes__add" onClick={handleAddClick}>
          {t('myRecipesAddRecipe')}
        </button>
      </div>

      {!isSupabaseReady && (
        <p className="my-recipes__notice">{t('myRecipesSupabaseNotice')}</p>
      )}

      {isSupabaseReady && !isAuthenticated && !authLoading && (
        <p className="my-recipes__notice">{t('myRecipesLoginHint')}</p>
      )}

      {loading && <p className="my-recipes__status">{t('myRecipesLoading')}</p>}
      {error && <p className="my-recipes__error">{error}</p>}
      {actionError && <p className="my-recipes__error">{actionError}</p>}

      {!loading && isAuthenticated && recipes.length === 0 && (
        <div className="my-recipes__empty">
          <span aria-hidden="true">📒</span>
          <p>{t('myRecipesEmpty')}</p>
        </div>
      )}

      <ul className="my-recipes__list">
        {recipes.map((recipe) => {
          const theme = getTheme(recipe.category ?? 'parve')
          const isExpanded = expandedId === recipe.id
          const isShared = Boolean(recipe.sharedCommunityRecipeId)

          return (
            <li
              key={recipe.id}
              className="my-recipes__card"
              style={{
                '--theme-accent': theme.accent,
                '--theme-accent-light': theme.accentLight,
              }}
            >
              <div className="my-recipes__card-head">
                <div className="my-recipes__card-meta">
                  <span className="my-recipes__badge">
                    {theme.emoji} {t(`categories.${recipe.category}`)}
                  </span>
                  <span className="my-recipes__badge">{t(`recipeTypes.${recipe.recipeType}`)}</span>
                  <span className="my-recipes__badge">
                    {t('timeMinutes', { count: recipe.cookingTime })} · {recipe.servings}{' '}
                    {t('myRecipesServingsShort')}
                  </span>
                </div>
                <button
                  type="button"
                  className="my-recipes__remove"
                  onClick={() => handleDelete(recipe.id)}
                  aria-label={t('myRecipesDelete')}
                >
                  ×
                </button>
              </div>

              <h3 className="my-recipes__card-title">{recipe.title}</h3>
              {recipe.description && <p className="my-recipes__card-desc">{recipe.description}</p>}

              {flashMessage?.recipeId === recipe.id && (
                <p className="my-recipes__success" role="status">
                  {flashMessage.type === 'private'
                    ? t('myRecipesUnshareSuccess')
                    : t('myRecipesShareSuccess')}
                </p>
              )}

              <div className="my-recipes__card-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? t('myRecipesCollapse') : t('myRecipesExpand')}
                </button>

                {isShared ? (
                  <>
                    <span className="my-recipes__shared-label">{t('myRecipesSharedLabel')}</span>
                    <button
                      type="button"
                      className="btn btn--ghost my-recipes__unshare-btn"
                      disabled={actionLoadingId === recipe.id}
                      onClick={() => setUnshareConfirmId(recipe.id)}
                    >
                      {actionLoadingId === recipe.id
                        ? t('myRecipesUnshareLoading')
                        : t('myRecipesMakePrivate')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary my-recipes__share-btn"
                    disabled={actionLoadingId === recipe.id}
                    onClick={() => setShareConfirmId(recipe.id)}
                  >
                    {actionLoadingId === recipe.id
                      ? t('myRecipesShareLoading')
                      : t('myRecipesShareToCommunity')}
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="my-recipes__details">
                  <h4>{t('ingredientsLabel')}</h4>
                  <ul>
                    {recipe.ingredients.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <h4>{t('cookingSteps')}</h4>
                  <ol>
                    {recipe.steps.map((step, index) => (
                      <li key={`${recipe.id}-step-${index}`}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {unshareConfirmId && pendingUnshareRecipe && (
        <div
          className="my-recipes__confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unshare-confirm-title"
        >
          <button
            type="button"
            className="my-recipes__confirm-backdrop"
            aria-label={t('close')}
            onClick={() => setUnshareConfirmId(null)}
          />
          <div className="my-recipes__confirm-panel">
            <h3 id="unshare-confirm-title">{t('myRecipesUnshareConfirmTitle')}</h3>
            <p>{t('myRecipesUnshareConfirmBody')}</p>
            <div className="my-recipes__confirm-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setUnshareConfirmId(null)}>
                {t('myRecipesShareCancel')}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => handleUnshareConfirm(pendingUnshareRecipe)}
              >
                {t('myRecipesUnshareConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareConfirmId && pendingShareRecipe && (
        <div className="my-recipes__confirm" role="dialog" aria-modal="true" aria-labelledby="share-confirm-title">
          <button
            type="button"
            className="my-recipes__confirm-backdrop"
            aria-label={t('close')}
            onClick={() => setShareConfirmId(null)}
          />
          <div className="my-recipes__confirm-panel">
            <h3 id="share-confirm-title">{t('myRecipesShareConfirmTitle')}</h3>
            <p>{t('myRecipesShareConfirmBody')}</p>
            <div className="my-recipes__confirm-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setShareConfirmId(null)}>
                {t('myRecipesShareCancel')}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => handleShareConfirm(pendingShareRecipe)}
              >
                {t('myRecipesShareConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />

      {isAuthenticated && (
        <PrivateRecipeFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          userId={user.id}
          onSaved={loadRecipes}
        />
      )}
    </section>
  )
}
