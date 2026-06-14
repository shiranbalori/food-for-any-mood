import { generateAppRecipe } from '../src/services/recipeService.js'

const INGREDIENTS = 'קמח, גבינה, חלב'
const BASE = {
  category: 'dairy',
  ingredients: INGREDIENTS,
  cookingTime: 30,
  mood: 'cozy',
}

async function runCase(label, params, options = {}) {
  const result = await generateAppRecipe({ ...BASE, ...params }, { language: 'he', ...options })
  const conflict = result.recipePossible === false && Boolean(result.recipe)
  const ok = result.recipePossible !== false && Boolean(result.recipe?.name) && !conflict
  console.log(
    ok ? '✅' : '❌',
    label,
    ok
      ? `${result.recipe.name} (template=${result.recipe.templateKey}, fallback=${result.fallbackReason ?? 'none'})`
      : result.impossibleReason ?? 'no recipe',
    conflict ? '[CONFLICT: recipe + error]' : '',
  )
  return { ok, result, conflict }
}

const meal = await runCase('meal + dairy + flour/cheese/milk', { recipeType: 'meal' })
const dessert = await runCase('dessert + dairy + flour/cheese/milk', { recipeType: 'dessert' })

const regenerate = await runCase('dessert regenerate', { recipeType: 'dessert' }, {
  excludeTemplateKeys: dessert.result?.recipe?.templateKey ? [dessert.result.recipe.templateKey] : [],
  excludeTitles: dessert.result?.recipe?.name ? [dessert.result.recipe.name] : [],
})

const allOk = meal.ok && dessert.ok && regenerate.ok
const anyConflict = meal.conflict || dessert.conflict || regenerate.conflict
console.log('\nSummary:', allOk && !anyConflict ? 'ALL PASSED' : 'FAILED')
process.exit(allOk && !anyConflict ? 0 : 1)
