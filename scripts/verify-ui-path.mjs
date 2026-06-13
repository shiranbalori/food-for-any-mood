/**
 * Verifies generateAppRecipe (real UI path: backend + mock fallback).
 */
import { generateAppRecipe } from '../src/services/recipeService.js'

const CASES = [
  { label: 'dairy', category: 'dairy', ingredients: 'קמח, גבינה, חלב' },
  { label: 'meat', category: 'meat', ingredients: 'בשר טחון, תפוחי אדמה, בצל' },
  { label: 'vegan', category: 'vegan', ingredients: 'עדשים, גזר, בצל' },
  { label: 'any', category: 'any', ingredients: 'לימון, סוכר, קמח' },
]

let passed = 0
for (const c of CASES) {
  const result = await generateAppRecipe(
    {
      category: c.category,
      ingredients: c.ingredients,
      cookingTime: 30,
      mood: 'cozy',
      isGlutenFree: false,
      musicPlatform: 'spotify',
      servings: 4,
      recipeType: 'meal',
    },
    { language: 'he', pantrySuffix: 'מזווה' },
  )
  const ok = result.recipePossible !== false && result.recipe?.name
  console.log(
    ok ? '✅' : '❌',
    c.label,
    ok ? result.recipe.name : result.impossibleReason,
    ok ? `(fallback=${result.fallbackReason ?? 'none'})` : '',
  )
  if (ok) passed += 1
}
console.log(`\n${passed}/${CASES.length} via generateAppRecipe (UI path)`)
process.exit(passed === CASES.length ? 0 : 1)
