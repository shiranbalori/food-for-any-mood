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
import FavoriteRecipes from './components/FavoriteRecipes'
import WeeklyMealPlanner from './components/WeeklyMealPlanner'
import { useLanguage } from './i18n/useLanguage'
import { getTheme } from './utils/themes'
import { generateAppRecipe } from './services/recipeService'
import { fetchMoreRecipeIdeas } from './services/recipeIdeasService'
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
}

export default function App() {
  const { t, language } = useLanguage()
  const [category, setCategory] = useState('dairy')
  const [form, setForm] = useState(INITIAL_FORM)
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savedRecipes, setSavedRecipes] = useState(getSavedRecipes)
  const [favoriteRecipes, setFavoriteRecipes] = useState(getFavoriteRecipes)
  const [usedTemplateKeys, setUsedTemplateKeys] = useState([])
  const [saveError, setSaveError] = useState(false)
  const [backendNotice, setBackendNotice] = useState(null)
  const [recipeIdeas, setRecipeIdeas] = useState(null)
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [mealPlan, setMealPlan] = useState(getMealPlan)

  const theme = getTheme(category)
  const isSaved = recipe ? savedRecipes.some((r) => r.id === recipe.id) : false
  const isFavorite = recipe ? favoriteRecipes.some((r) => r.id === recipe.id) : false

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleGenerate = useCallback(
    async (options = {}) => {
      const { excludeKeys = [], regenerate = false } = options
      setLoading(true)
      setRecipe(null)
      setRecipeIdeas(null)
      setSaveError(false)
      setBackendNotice(null)

      if (!regenerate) {
        setUsedTemplateKeys([])
      }

      try {
        const keysToExclude = regenerate ? excludeKeys : []
        const { recipe: newRecipe, fallbackReason } = await generateAppRecipe(
          {
            category,
            ingredients: form.ingredients,
            cookingTime: form.time,
            mood: form.mood,
            isGlutenFree: form.glutenFree,
            musicPlatform: form.musicPlatform,
          },
          {
            language,
            pantrySuffix: t('pantrySuffix'),
            excludeTemplateKeys: keysToExclude,
          },
        )

        setRecipe(newRecipe)
        setBackendNotice(fallbackReason)
        setUsedTemplateKeys((prev) =>
          regenerate ? [...prev, newRecipe.templateKey] : [newRecipe.templateKey],
        )
      } catch (error) {
        console.error('[App] Recipe generation failed:', error)
        setBackendNotice('error')
      } finally {
        setLoading(false)
      }
    },
    [category, form, t, language],
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
    handleGenerate({ excludeKeys: usedTemplateKeys, regenerate: true })
  }

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

  const handleSelectSaved = (saved) => {
    if (!saved?.id) return
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
        <Header />

        <CategorySelector selected={category} onSelect={setCategory} />

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

        {recipe && !loading && (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            musicPlatform={form.musicPlatform}
            theme={getTheme(recipe.category)}
            isSaved={isSaved}
            isFavorite={isFavorite}
            saveError={saveError}
            onSave={handleSave}
            onAddFavorite={handleAddFavorite}
            onRegenerate={handleRegenerate}
            recipeIdeas={recipeIdeas}
            ideasLoading={ideasLoading}
            onLoadMoreIdeas={handleLoadMoreIdeas}
            onMealPlanUpdated={handleMealPlanUpdated}
          />
        )}

        <WeeklyMealPlanner
          plan={mealPlan}
          onRemoveSlot={handleRemoveFromMealPlan}
          onClear={handleClearMealPlan}
          onSelectRecipe={handleSelectSaved}
        />

        <FavoriteRecipes
          recipes={favoriteRecipes}
          onRemove={handleRemoveFavorite}
          onSelect={handleSelectSaved}
        />

        <SavedRecipes
          recipes={savedRecipes}
          onRemove={handleRemove}
          onSelect={handleSelectSaved}
        />
      </main>

      <footer className="app__footer">
        <p>{t('footer')}</p>
      </footer>
    </div>
  )
}
