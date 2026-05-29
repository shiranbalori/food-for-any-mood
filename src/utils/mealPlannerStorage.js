const STORAGE_KEY = 'food-for-any-mood-meal-plan'
const STORAGE_VERSION = 1

export const WEEK_DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

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

export function createEmptyMealPlan() {
  return Object.fromEntries(
    WEEK_DAYS.map((day) => [
      day,
      Object.fromEntries(MEAL_TYPES.map((meal) => [meal, null])),
    ]),
  )
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyMealPlan()

    const parsed = JSON.parse(raw)
    const plan = parsed?.plan
    if (!plan || typeof plan !== 'object') return createEmptyMealPlan()

    const empty = createEmptyMealPlan()
    for (const day of WEEK_DAYS) {
      for (const meal of MEAL_TYPES) {
        const entry = plan?.[day]?.[meal]
        if (entry?.recipe && isValidRecipe(entry.recipe)) {
          empty[day][meal] = {
            recipe: entry.recipe,
            addedAt: entry.addedAt ?? null,
          }
        }
      }
    }
    return empty
  } catch {
    return createEmptyMealPlan()
  }
}

function persistPlan(plan) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, plan }),
    )
    return true
  } catch {
    return false
  }
}

export function getMealPlan() {
  return readStore()
}

export function addRecipeToMealPlan(day, mealType, recipe) {
  if (!WEEK_DAYS.includes(day) || !MEAL_TYPES.includes(mealType) || !isValidRecipe(recipe)) {
    return getMealPlan()
  }

  const plan = readStore()
  plan[day][mealType] = {
    recipe: { ...recipe },
    addedAt: new Date().toISOString(),
  }
  persistPlan(plan)
  return plan
}

export function removeRecipeFromMealPlan(day, mealType) {
  if (!WEEK_DAYS.includes(day) || !MEAL_TYPES.includes(mealType)) {
    return getMealPlan()
  }

  const plan = readStore()
  plan[day][mealType] = null
  persistPlan(plan)
  return plan
}

export function clearMealPlan() {
  const plan = createEmptyMealPlan()
  persistPlan(plan)
  return plan
}

export function countPlannedMeals(plan) {
  let count = 0
  for (const day of WEEK_DAYS) {
    for (const meal of MEAL_TYPES) {
      if (plan?.[day]?.[meal]?.recipe) count += 1
    }
  }
  return count
}

export function planHasAnyMeals(plan) {
  return countPlannedMeals(plan) > 0
}
