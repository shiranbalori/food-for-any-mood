import { canonicalIngredient } from '../data/ingredientKnowledge'
import { RECIPE_TAGS } from '../data/recipeStyles'

const MEAT_FISH_CANON = new Set([
  'chicken', 'beef', 'meat', 'fish', 'salmon', 'tuna', 'turkey', 'lamb', 'pork', 'steak', 'ground beef',
])

const DAIRY_EGG_CANON = new Set([
  'milk', 'egg', 'eggs', 'cheese', 'butter', 'cream', 'yogurt', 'ricotta', 'parmesan', 'feta',
])

const HONEY_CANON = new Set(['honey'])

const GLUTEN_CANON = new Set(['flour', 'pasta', 'bread', 'wheat', 'noodles', 'tortilla'])

const SPICY_CANON = new Set(['chili', 'pepper flakes', 'hot sauce', 'curry powder'])

function ingredientCanons(recipe) {
  return (recipe.ingredients ?? [])
    .map((item) => canonicalIngredient(String(item)))
    .filter(Boolean)
}

/**
 * Derive dietary/classification tags from nutrition, ingredients, and context.
 */
export function deriveRecipeTags(
  recipe,
  {
    category = 'dairy',
    isGlutenFree = false,
    recipeType = 'meal',
    spiceLevel = 0,
    cookTime = 30,
  } = {},
) {
  const tags = new Set()
  const nutrition = recipe.nutrition ?? {}
  const calories = nutrition.calories ?? 0
  const protein = nutrition.protein ?? 0
  const fat = nutrition.fat ?? 0
  const sugar = nutrition.sugar ?? nutrition.sugars ?? 0
  const healthScore = recipe.healthScore ?? nutrition.healthScore ?? 50
  const canons = ingredientCanons(recipe)
  const hasMeatFish = canons.some((item) => MEAT_FISH_CANON.has(item))
  const hasDairyEgg = canons.some((item) => DAIRY_EGG_CANON.has(item))
  const hasHoney = canons.some((item) => HONEY_CANON.has(item))
  const hasGlutenIng = canons.some((item) => GLUTEN_CANON.has(item))
  const hasSpicyIng = canons.some((item) => SPICY_CANON.has(item))

  if (RECIPE_TAGS.vegetarian.categories.includes(category) && !hasMeatFish) {
    tags.add('vegetarian')
  }
  if (!hasMeatFish && !hasDairyEgg && !hasHoney) {
    tags.add('vegan')
  }
  if (isGlutenFree && !hasGlutenIng) {
    tags.add('glutenFree')
  }
  if (protein >= RECIPE_TAGS.highProtein.minProtein) {
    tags.add('highProtein')
  }
  if (cookTime <= RECIPE_TAGS.quick.maxTime) {
    tags.add('quick')
  }

  const isIndulgentDessert = recipeType === 'dessert' && calories > 420
  const isHighCalorie = calories > 520 || fat > 28

  if (
    !isIndulgentDessert &&
    healthScore >= RECIPE_TAGS.healthy.minHealthScore &&
    calories <= 550 &&
    fat <= 24 &&
    sugar <= 22
  ) {
    tags.add('healthy')
  }

  if (
    !isIndulgentDessert &&
    calories <= 420 &&
    fat <= 18 &&
    healthScore >= 70 &&
    sugar <= 18
  ) {
    tags.add('dietFriendly')
  }

  if (
    recipeType === 'meal' &&
    protein >= 28 &&
    calories <= 580 &&
    fat <= 22 &&
    sugar <= 25
  ) {
    tags.add('postWorkout')
  }

  if (
    spiceLevel === 0 &&
    !hasSpicyIng &&
    calories <= 650 &&
    recipeType !== 'dessert' &&
    sugar <= 20
  ) {
    tags.add('childFriendly')
  }

  if (isHighCalorie || healthScore < 62) {
    tags.add('comfortFood')
  }

  if (isIndulgentDessert) {
    tags.delete('healthy')
    tags.delete('dietFriendly')
    tags.delete('childFriendly')
    tags.delete('postWorkout')
  }

  if (spiceLevel >= 2 || hasSpicyIng) {
    tags.delete('childFriendly')
  }

  if (hasMeatFish) {
    tags.delete('vegetarian')
    tags.delete('vegan')
  } else if (hasDairyEgg || hasHoney) {
    tags.delete('vegan')
  }

  if (!isGlutenFree || hasGlutenIng) {
    tags.delete('glutenFree')
  }

  return [...tags]
}

/**
 * Ensure declared tags do not contradict derived facts.
 */
export function validateRecipeTags(recipe, derivedTags) {
  const derived = new Set(derivedTags)
  const guarded = new Set([
    'healthy',
    'dietFriendly',
    'childFriendly',
    'postWorkout',
    'vegetarian',
    'vegan',
    'glutenFree',
    'comfortFood',
    'highProtein',
  ])
  const invalid = (recipe.tags ?? []).filter((tag) => guarded.has(tag) && !derived.has(tag))
  return {
    ok: invalid.length === 0,
    invalid,
    derivedTags,
  }
}

export function applyDerivedRecipeTags(recipe, context = {}) {
  const derivedTags = deriveRecipeTags(recipe, context)
  return {
    ...recipe,
    tags: derivedTags,
  }
}
