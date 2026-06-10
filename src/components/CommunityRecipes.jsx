import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePublicDisplayName } from '../hooks/usePublicDisplayName'
import { useLanguage } from '../i18n/useLanguage'
import { fetchCommunityRecipes } from '../services/communityRecipeService'
import { enrichCommunityRecipeSaveCount } from '../utils/storage'
import {
  COMMUNITY_RECIPE_CATEGORIES,
  sortCommunityRecipesByCategory,
} from '../utils/communityRecipeRanking'
import AuthModal from './AuthModal'
import UploadCommunityRecipeForm from './UploadCommunityRecipeForm'
import CommunityRecipeCard from './CommunityRecipeCard'
import CommunityTop5 from './CommunityTop5.jsx?strip=v4'
import './CommunityRecipes.css'

const UPLOAD_SECTION_ID = 'community-upload-section'

const CATEGORY_OPTIONS = [
  { id: COMMUNITY_RECIPE_CATEGORIES.new, labelKey: 'communityCategoryNew' },
  { id: COMMUNITY_RECIPE_CATEGORIES.popular, labelKey: 'communityCategoryPopular' },
  { id: COMMUNITY_RECIPE_CATEGORIES.topRated, labelKey: 'communityCategoryTopRated' },
  { id: COMMUNITY_RECIPE_CATEGORIES.mostSaved, labelKey: 'communityCategoryMostSaved' },
]

export default function CommunityRecipes({
  initialExpandedRecipeId = null,
  onExpandedRecipeChange,
  onSavedChanged,
  onFavoritesChanged,
}) {
  const { t } = useLanguage()
  const { user, isAuthenticated, isSupabaseReady, loading: authLoading, profileRevision } = useAuth()
  const publicDisplayName = usePublicDisplayName()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [uploadExpanded, setUploadExpanded] = useState(false)
  const [activeCategory, setActiveCategory] = useState(COMMUNITY_RECIPE_CATEGORIES.new)
  const uploadSectionRef = useRef(null)

  const loadRecipes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const items = await fetchCommunityRecipes(user?.id)
      setRecipes(items.map(enrichCommunityRecipeSaveCount))
    } catch (err) {
      console.error('[CommunityRecipes] load failed:', err)
      setError(t('communityLoadError'))
    } finally {
      setLoading(false)
    }
  }, [user?.id, t])

  useEffect(() => {
    if (authLoading) return
    loadRecipes()
  }, [authLoading, loadRecipes, profileRevision])

  useEffect(() => {
    if (!initialExpandedRecipeId || loading) return undefined
    const timer = window.setTimeout(() => {
      document.getElementById(`community-recipe-${initialExpandedRecipeId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [initialExpandedRecipeId, loading])

  const sortedRecipes = useMemo(
    () => sortCommunityRecipesByCategory(recipes, activeCategory),
    [recipes, activeCategory],
  )

  const openAuth = (mode = 'login') => {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  const scrollToUploadSection = () => {
    setUploadExpanded(true)
    window.requestAnimationFrame(() => {
      uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleUploadClick = () => {
    if (!isSupabaseReady) {
      window.alert(t('authSupabaseMissing'))
      return
    }
    if (!isAuthenticated) {
      openAuth('login')
      return
    }
    scrollToUploadSection()
  }

  const handleOpenRecipe = (recipeId) => {
    onExpandedRecipeChange?.(recipeId)
    window.requestAnimationFrame(() => {
      document.getElementById(`community-recipe-${recipeId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
  }

  return (
    <section className="community-recipes">
      <div className="community-recipes__header">
        <button
          type="button"
          className="btn btn--ghost community-recipes__upload"
          onClick={handleUploadClick}
        >
          {t('communityUploadRecipe')}
        </button>
      </div>

      {isAuthenticated && uploadExpanded && (
        <div
          ref={uploadSectionRef}
          id={UPLOAD_SECTION_ID}
          className="community-upload community-upload--expanded community-upload--inline"
          aria-label={t('communityUploadRecipe')}
        >
          <UploadCommunityRecipeForm
            userId={user.id}
            onUploaded={() => {
              loadRecipes()
              setUploadExpanded(false)
            }}
          />
        </div>
      )}

      {!loading && (
        <CommunityTop5
          recipes={recipes}
          onRecipeClick={handleOpenRecipe}
          onSavedChanged={onSavedChanged}
          onFavoritesChanged={onFavoritesChanged}
        />
      )}

      <div className="community-recipes__categories" role="tablist" aria-label={t('communityCategoriesLabel')}>
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            className={`community-recipes__category-chip ${
              activeCategory === option.id ? 'community-recipes__category-chip--active' : ''
            }`}
            aria-selected={activeCategory === option.id}
            onClick={() => setActiveCategory(option.id)}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      {!isSupabaseReady && (
        <p className="community-recipes__notice">{t('communityMockNotice')}</p>
      )}

      {loading && <p className="community-recipes__status">{t('communityLoading')}</p>}
      {error && <p className="community-recipes__error">{error}</p>}

      {!loading && (
        <h2 className="community-recipes__list-title community-section-bar">{t('myAreaNavCommunity')}</h2>
      )}

      {!loading && sortedRecipes.length === 0 && (
        <div className="community-recipes__empty">
          <span>👥</span>
          <p>{t('communityEmpty')}</p>
        </div>
      )}

      <div className="community-recipes__grid">
        {sortedRecipes.map((recipe) => (
          <CommunityRecipeCard
            key={recipe.id}
            recipe={recipe}
            isAuthenticated={isAuthenticated}
            userId={user?.id}
            isSupabaseReady={isSupabaseReady}
            onAuthRequired={() => openAuth('login')}
            onUpdated={loadRecipes}
            currentUserDisplayName={publicDisplayName}
            initialExpanded={initialExpandedRecipeId === recipe.id}
            onOpenRecipeChange={onExpandedRecipeChange}
            onSavedChanged={onSavedChanged}
            onFavoritesChanged={onFavoritesChanged}
          />
        ))}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </section>
  )
}
