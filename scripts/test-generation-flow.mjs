/**
 * Generated recipe flow tests — no community recipes.
 * Run: npx vite-node scripts/test-generation-flow.mjs
 */
import { generateAppRecipe } from '../src/services/recipeService.js'
import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'
import { ingredientsIncludeCanon } from '../src/utils/recipeCookingEssentials.js'

const BASE = { cookingTime: 30, mood: 'cozy', isGlutenFree: false, musicPlatform: 'spotify' }

function assertCookingEssentials(recipe, label, { water = false, salt = false, oil = false } = {}) {
  const ingredients = recipe?.ingredients ?? []
  if (water && !ingredientsIncludeCanon(ingredients, 'water')) {
    throw new Error(`${label}: missing water/stock in ingredient list`)
  }
  if (salt && !ingredientsIncludeCanon(ingredients, 'salt')) {
    throw new Error(`${label}: missing salt in ingredient list`)
  }
  if (oil && !ingredientsIncludeCanon(ingredients, 'oil')) {
    throw new Error(`${label}: missing oil in ingredient list`)
  }
}

function assertNeverBoth(result, label) {
  const hasRecipe = Boolean(result.recipe?.name)
  const hasError = result.recipePossible === false
  if (hasRecipe && hasError) {
    throw new Error(`${label}: recipe and error both present`)
  }
  return { hasRecipe, hasError }
}

async function expectRecipe(label, params, options = {}) {
  const result = await generateAppRecipe({ ...BASE, ...params }, { language: 'he', ...options })
  assertNeverBoth(result, label)
  if (!result.recipe?.name || result.recipePossible === false) {
    throw new Error(
      `${label}: expected recipe, got error="${(result.impossibleReason ?? 'none').slice(0, 100)}"`,
    )
  }
  console.log('✅', label, '→', result.recipe.name)
  return result
}

async function expectFailure(label, params, pattern = /.+/i) {
  const result = await generateAppRecipe({ ...BASE, ...params }, { language: 'he' })
  assertNeverBoth(result, label)
  if (result.recipe?.name || result.recipePossible !== false) {
    throw new Error(`${label}: expected failure, got recipe="${result.recipe?.name ?? ''}"`)
  }
  if (!pattern.test(result.impossibleReason ?? '')) {
    throw new Error(`${label}: unexpected reason="${result.impossibleReason}"`)
  }
  console.log('✅', label, '→ blocked as expected')
  return result
}

await expectRecipe('ingredients + any category', {
  category: 'any',
  recipeType: 'meal',
  ingredients: 'עגבניה, ביצה, בצל',
})

const eggTomato = await expectRecipe('egg + tomato', {
  category: 'parve',
  recipeType: 'meal',
  ingredients: 'עגבניה, ביצה',
})

await expectRecipe('dairy + egg + tomato', {
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'עגבניה, ביצה',
})

const carrotFlour = await expectRecipe('dessert carrot + flour', {
  category: 'any',
  recipeType: 'dessert',
  ingredients: 'גזר, קמח',
})

await expectRecipe('tomato + rice stew', {
  category: 'meat',
  recipeType: 'meal',
  ingredients: 'עגבניה, אורז',
})

assertCookingEssentials(eggTomato.recipe, 'egg + tomato shakshuka', {
  oil: true,
  salt: true,
})

const tomatoRice = await generateAppRecipe(
  { ...BASE, category: 'parve', recipeType: 'meal', ingredients: 'עגבניה, אורז' },
  { language: 'he' },
)
if (!tomatoRice.recipe?.name) throw new Error('tomato + rice: expected recipe')
assertCookingEssentials(tomatoRice.recipe, 'tomato + rice', { water: true, salt: true, oil: true })
console.log('✅ tomato + rice cooking essentials →', tomatoRice.recipe.name)

const dairyFirst = await expectRecipe('regenerate — first dairy meal', {
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'עגבניה, ביצה',
})

const dairySecond = await expectRecipe(
  'regenerate — second dairy meal',
  {
    category: 'dairy',
    recipeType: 'meal',
    ingredients: 'עגבניה, ביצה',
  },
  {
    excludeTemplateKeys: dairyFirst.recipe?.templateKey ? [dairyFirst.recipe.templateKey] : [],
    excludeTitles: dairyFirst.recipe?.name ? [dairyFirst.recipe.name] : [],
    excludeCookingMethods: dairyFirst.recipe?.name ? ['poached'] : [],
  },
)

if (
  dairySecond.recipe.name === dairyFirst.recipe.name &&
  dairySecond.recipe.templateKey === dairyFirst.recipe.templateKey
) {
  throw new Error('regenerate returned identical recipe')
}

await expectFailure(
  'vegan + chicken blocked',
  { category: 'vegan', recipeType: 'meal', ingredients: 'עוף, אורז' },
  /טבעוני|עוף|מהחי|vegan|chicken|animal/i,
)

// Direct mock builder accepts tomato+egg with relaxed validation
const mock = buildValidatedMockRecipe({
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'עגבניה, ביצה',
  cookingTime: 30,
  mood: 'cozy',
  language: 'he',
})
if (!mock?.name) {
  throw new Error('buildValidatedMockRecipe returned null for dairy tomato+egg')
}
if (!/שקשוק|חבית|ביצ|עגבנ/i.test(mock.name)) {
  console.warn('⚠️ dairy tomato+egg title:', mock.name)
}

await expectRecipe('potato + onion meal', {
  category: 'parve',
  recipeType: 'meal',
  ingredients: 'תפוח אדמה, בצל',
})

await expectRecipe('tuna + corn meal', {
  category: 'parve',
  recipeType: 'meal',
  ingredients: 'טונה, תירס',
})

await expectRecipe('mushroom + cream meal', {
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'פטריות, שמנת',
})

await expectRecipe('no ingredients dairy meal', {
  category: 'dairy',
  recipeType: 'meal',
  ingredients: '',
})

await expectRecipe('no ingredients dessert', {
  category: 'dairy',
  recipeType: 'dessert',
  ingredients: '',
})

if (!/עוגת|מאפינס|עוגה|פנקייק|כיכר/i.test(carrotFlour.recipe.name)) {
  console.warn('⚠️ carrot+flour dessert title:', carrotFlour.recipe.name)
}
if (/עם\s+(בצל|תירס|שמנת)$/i.test(carrotFlour.recipe.name)) {
  throw new Error('carrot+flour returned ingredient-template title')
}

console.log('\nAll generation flow tests passed')
