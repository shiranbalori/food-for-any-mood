/**
 * Show 20 generated recipe examples for quality review.
 * Run: npx vite-node scripts/show-dish-examples.mjs
 */
import { generateAppRecipe } from '../src/services/recipeService.js'
import { isLiteralIngredientTitle } from '../src/utils/recipeTitle.js'
import { validateGeneratedRecipeRealism } from '../src/utils/recipeRealismValidation.js'

const BASE = { cookingTime: 30, mood: 'cozy', isGlutenFree: false, musicPlatform: 'spotify' }

const CASES = [
  { label: 'no ingredients + dairy', params: { category: 'dairy', recipeType: 'meal', ingredients: '' } },
  { label: 'no ingredients + dessert', params: { category: 'dairy', recipeType: 'dessert', ingredients: '' } },
  { label: 'tomato + egg (parve)', params: { category: 'parve', recipeType: 'meal', ingredients: 'עגבניה, ביצה' } },
  { label: 'tomato + egg (dairy)', params: { category: 'dairy', recipeType: 'meal', ingredients: 'עגבניה, ביצה' } },
  { label: 'carrot + flour dessert', params: { category: 'dairy', recipeType: 'dessert', ingredients: 'גזר, קמח' } },
  { label: 'potato + onion', params: { category: 'parve', recipeType: 'meal', ingredients: 'תפוח אדמה, בצל' } },
  { label: 'tuna + corn', params: { category: 'parve', recipeType: 'meal', ingredients: 'טונה, תירס' } },
  { label: 'mushroom + cream', params: { category: 'dairy', recipeType: 'meal', ingredients: 'פטריות, שמנת' } },
  { label: 'vegan chickpea', params: { category: 'vegan', recipeType: 'meal', ingredients: 'חומוס' } },
  { label: 'lentil soup veg', params: { category: 'vegan', recipeType: 'soup_stew', ingredients: 'עדשים, גזר, בצל' } },
  { label: 'tomato + rice', params: { category: 'parve', recipeType: 'meal', ingredients: 'עגבניה, אורז' } },
  { label: 'flour + cheese + milk', params: { category: 'dairy', recipeType: 'meal', ingredients: 'קמח, גבינה, חלב' } },
  { label: 'banana + flour dessert', params: { category: 'dairy', recipeType: 'dessert', ingredients: 'בננה, קמח' } },
  { label: 'chicken + rice', params: { category: 'meat', recipeType: 'meal', ingredients: 'עוף, אורז' } },
  { label: 'tomato + rice meat', params: { category: 'meat', recipeType: 'meal', ingredients: 'עגבניה, אורז, עוף' } },
  { label: 'egg omelette spinach', params: { category: 'parve', recipeType: 'meal', ingredients: 'ביצה, תרד' } },
  { label: 'pasta + tomato', params: { category: 'parve', recipeType: 'meal', ingredients: 'פסטה, עגבניה' } },
  { label: 'no ingredients + parve meal', params: { category: 'parve', recipeType: 'meal', ingredients: '' } },
  { label: 'no ingredients + soup', params: { category: 'parve', recipeType: 'soup_stew', ingredients: '' } },
  { label: 'carrot + flour parve dessert attempt', params: { category: 'parve', recipeType: 'dessert', ingredients: 'גזר, קמח' } },
]

console.log('Generated recipe examples (20 cases)\n')

const results = []
let ok = 0
let fail = 0

for (const { label, params } of CASES) {
  const result = await generateAppRecipe({ ...BASE, ...params }, { language: 'he' })
  const recipe = result.recipe
  const userIngs = String(params.ingredients ?? '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (!recipe?.name || result.recipePossible === false) {
    fail++
    results.push({ label, title: null, error: (result.impossibleReason ?? 'no recipe').slice(0, 80) })
    console.log(`❌ ${label}`)
    console.log(`   ERROR: ${(result.impossibleReason ?? 'no recipe').slice(0, 120)}`)
    console.log('')
    continue
  }

  const realism = validateGeneratedRecipeRealism(recipe, userIngs, { language: 'he' })
  const literal = isLiteralIngredientTitle(recipe.name, userIngs, 'he')
  const status = realism.ok && !literal ? '✅' : '⚠️'
  if (realism.ok && !literal) ok++
  else fail++

  results.push({ label, title: recipe.name, status, step: (recipe.steps ?? [])[0] ?? '' })

  console.log(`${status} ${label}`)
  console.log(`   Title: ${recipe.name}`)
  console.log(`   Ingredients: ${(recipe.ingredients ?? []).slice(0, 4).join(' | ')}${recipe.ingredients?.length > 4 ? ' …' : ''}`)
  console.log(`   Step 1: ${(recipe.steps ?? [])[0] ?? ''}`)
  if (!realism.ok) console.log(`   Realism: ${realism.failures.join(', ')}`)
  if (literal) console.log(`   Literal title detected`)
  console.log('')
}

console.log(`Summary: ${ok} good / ${fail} weak or failed out of ${CASES.length}\n`)
console.log('Quick reference:')
results.forEach((row, index) => {
  console.log(`${String(index + 1).padStart(2, '0')}. ${row.label} → ${row.title ?? `ERROR: ${row.error}`}`)
})
