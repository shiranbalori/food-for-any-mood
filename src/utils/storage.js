const STORAGE_KEY = 'food-for-any-mood-recipes'
const STORAGE_VERSION = 1

// ---------------------------------------------------------------------------
// Community recipe saves (separate key — does not touch generated recipes)
// ---------------------------------------------------------------------------
const COMMUNITY_SAVES_KEY = 'food-for-any-mood-community-saves'
const COMMUNITY_SAVE_COUNTS_KEY = 'food-for-any-mood-community-save-counts'

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

// ---------------------------------------------------------------------------
// Community recipe save helpers
// ---------------------------------------------------------------------------

function readCommunityList() {
  try {
    const raw = localStorage.getItem(COMMUNITY_SAVES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCommunityList(list) {
  try {
    localStorage.setItem(COMMUNITY_SAVES_KEY, JSON.stringify(list))
    return list
  } catch {
    return readCommunityList()
  }
}

function readCommunitySaveCounts() {
  try {
    const raw = localStorage.getItem(COMMUNITY_SAVE_COUNTS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCommunitySaveCounts(counts) {
  try {
    localStorage.setItem(COMMUNITY_SAVE_COUNTS_KEY, JSON.stringify(counts))
  } catch {
    // ignore storage errors
  }
}

function adjustCommunitySaveCount(recipeId, delta) {
  const counts = readCommunitySaveCounts()
  const next = Math.max(0, (counts[recipeId] ?? 0) + delta)
  if (next === 0) {
    delete counts[recipeId]
  } else {
    counts[recipeId] = next
  }
  writeCommunitySaveCounts(counts)
  return next
}

export function getCommunitySaveCount(recipeId) {
  const counts = readCommunitySaveCounts()
  if (counts[recipeId] != null) return counts[recipeId]
  return readCommunityList().some((r) => r.id === recipeId) ? 1 : 0
}

export function isCommunityRecipeSaved(recipeId) {
  return readCommunityList().some((r) => r.id === recipeId)
}

export function enrichCommunityRecipeSaveCount(recipe) {
  return {
    ...recipe,
    savesCount: getCommunitySaveCount(recipe.id),
  }
}

export function getSavedCommunityRecipes() {
  return readCommunityList()
}

/**
 * Persist a saved community recipe for display in Saved Recipes.
 * Stores only the fields needed for the saved card — not the full recipe object.
 */
export function saveCommunityRecipe(recipe) {
  const list = readCommunityList()
  if (list.some((r) => r.id === recipe.id)) return list
  const entry = {
    id: recipe.id,
    isCommunity: true,
    title: recipe.title,
    category: recipe.category ?? 'parve',
    authorId: recipe.authorId ?? null,
    authorName: recipe.authorName ?? null,
    description: recipe.description ?? '',
    isGlutenFree: recipe.isGlutenFree ?? false,
    imageUrl: recipe.imageUrl ?? null,
    recipeType: recipe.recipeType ?? 'meal',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    savedAt: new Date().toISOString(),
  }
  adjustCommunitySaveCount(recipe.id, 1)
  return writeCommunityList([entry, ...list])
}

export function removeSavedCommunityRecipe(recipeId) {
  const hadEntry = readCommunityList().some((r) => r.id === recipeId)
  const next = writeCommunityList(readCommunityList().filter((r) => r.id !== recipeId))
  if (hadEntry) {
    adjustCommunitySaveCount(recipeId, -1)
  }
  return next
}

export function refreshOwnCommunityAuthorInStorage(userId, authorName) {
  const list = readCommunityList().map((entry) =>
    entry.authorId === userId ? { ...entry, authorName } : entry,
  )
  return writeCommunityList(list)
}
