import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { fetchCommunityRecipes } from '../services/communityRecipeService'
import AuthModal from './AuthModal'
import UploadCommunityRecipeModal from './UploadCommunityRecipeModal'
import CommunityRecipeCard from './CommunityRecipeCard'
import './CommunityRecipes.css'

export default function CommunityRecipes() {
  const { t } = useLanguage()
  const { user, isAuthenticated, isSupabaseReady, loading: authLoading } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [uploadOpen, setUploadOpen] = useState(false)

  const loadRecipes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const items = await fetchCommunityRecipes(user?.id)
      setRecipes(items)
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
  }, [authLoading, loadRecipes])

  const openAuth = (mode = 'login') => {
    setAuthMode(mode)
    setAuthOpen(true)
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
    setUploadOpen(true)
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

      {!isSupabaseReady && (
        <p className="community-recipes__notice">{t('communityMockNotice')}</p>
      )}

      {loading && <p className="community-recipes__status">{t('communityLoading')}</p>}
      {error && <p className="community-recipes__error">{error}</p>}

      {!loading && recipes.length === 0 && (
        <div className="community-recipes__empty">
          <span>👥</span>
          <p>{t('communityEmpty')}</p>
        </div>
      )}

      <div className="community-recipes__grid">
        {recipes.map((recipe) => (
          <CommunityRecipeCard
            key={recipe.id}
            recipe={recipe}
            isAuthenticated={isAuthenticated}
            userId={user?.id}
            isSupabaseReady={isSupabaseReady}
            onAuthRequired={() => openAuth('login')}
            onUpdated={loadRecipes}
          />
        ))}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />

      {isAuthenticated && (
        <UploadCommunityRecipeModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          userId={user.id}
          onUploaded={loadRecipes}
        />
      )}
    </section>
  )
}
