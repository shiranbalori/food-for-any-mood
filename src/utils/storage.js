const STORAGE_KEY = 'food-for-any-mood-recipes'
const STORAGE_VERSION = 1

function isValidRecipe(recipe) {
  return (
    recipe &&
    typeof recipe.id === 'string' &&
    typeof recipe.name === 'string' &&
    typeof recipe.category === 'string' &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 &&
    Array.isArray(recipe.steps) &&
    recipe.steps.length > 0
  )
}

function persistRecipes(recipes) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, recipes }),
    )
    return { ok: true, recipes }
  } catch {
    return { ok: false, recipes }
  }
}

export function getSavedRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : parsed.recipes
    if (!Array.isArray(list)) return []

    return list.filter(isValidRecipe)
  } catch {
    return []
  }
}

export function saveRecipe(recipe) {
  if (!isValidRecipe(recipe)) return getSavedRecipes()

  const saved = getSavedRecipes()
  if (saved.some((r) => r.id === recipe.id)) return saved

  const entry = { ...recipe, savedAt: new Date().toISOString() }
  const updated = [entry, ...saved]
  const result = persistRecipes(updated)
  return result.ok ? result.recipes : saved
}

export function removeRecipe(recipeId) {
  const updated = getSavedRecipes().filter((r) => r.id !== recipeId)
  const result = persistRecipes(updated)
  return result.ok ? result.recipes : getSavedRecipes()
}
