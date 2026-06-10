import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import BackgroundDecor from './components/BackgroundDecor'
import Header from './components/Header'
import CategorySelector from './components/CategorySelector'
import DietaryPreferences from './components/DietaryPreferences'
import MusicPlatformSelector from './components/MusicPlatformSelector'
import RecipeForm from './components/RecipeForm'
import LoadingAnimation from './components/LoadingAnimation'
import RecipeCard from './components/RecipeCard'
import SavedRecipes from './components/SavedRecipes'
import CommunityRecipes from './components/CommunityRecipes'
import CommunityTop5 from './components/CommunityTop5'
import MyRecipes from './components/MyRecipes'
import OurStory from './components/OurStory'
import { useAuth } from './context/AuthContext'
import { fetchUserRecipes, isUserRecipesAvailable } from './services/userRecipeService'
import { fetchCommunityRecipes } from './services/communityRecipeService'
import FavoriteRecipes from './components/FavoriteRecipes'
import WeeklyMealPlanner from './components/WeeklyMealPlanner'
import MyAreaDrawer, { MY_AREA_PANELS, getMyAreaNavItem } from './components/MyAreaDrawer'
import MyAreaPageSection from './components/MyAreaPageSection'
import HomeDailyPills from './components/HomeDailyPills'
import DailyChallengeModal from './components/dailyChallenge/DailyChallengeModal'
import DailyQuizModal from './components/dailyQuiz/DailyQuizModal'
import DailyChallengePage from './components/dailyChallenge/DailyChallengePage'
import ChallengeSubmitModal from './components/dailyChallenge/ChallengeSubmitModal'
import AuthModal from './components/AuthModal'
import { userSubmittedToday } from './services/dailyChallengeService'
import { useLanguage } from './i18n/useLanguage'
import { getTheme } from './utils/themes'
import { generateAppRecipe } from './services/recipeService'
import { regenerateRecipeSteps } from './services/regenerateStepsService'
import { fetchMoreRecipeIdeas } from './services/recipeIdeasService'
import { detectCookingMethod, detectDessertCategory } from './utils/recipeDiversity'
// Recipe source: FastAPI backend (default) — see .env.example
import {
  getSavedRecipes,
  saveRecipe,
  removeRecipe,
  getSavedCommunityRecipes,
  removeSavedCommunityRecipe,
} from './utils/storage'
import {
  getFavoriteRecipes,
  addFavoriteRecipe,
  removeFavoriteRecipe,
} from './utils/favoritesStorage'
import {
  clearMealPlan,
  getMealPlan,
  removeRecipeFromMealPlan,
} from './utils/mealPlannerStorage'
import {
  applyNavigationRoute,
  parseNavigationHash,
  readNavigationRoute,
  writeNavigationRoute,
} from './utils/navigationRoute'
import './App.css'

const GLOBAL_PAGES = {
  dailyChallenge: 'dailyChallenge',
}

const INITIAL_FORM = {
  ingredients: '',
  time: 30,
  mood: 'cozy',
  glutenFree: false,
  musicPlatform: 'spotify',
  servings: 4,
}

export default function App() {
  const initialNavRef = useRef(null)
  if (initialNavRef.current === null) {
    initialNavRef.current = readNavigationRoute()
  }
  const initialNav = initialNavRef.current

  const { t, language } = useLanguage()
  const { user, isAuthenticated, displayName } = useAuth()
  const [myRecipesCount, setMyRecipesCount] = useState(0)
  const [category, setCategory] = useState('dairy')
  const [recipeType, setRecipeType] = useState('meal')
  const [form, setForm] = useState(INITIAL_FORM)
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savedRecipes, setSavedRecipes] = useState(getSavedRecipes)
  const [savedCommunityRecipes, setSavedCommunityRecipes] = useState(getSavedCommunityRecipes)
  const [favoriteRecipes, setFavoriteRecipes] = useState(getFavoriteRecipes)
  const [usedTemplateKeys, setUsedTemplateKeys] = useState([])
  const [regenerationHistory, setRegenerationHistory] = useState({
    titles: [],
    cookingMethods: [],
    dessertCategories: [],
  })
  const [saveError, setSaveError] = useState(false)
  const [backendNotice, setBackendNotice] = useState(null)
  const [impossibleRecipe, setImpossibleRecipe] = useState(null)
  const [recipeIdeas, setRecipeIdeas] = useState(null)
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [mealPlan, setMealPlan] = useState(getMealPlan)
  const [myAreaOpen, setMyAreaOpen] = useState(false)
  const [activeMyAreaPage, setActiveMyAreaPage] = useState(initialNav.activeMyAreaPage)
  const [openRecipeId, setOpenRecipeId] = useState(initialNav.openRecipeId)
  const [searchCommunityRecipes, setSearchCommunityRecipes] = useState([])
  const [searchPrivateRecipes, setSearchPrivateRecipes] = useState([])
  const [stepsRegenerating, setStepsRegenerating] = useState(false)
  const [stepsRegenerateError, setStepsRegenerateError] = useState(null)
  const [stepsGenerationKey, setStepsGenerationKey] = useState(0)
  const [activeGlobalPage, setActiveGlobalPage] = useState(initialNav.activeGlobalPage)
  const [challengeModalOpen, setChallengeModalOpen] = useState(false)
  const [quizModalOpen, setQuizModalOpen] = useState(initialNav.quizModalOpen)
  const [gamificationRefreshKey, setGamificationRefreshKey] = useState(0)
  const [challengeSubmitOpen, setChallengeSubmitOpen] = useState(false)
  const [challengeAuthOpen, setChallengeAuthOpen] = useState(false)
  const [challengeSubmittedToday, setChallengeSubmittedToday] = useState(false)

  const refreshMyRecipesCount = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !isUserRecipesAvailable()) {
      setMyRecipesCount(0)
      return
    }
    try {
      const list = await fetchUserRecipes(user.id)
      setMyRecipesCount(list.length)
    } catch {
      setMyRecipesCount(0)
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    refreshMyRecipesCount()
  }, [refreshMyRecipesCount])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setChallengeSubmittedToday(false)
      return undefined
    }
    let cancelled = false
    userSubmittedToday(user.id).then((submitted) => {
      if (!cancelled) setChallengeSubmittedToday(submitted)
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  useLayoutEffect(() => {
    applyNavigationRoute(readNavigationRoute(), {
      setMyAreaOpen,
      setActiveMyAreaPage,
      setActiveGlobalPage,
      setQuizModalOpen,
      setOpenRecipeId,
    })
  }, [])

  useLayoutEffect(() => {
    writeNavigationRoute({
      activeMyAreaPage,
      activeGlobalPage,
      quizModalOpen,
      openRecipeId,
    })
  }, [activeMyAreaPage, activeGlobalPage, quizModalOpen, openRecipeId])

  useEffect(() => {
    const applyHash = () => {
      applyNavigationRoute(parseNavigationHash(window.location.hash), {
        setMyAreaOpen,
        setActiveMyAreaPage,
        setActiveGlobalPage,
        setQuizModalOpen,
        setOpenRecipeId,
      })
    }

    window.addEventListener('hashchange', applyHash)
    window.addEventListener('popstate', applyHash)
    return () => {
      window.removeEventListener('hashchange', applyHash)
      window.removeEventListener('popstate', applyHash)
    }
  }, [])

  useEffect(() => {
    if (!myAreaOpen) return undefined

    let cancelled = false

    const loadSearchSources = async () => {
      try {
        const community = await fetchCommunityRecipes(user?.id)
        if (!cancelled) setSearchCommunityRecipes(community)
      } catch (error) {
        console.error('[App] Search community recipes load failed:', error)
        if (!cancelled) setSearchCommunityRecipes([])
      }

      if (isAuthenticated && user?.id && isUserRecipesAvailable()) {
        try {
          const privateRecipes = await fetchUserRecipes(user.id)
          if (!cancelled) setSearchPrivateRecipes(privateRecipes)
        } catch (error) {
          console.error('[App] Search private recipes load failed:', error)
          if (!cancelled) setSearchPrivateRecipes([])
        }
      } else if (!cancelled) {
        setSearchPrivateRecipes([])
      }
    }

    loadSearchSources()
    return () => {
      cancelled = true
    }
  }, [myAreaOpen, user?.id, isAuthenticated])

  const theme = getTheme(category)
  const isSaved = recipe ? savedRecipes.some((r) => r.id === recipe.id) : false
  const isFavorite = recipe ? favoriteRecipes.some((r) => r.id === recipe.id) : false

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleGenerate = useCallback(
    async (options = {}) => {
      const {
        excludeKeys = [],
        excludeTitles = [],
        excludeCookingMethods = [],
        excludeDessertCategories = [],
        regenerate = false,
      } = options
      setLoading(true)
      setRecipe(null)
      setRecipeIdeas(null)
      setImpossibleRecipe(null)
      setStepsRegenerateError(null)
      setStepsGenerationKey(0)
      setSaveError(false)
      setBackendNotice(null)

      if (!regenerate) {
        setUsedTemplateKeys([])
        setRegenerationHistory({ titles: [], cookingMethods: [], dessertCategories: [] })
      }

      try {
        const keysToExclude = regenerate ? excludeKeys : []
        const {
          recipe: newRecipe,
          fallbackReason,
          recipePossible,
          impossibleReason,
          missingIngredients,
        } = await generateAppRecipe(
          {
            category,
            ingredients: form.ingredients,
            cookingTime: form.time,
            mood: form.mood,
            isGlutenFree: form.glutenFree,
            musicPlatform: form.musicPlatform,
            servings: form.servings,
            recipeType,
          },
          {
            language,
            pantrySuffix: t('pantrySuffix'),
            excludeTemplateKeys: keysToExclude,
            excludeTitles: regenerate ? excludeTitles : [],
            excludeCookingMethods: regenerate ? excludeCookingMethods : [],
            excludeDessertCategories: regenerate ? excludeDessertCategories : [],
          },
        )

        if (recipePossible === false) {
          setRecipe(null)
          setImpossibleRecipe({
            reason: impossibleReason,
            missingIngredients: missingIngredients ?? [],
          })
          return
        }

        setRecipe(newRecipe)
        setBackendNotice(fallbackReason)
        setUsedTemplateKeys((prev) =>
          regenerate ? [...prev, newRecipe.templateKey] : [newRecipe.templateKey],
        )
        setRegenerationHistory((prev) => {
          const cookingMethod = detectCookingMethod(newRecipe)
          const dessertCategory = recipeType === 'dessert' ? detectDessertCategory(newRecipe) : null
          return {
            titles: regenerate ? [...prev.titles, newRecipe.name] : [newRecipe.name],
            cookingMethods: regenerate
              ? [...prev.cookingMethods, cookingMethod].filter(Boolean)
              : [cookingMethod].filter(Boolean),
            dessertCategories:
              recipeType === 'dessert' && dessertCategory
                ? regenerate
                  ? [...prev.dessertCategories, dessertCategory]
                  : [dessertCategory]
                : [],
          }
        })
      } catch (error) {
        console.error('[App] Recipe generation failed:', error)
        setBackendNotice('error')
      } finally {
        setLoading(false)
      }
    },
    [category, form, t, language, recipeType],
  )

  const handleSave = () => {
    if (!recipe || isSaved) return
    const before = savedRecipes.length
    const updated = saveRecipe({
      ...recipe,
      glutenFree: form.glutenFree,
      musicPlatform: form.musicPlatform,
    })
    if (updated.length === before) {
      setSaveError(true)
      return
    }
    setSaveError(false)
    setSavedRecipes(updated)
  }

  const handleRemove = (id) => {
    if (savedCommunityRecipes.some((r) => r.id === id)) {
      setSavedCommunityRecipes(removeSavedCommunityRecipe(id))
    } else {
      setSavedRecipes(removeRecipe(id))
    }
  }

  const handleAddFavorite = () => {
    if (!recipe || isFavorite) return
    const updated = addFavoriteRecipe({
      ...recipe,
      glutenFree: form.glutenFree,
      musicPlatform: form.musicPlatform,
    })
    setFavoriteRecipes(updated)
  }

  const handleRemoveFavorite = (id) => {
    const updated = removeFavoriteRecipe(id)
    setFavoriteRecipes(updated)
  }

  const handleMealPlanUpdated = (plan) => {
    setMealPlan(plan)
  }

  const handleRemoveFromMealPlan = (day, mealType) => {
    setMealPlan(removeRecipeFromMealPlan(day, mealType))
  }

  const handleClearMealPlan = () => {
    setMealPlan(clearMealPlan())
  }

  const handleRegenerate = () => {
    setRecipeIdeas(null)
    handleGenerate({
      excludeKeys: usedTemplateKeys,
      excludeTitles: regenerationHistory.titles,
      excludeCookingMethods: regenerationHistory.cookingMethods,
      excludeDessertCategories: regenerationHistory.dessertCategories,
      regenerate: true,
    })
  }

  const handleRegenerateSteps = useCallback(async () => {
    if (!recipe || stepsRegenerating) return

    const variationIndex = stepsGenerationKey
    console.log('[App] regenerateSteps click', {
      recipeId: recipe.id,
      variationIndex,
      stepCount: recipe.steps?.length ?? 0,
    })

    setStepsRegenerateError(null)
    setStepsRegenerating(true)

    try {
      const { steps, source } = await regenerateRecipeSteps({
        name: recipe.name,
        ingredients: recipe.ingredients ?? [],
        currentSteps: recipe.steps ?? [],
        language,
        cookingTime: recipe.time ?? form.time,
        recipeType,
        variationIndex,
      })

      console.log('[App] regenerateSteps success', {
        source,
        newStepCount: steps.length,
        firstStep: steps[0]?.slice(0, 80),
      })

      setRecipe((prev) => (prev ? { ...prev, steps: [...steps] } : prev))
      setStepsGenerationKey((k) => k + 1)
    } catch (error) {
      console.error('[App] regenerateSteps failed', error)
      setStepsRegenerateError(t('regenerateStepsError'))
    } finally {
      setStepsRegenerating(false)
    }
  }, [recipe, stepsRegenerating, stepsGenerationKey, language, form.time, recipeType, t])

  const handleLoadMoreIdeas = useCallback(async () => {
    if (!recipe || ideasLoading) return

    setIdeasLoading(true)
    try {
      const { ideas } = await fetchMoreRecipeIdeas({
        category,
        ingredients: form.ingredients,
        cookingTime: form.time,
        mood: form.mood,
        isGlutenFree: form.glutenFree,
        excludeTitle: recipe.name,
      })
      setRecipeIdeas(ideas.slice(0, 3))
    } catch (error) {
      console.error('[App] More recipe ideas failed:', error)
    } finally {
      setIdeasLoading(false)
    }
  }, [recipe, ideasLoading, category, form])

  const handleChallengeGenerateRecipe = (ingredients, categoryHint) => {
    setForm((prev) => ({
      ...prev,
      ingredients: ingredients.join(', '),
    }))
    if (categoryHint === 'dessert') {
      setRecipeType('dessert')
    } else if (categoryHint && categoryHint !== 'none' && ['dairy', 'meat', 'parve'].includes(categoryHint)) {
      setCategory(categoryHint)
    }
    setChallengeModalOpen(false)
    window.requestAnimationFrame(() => {
      document.getElementById('ingredients')?.focus({ preventScroll: true })
      document.getElementById('ingredients')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const goHome = () => {
    setMyAreaOpen(false)
    setActiveMyAreaPage(null)
    setActiveGlobalPage(null)
    setOpenRecipeId(null)
    setQuizModalOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openChallengeFullPage = () => {
    setMyAreaOpen(false)
    setActiveMyAreaPage(null)
    setOpenRecipeId(null)
    setQuizModalOpen(false)
    setActiveGlobalPage(GLOBAL_PAGES.dailyChallenge)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeMyArea = () => {
    setMyAreaOpen(false)
    setActiveMyAreaPage(null)
    setOpenRecipeId(null)
  }

  const openMyAreaPanel = (panelId) => {
    setMyAreaOpen(false)
    setActiveMyAreaPage(panelId)
    setOpenRecipeId(null)
    setActiveGlobalPage(null)
    setQuizModalOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderMyAreaPageContent = () => {
    switch (activeMyAreaPage) {
      case MY_AREA_PANELS.weekly:
        return (
          <WeeklyMealPlanner
            plan={mealPlan}
            onRemoveSlot={handleRemoveFromMealPlan}
            onClear={handleClearMealPlan}
            onSelectRecipe={handleSelectSaved}
          />
        )
      case MY_AREA_PANELS.favorites:
        return (
          <FavoriteRecipes
            recipes={favoriteRecipes}
            onRemove={handleRemoveFavorite}
            onSelect={handleSelectSaved}
          />
        )
      case MY_AREA_PANELS.saved:
        return (
          <SavedRecipes
            recipes={[...savedRecipes, ...savedCommunityRecipes]}
            onRemove={handleRemove}
            onSelect={handleSelectSaved}
            initialExpandedId={openRecipeId}
            onExpandedChange={setOpenRecipeId}
          />
        )
      case MY_AREA_PANELS.myRecipes:
        return <MyRecipes onRecipesChanged={refreshMyRecipesCount} />
      case MY_AREA_PANELS.community:
        return (
          <CommunityRecipes
            initialExpandedRecipeId={openRecipeId}
            onExpandedRecipeChange={setOpenRecipeId}
          />
        )
      case MY_AREA_PANELS.story:
        return <OurStory />
      default:
        return null
    }
  }

  const handleSearchSelect = (result) => {
    if (!result) return

    if (result.type === 'section') {
      openMyAreaPanel(result.panelId)
      return
    }

    if (result.recipe) {
      handleSelectSaved(result.recipe)
    }
  }

  const handleSelectSaved = (saved) => {
    if (!saved?.id) return
    closeMyArea()
    setOpenRecipeId(null)
    setActiveGlobalPage(null)
    setQuizModalOpen(false)
    setCategory(saved.category ?? 'dairy')
    setForm({
      ingredients: '',
      time: saved.time ?? 30,
      mood: saved.mood ?? 'cozy',
      glutenFree: saved.glutenFree ?? false,
      musicPlatform: saved.musicPlatform ?? 'spotify',
    })
    setUsedTemplateKeys(saved.templateKey ? [saved.templateKey] : [])
    setRecipe(saved)
    setRecipeIdeas(null)
    setSaveError(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div
      className={`app ${loading ? 'app--loading' : ''}`}
      style={{
        '--theme-accent': theme.accent,
        '--theme-accent-light': theme.accentLight,
        '--theme-gradient': theme.gradient,
        '--theme-glow': theme.glow,
        '--theme-mesh': theme.mesh,
      }}
    >
      <BackgroundDecor theme={theme} />
      <div className="app__bg" />

      <main className={`app__main ${activeMyAreaPage || activeGlobalPage ? 'app__main--my-area-page' : ''}`}>
        <Header
          onOpenMyArea={() => setMyAreaOpen(true)}
          onGoHome={goHome}
          gamificationRefreshKey={gamificationRefreshKey}
        />

        {activeMyAreaPage ? (
          <MyAreaPageSection titleKey={getMyAreaNavItem(activeMyAreaPage)?.labelKey}>
            {renderMyAreaPageContent()}
          </MyAreaPageSection>
        ) : activeGlobalPage === GLOBAL_PAGES.dailyChallenge ? (
          <MyAreaPageSection titleKey="challengeDailyTitle">
            <DailyChallengePage />
          </MyAreaPageSection>
        ) : (
          <>
        <HomeDailyPills
          onOpenChallenge={() => setChallengeModalOpen(true)}
          onOpenQuiz={() => {
            setActiveMyAreaPage(null)
            setActiveGlobalPage(null)
            setOpenRecipeId(null)
            setQuizModalOpen(true)
          }}
        />

        <CategorySelector
          selected={category}
          onSelect={setCategory}
          recipeType={recipeType}
          onRecipeTypeChange={setRecipeType}
        />

        <DietaryPreferences
          glutenFree={form.glutenFree}
          onChange={(value) => handleFormChange('glutenFree', value)}
          theme={theme}
        />

        <MusicPlatformSelector
          selected={form.musicPlatform}
          onChange={(value) => handleFormChange('musicPlatform', value)}
          theme={theme}
        />

        <RecipeForm
          form={form}
          onChange={handleFormChange}
          onSubmit={() => handleGenerate()}
          disabled={loading}
          theme={theme}
        />

        {loading && <LoadingAnimation theme={theme} />}

        {backendNotice === 'fallback' && recipe && !loading && (
          <p className="app__backend-notice app__backend-notice--info" role="status">
            {t('backendFallbackNotice')}
          </p>
        )}

        {backendNotice === 'error' && !recipe && !loading && (
          <p className="app__backend-notice app__backend-notice--error" role="alert">
            {t('backendUnreachable')}
          </p>
        )}

        {impossibleRecipe && !loading && (
          <div className="app__backend-notice app__backend-notice--error" role="alert">
            <p>{impossibleRecipe.reason}</p>
            {impossibleRecipe.missingIngredients?.length > 0 && (
              <p>
                {t('recipeMissingIngredients')}{' '}
                {impossibleRecipe.missingIngredients.join(', ')}
              </p>
            )}
          </div>
        )}

        {recipe && !loading && (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            musicPlatform={form.musicPlatform}
            theme={theme}
            themeCategory={category}
            isSaved={isSaved}
            isFavorite={isFavorite}
            saveError={saveError}
            onSave={handleSave}
            onAddFavorite={handleAddFavorite}
            onRegenerate={handleRegenerate}
            onRegenerateSteps={handleRegenerateSteps}
            stepsRegenerating={stepsRegenerating}
            stepsRegenerateError={stepsRegenerateError}
            stepsGenerationKey={stepsGenerationKey}
            recipeIdeas={recipeIdeas}
            ideasLoading={ideasLoading}
            onLoadMoreIdeas={handleLoadMoreIdeas}
            onMealPlanUpdated={handleMealPlanUpdated}
          />
        )}

        {!activeMyAreaPage && !activeGlobalPage && <CommunityTop5 />}
          </>
        )}

      </main>

      <MyAreaDrawer
        open={myAreaOpen}
        onClose={() => setMyAreaOpen(false)}
        onSelectPanel={openMyAreaPanel}
        savedCount={savedRecipes.length + savedCommunityRecipes.length}
        favoritesCount={favoriteRecipes.length}
        myRecipesCount={myRecipesCount}
        searchSavedRecipes={[...savedRecipes, ...savedCommunityRecipes]}
        searchFavoriteRecipes={favoriteRecipes}
        searchMealPlan={mealPlan}
        searchPrivateRecipes={searchPrivateRecipes}
        searchCommunityRecipes={searchCommunityRecipes}
        onSearchSelect={handleSearchSelect}
      />

      <DailyQuizModal
        open={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        onAnswered={() => setGamificationRefreshKey((key) => key + 1)}
      />
      <DailyChallengeModal
        open={challengeModalOpen}
        onClose={() => setChallengeModalOpen(false)}
        userId={user?.id}
        submittedToday={challengeSubmittedToday}
        onOpenChallengePage={() => {
          setChallengeModalOpen(false)
          openChallengeFullPage()
        }}
        onGenerateRecipe={handleChallengeGenerateRecipe}
        onOpenSubmit={
          challengeSubmittedToday
            ? undefined
            : () => {
                if (isAuthenticated) {
                  setChallengeModalOpen(false)
                  setChallengeSubmitOpen(true)
                } else {
                  setChallengeAuthOpen(true)
                }
              }
        }
      />
      <ChallengeSubmitModal
        open={challengeSubmitOpen}
        onClose={() => setChallengeSubmitOpen(false)}
        userId={user?.id}
        authorName={displayName}
        onSubmitted={() => {
          setChallengeSubmittedToday(true)
        }}
      />
      <AuthModal open={challengeAuthOpen} onClose={() => setChallengeAuthOpen(false)} initialMode="login" />

      <footer className="app__footer">
        <p>{t('footer')}</p>
      </footer>
    </div>
  )
}
