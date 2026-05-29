const FAVORITES_KEY = 'food-for-any-mood-favorites'
const FAVORITES_VERSION = 1

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

function persistFavorites(recipes) {
  try {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify({ version: FAVORITES_VERSION, recipes }),
    )
    return { ok: true, recipes }
  } catch {
    return { ok: false, recipes }
  }
}

export function getFavoriteRecipes() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : parsed.recipes
    if (!Array.isArray(list)) return []

    return list.filter(isValidRecipe)
  } catch {
    return []
  }
}

export function addFavoriteRecipe(recipe) {
  if (!isValidRecipe(recipe)) return getFavoriteRecipes()

  const favorites = getFavoriteRecipes()
  if (favorites.some((r) => r.id === recipe.id)) return favorites

  const entry = { ...recipe, savedAt: new Date().toISOString() }
  const updated = [entry, ...favorites]
  const result = persistFavorites(updated)
  return result.ok ? result.recipes : favorites
}

export function removeFavoriteRecipe(recipeId) {
  const updated = getFavoriteRecipes().filter((r) => r.id !== recipeId)
  const result = persistFavorites(updated)
  return result.ok ? result.recipes : getFavoriteRecipes()
}
