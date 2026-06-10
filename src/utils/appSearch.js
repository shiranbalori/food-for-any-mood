import { MEAL_TYPES, WEEK_DAYS } from './mealPlannerStorage'

/** Panel ids — must match MY_AREA_PANELS in MyAreaDrawer.jsx */
const PANEL = {
  weekly: 'weekly',
  saved: 'saved',
  favorites: 'favorites',
  community: 'community',
  myRecipes: 'myRecipes',
  themedMeals: 'themedMeals',
  story: 'story',
}

/**
 * @typedef {'private' | 'saved' | 'favorite' | 'community' | 'mealPlan'} RecipeSource
 * @typedef {'recipe' | 'section'} SearchResultType
 *
 * @typedef {Object} AppSearchRecipeResult
 * @property {SearchResultType} type
 * @property {string} id
 * @property {string} title
 * @property {string} [subtitle]
 * @property {RecipeSource} source
 * @property {object} recipe
 *
 * @typedef {Object} AppSearchSectionResult
 * @property {SearchResultType} type
 * @property {string} id
 * @property {string} title
 * @property {string} icon
 * @property {string} panelId
 *
 * @typedef {Object} AppSearchResults
 * @property {AppSearchRecipeResult[]} recipes
 * @property {AppSearchSectionResult[]} sections
 */

export function normalizeSearchText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
}

function joinSearchParts(parts) {
  return normalizeSearchText(parts.filter(Boolean).join(' '))
}

function matchesQuery(haystack, query) {
  if (!query) return false
  return haystack.includes(query)
}

function recipeHaystack(recipe, extra = '') {
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.join(' ')
    : String(recipe.ingredients ?? '')
  const steps = Array.isArray(recipe.steps) ? recipe.steps.join(' ') : String(recipe.steps ?? '')

  return joinSearchParts([
    recipe.name ?? recipe.title,
    recipe.description,
    ingredients,
    steps,
    recipe.category,
    recipe.recipeType,
    extra,
  ])
}

/**
 * @param {ReturnType<typeof buildAppSections>} sections
 * @param {string} query
 */
function searchSections(sections, query) {
  return sections.filter((section) => matchesQuery(section.haystack, query))
}

export function buildAppSections(t) {
  return [
    {
      id: 'section-weekly',
      panelId: PANEL.weekly,
      icon: '📅',
      title: t('myAreaNavWeekly'),
      haystack: normalizeSearchText(t('myAreaNavWeekly')),
    },
    {
      id: 'section-saved',
      panelId: PANEL.saved,
      icon: '📌',
      title: t('myAreaNavSaved'),
      haystack: normalizeSearchText(t('myAreaNavSaved')),
    },
    {
      id: 'section-favorites',
      panelId: PANEL.favorites,
      icon: '❤️',
      title: t('myAreaNavFavorites'),
      haystack: normalizeSearchText(t('myAreaNavFavorites')),
    },
    {
      id: 'section-community',
      panelId: PANEL.community,
      icon: '👥',
      title: t('myAreaNavCommunity'),
      haystack: normalizeSearchText(t('myAreaNavCommunity')),
    },
    {
      id: 'section-myRecipes',
      panelId: PANEL.myRecipes,
      icon: '📒',
      title: t('myAreaNavMyRecipes'),
      haystack: normalizeSearchText(t('myAreaNavMyRecipes')),
    },
    {
      id: 'section-themedMeals',
      panelId: PANEL.themedMeals,
      icon: '🍽️',
      title: t('myAreaNavThemedMeals'),
      haystack: normalizeSearchText(`${t('myAreaNavThemedMeals')} ${t('themedMealsIntro')}`),
    },
    {
      id: 'section-story',
      panelId: PANEL.story,
      icon: '✨',
      title: t('myAreaNavStory'),
      haystack: normalizeSearchText(`${t('myAreaNavStory')} ${t('ourStoryTitle')}`),
    },
  ]
}

/**
 * @param {Object} options
 * @param {Function} options.t
 * @param {object[]} [options.savedRecipes]
 * @param {object[]} [options.favoriteRecipes]
 * @param {object} [options.mealPlan]
 * @param {object[]} [options.privateRecipes]
 * @param {object[]} [options.communityRecipes]
 */
export function buildAppSearchIndex({
  t,
  savedRecipes = [],
  favoriteRecipes = [],
  mealPlan = {},
  privateRecipes = [],
  communityRecipes = [],
}) {
  const sections = buildAppSections(t)
  /** @type {AppSearchRecipeResult[]} */
  const recipes = []

  for (const recipe of savedRecipes) {
    recipes.push({
      type: 'recipe',
      id: `saved-${recipe.id}`,
      title: recipe.name,
      subtitle: t('myAreaSearchSourceSaved'),
      source: 'saved',
      recipe,
      haystack: recipeHaystack(recipe, t('myAreaSearchSourceSaved')),
    })
  }

  for (const recipe of favoriteRecipes) {
    recipes.push({
      type: 'recipe',
      id: `favorite-${recipe.id}`,
      title: recipe.name,
      subtitle: t('myAreaSearchSourceFavorite'),
      source: 'favorite',
      recipe,
      haystack: recipeHaystack(recipe, t('myAreaSearchSourceFavorite')),
    })
  }

  for (const day of WEEK_DAYS) {
    for (const meal of MEAL_TYPES) {
      const entry = mealPlan?.[day]?.[meal]
      if (!entry?.recipe) continue
      const recipe = entry.recipe
      const slotLabel = `${t(`weekDays.${day}`)} · ${t(`mealTypes.${meal}`)}`
      recipes.push({
        type: 'recipe',
        id: `meal-${day}-${meal}-${recipe.id}`,
        title: recipe.name,
        subtitle: `${t('myAreaSearchSourceMealPlan')} · ${slotLabel}`,
        source: 'mealPlan',
        recipe,
        haystack: recipeHaystack(recipe, `${slotLabel} ${t('myAreaSearchSourceMealPlan')}`),
      })
    }
  }

  for (const recipe of privateRecipes) {
    const mapped = mapPrivateRecipeForDisplay(recipe)
    recipes.push({
      type: 'recipe',
      id: `private-${recipe.id}`,
      title: recipe.title,
      subtitle: t('myAreaSearchSourcePrivate'),
      source: 'private',
      recipe: mapped,
      privateRecipe: recipe,
      haystack: recipeHaystack(
        {
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          category: recipe.category,
          recipeType: recipe.recipeType,
        },
        `${t('myAreaSearchSourcePrivate')} ${t(`categories.${recipe.category}`)} ${t(`recipeTypes.${recipe.recipeType}`)}`,
      ),
    })
  }

  for (const recipe of communityRecipes) {
    const mapped = mapCommunityRecipeForDisplay(recipe)
    recipes.push({
      type: 'recipe',
      id: `community-${recipe.id}`,
      title: recipe.title,
      subtitle: t('myAreaSearchSourceCommunity'),
      source: 'community',
      recipe: mapped,
      communityRecipe: recipe,
      haystack: recipeHaystack(
        {
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          category: recipe.category,
          recipeType: recipe.recipeType,
        },
        `${t('myAreaSearchSourceCommunity')} ${t(`categories.${recipe.category}`)} ${t(`recipeTypes.${recipe.recipeType}`)}`,
      ),
    })
  }

  return { sections, recipes }
}

/**
 * @param {string} query
 * @param {ReturnType<typeof buildAppSearchIndex>} index
 * @returns {AppSearchResults}
 */
export function searchAppIndex(query, index) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return { recipes: [], sections: [] }
  }

  const recipes = index.recipes.filter((item) => matchesQuery(item.haystack, normalizedQuery))
  const sections = searchSections(index.sections, normalizedQuery).map((section) => ({
    type: 'section',
    id: section.id,
    title: section.title,
    icon: section.icon,
    panelId: section.panelId,
  }))

  return { recipes, sections }
}

export function mapPrivateRecipeForDisplay(privateRecipe) {
  const category = privateRecipe.category === 'any' ? 'parve' : privateRecipe.category
  return {
    id: `private-view-${privateRecipe.id}`,
    name: privateRecipe.title,
    description: privateRecipe.description ?? '',
    ingredients: privateRecipe.ingredients ?? [],
    steps: privateRecipe.steps ?? [],
    category,
    mood: 'cozy',
    time: privateRecipe.cookingTime ?? 30,
    glutenFree: false,
    musicPlatform: 'spotify',
    matchPercent: 100,
    cookTime: privateRecipe.cookingTime ?? 30,
    servings: privateRecipe.servings ?? 4,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    healthScore: 70,
    spiceLevel: privateRecipe.recipeType === 'dessert' ? 0 : 1,
    tags: [],
    playlist: {
      id: 'search-placeholder',
      name: privateRecipe.title,
      description: '',
      energy: 'medium',
      energyLabel: '—',
      platform: 'spotify',
      url: 'https://open.spotify.com',
      matchPercent: 0,
    },
  }
}

export function mapCommunityRecipeForDisplay(communityRecipe) {
  return {
    id: communityRecipe.id,
    name: communityRecipe.title,
    description: communityRecipe.description ?? '',
    ingredients: communityRecipe.ingredients ?? [],
    steps: communityRecipe.steps ?? [],
    category: communityRecipe.category ?? 'parve',
    mood: 'cozy',
    time: 30,
    glutenFree: communityRecipe.isGlutenFree ?? false,
    musicPlatform: 'spotify',
    matchPercent: 100,
    cookTime: 30,
    servings: 4,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    healthScore: 70,
    spiceLevel: communityRecipe.recipeType === 'dessert' ? 0 : 1,
    tags: [],
    playlist: {
      id: 'search-placeholder',
      name: communityRecipe.title,
      description: '',
      energy: 'medium',
      energyLabel: '—',
      platform: 'spotify',
      url: 'https://open.spotify.com',
      matchPercent: 0,
    },
  }
}
