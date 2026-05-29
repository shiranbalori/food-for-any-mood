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
import { useLanguage } from './i18n/useLanguage'
import { getTheme } from './utils/themes'
import { generateAppRecipe } from './services/recipeService'
// Recipe source: FastAPI backend (default) — see .env.example
import {
  getSavedRecipes,
  saveRecipe,
  removeRecipe,
} from './utils/storage'
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
  const [usedTemplateKeys, setUsedTemplateKeys] = useState([])
  const [saveError, setSaveError] = useState(false)
  const [backendNotice, setBackendNotice] = useState(null)

  const theme = getTheme(category)
  const isSaved = recipe ? savedRecipes.some((r) => r.id === recipe.id) : false

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleGenerate = useCallback(
    async (options = {}) => {
      const { excludeKeys = [], regenerate = false } = options
      setLoading(true)
      setRecipe(null)
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
        setBackendNotice('unreachable')
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

  const handleRegenerate = () => {
    handleGenerate({ excludeKeys: usedTemplateKeys, regenerate: true })
  }

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

        {backendNotice && !loading && (
          <p className="app__backend-notice" role="status">
            {backendNotice === 'gemini'
              ? t('backendGeminiError')
              : t('backendUnreachable')}
          </p>
        )}

        {recipe && !loading && (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            musicPlatform={form.musicPlatform}
            theme={getTheme(recipe.category)}
            isSaved={isSaved}
            saveError={saveError}
            onSave={handleSave}
            onRegenerate={handleRegenerate}
          />
        )}

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
