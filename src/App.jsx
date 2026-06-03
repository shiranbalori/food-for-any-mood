import { useState, useCallback } from 'react'
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
import FavoriteRecipes from './components/FavoriteRecipes'
import WeeklyMealPlanner from './components/WeeklyMealPlanner'
import MyAreaDrawer, { MY_AREA_PANELS } from './components/MyAreaDrawer'
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
import './App.css'

const INITIAL_FORM = {
  ingredients: '',
  time: 30,
  mood: 'cozy',
  glutenFree: false,
  musicPlatform: 'spotify',
  servings: 4,
}

export default function App() {
  const { t, language } = useLanguage()
  const [category, setCategory] = useState('dairy')
  const [recipeType, setRecipeType] = useState('meal')
  const [form, setForm] = useState(INITIAL_FORM)
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savedRecipes, setSavedRecipes] = useState(getSavedRecipes)
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
  const [myAreaPanel, setMyAreaPanel] = useState(null)
  const [stepsRegenerating, setStepsRegenerating] = useState(false)
  const [stepsRegenerateError, setStepsRegenerateError] = useState(null)
  const [stepsGenerationKey, setStepsGenerationKey] = useState(0)

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
    const updated = removeRecipe(id)
    setSavedRecipes(updated)
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

  const closeMyArea = () => {
    setMyAreaOpen(false)
    setMyAreaPanel(null)
  }

  const handleSelectSaved = (saved) => {
    if (!saved?.id) return
    closeMyArea()
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

      <main className="app__main">
        <Header onOpenMyArea={() => setMyAreaOpen(true)} />

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

      </main>

      <MyAreaDrawer
        open={myAreaOpen}
        activePanel={myAreaPanel}
        onClose={closeMyArea}
        onSelectPanel={setMyAreaPanel}
        onBack={() => setMyAreaPanel(null)}
        savedCount={savedRecipes.length}
        favoritesCount={favoriteRecipes.length}
      >
        {myAreaPanel === MY_AREA_PANELS.weekly && (
          <WeeklyMealPlanner
            plan={mealPlan}
            onRemoveSlot={handleRemoveFromMealPlan}
            onClear={handleClearMealPlan}
            onSelectRecipe={handleSelectSaved}
          />
        )}
        {myAreaPanel === MY_AREA_PANELS.favorites && (
          <FavoriteRecipes
            recipes={favoriteRecipes}
            onRemove={handleRemoveFavorite}
            onSelect={handleSelectSaved}
          />
        )}
        {myAreaPanel === MY_AREA_PANELS.saved && (
          <SavedRecipes
            recipes={savedRecipes}
            onRemove={handleRemove}
            onSelect={handleSelectSaved}
          />
        )}
        {myAreaPanel === MY_AREA_PANELS.community && <CommunityRecipes />}
      </MyAreaDrawer>

      <footer className="app__footer">
        <p>{t('footer')}</p>
      </footer>
    </div>
  )
}
