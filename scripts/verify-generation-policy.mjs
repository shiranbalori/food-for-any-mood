process.env.VITE_RECIPE_PROVIDER = process.env.VITE_RECIPE_PROVIDER || 'mock'

const { generateAppRecipe } = await import('../src/services/recipeService.js')

const BASE = { cookingTime: 30, mood: 'cozy' }

async function runCase(label, params, options = {}) {
  const result = await generateAppRecipe({ ...BASE, ...params }, { language: 'he', ...options })
  const conflict = result.recipePossible === false && Boolean(result.recipe)
  const ok = result.recipePossible !== false && Boolean(result.recipe?.name) && !conflict
  console.log(
    ok ? '✅' : '❌',
    label,
    ok
      ? result.recipe.name
      : (result.impossibleReason ?? 'no recipe').slice(0, 120),
    conflict ? '[CONFLICT]' : '',
  )
  return { ok, result, conflict, label, params }
}

async function runRegenerateCase(label, params, first) {
  const second = await runCase(
    label,
    params,
    {
      excludeTemplateKeys: first.result?.recipe?.templateKey ? [first.result.recipe.templateKey] : [],
      excludeTitles: first.result?.recipe?.name ? [first.result.recipe.name] : [],
    },
  )
  const different =
    second.ok &&
    first.result?.recipe?.templateKey &&
    second.result?.recipe?.templateKey &&
    second.result.recipe.templateKey !== first.result.recipe.templateKey
  const differentTitle =
    second.ok &&
    first.result?.recipe?.name &&
    second.result?.recipe?.name &&
    second.result.recipe.name !== first.result.recipe.name
  if (second.ok && !different && !differentTitle) {
    console.log('   ⚠️ regenerate returned same recipe')
    return { ok: false, result: second.result, conflict: second.conflict, label }
  }
  return { ok: second.ok, result: second.result, conflict: second.conflict, label }
}

const cases = []

cases.push(
  await runCase('default path: meal + any + flour/cheese/milk', {
    category: 'any',
    recipeType: 'meal',
    ingredients: 'קמח, גבינה, חלב',
  }),
)

const eggTomatoFirst = await runCase('meal + dairy + tomato/egg (first)', {
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'עגבניה, ביצה',
})

cases.push(eggTomatoFirst)

cases.push(
  await runRegenerateCase('meal + dairy + tomato/egg regenerate', {
    category: 'dairy',
    recipeType: 'meal',
    ingredients: 'עגבניה, ביצה',
  }, eggTomatoFirst),
)

cases.push(
  await runCase('meal + dairy + flour/tomato', {
    category: 'dairy',
    recipeType: 'meal',
    ingredients: 'קמח, עגבניה',
  }),
)

const meatRiceFirst = await runCase('meal + meat + tomato/rice', {
  category: 'meat',
  recipeType: 'meal',
  ingredients: 'עגבניה, אורז',
})

cases.push(meatRiceFirst)

cases.push(
  await runRegenerateCase('meal + meat + tomato/rice regenerate', {
    category: 'meat',
    recipeType: 'meal',
    ingredients: 'עגבניה, אורז',
  }, meatRiceFirst),
)

const carrotDessert = await runCase('dessert + any + carrot/flour', {
  category: 'any',
  recipeType: 'dessert',
  ingredients: 'גזר, קמח',
})

cases.push(carrotDessert)

cases.push(
  await runRegenerateCase('dessert + carrot/flour regenerate', {
    category: 'any',
    recipeType: 'dessert',
    ingredients: 'גזר, קמח',
  }, carrotDessert),
)

const dessert = await runCase('dessert + dairy + flour/cheese/milk', {
  category: 'dairy',
  recipeType: 'dessert',
  ingredients: 'קמח, גבינה, חלב',
})

cases.push(dessert)

cases.push(
  await runCase('soup/stew + vegan + lentils/tomato', {
    category: 'vegan',
    recipeType: 'soup_stew',
    ingredients: 'עדשים, עגבניה',
  }),
)

cases.push(
  await runCase('parve + tomato/rice', {
    category: 'parve',
    recipeType: 'meal',
    ingredients: 'עגבניה, אורז',
  }),
)

const veganConflict = await runCase('vegan + chicken (should fail)', {
  category: 'vegan',
  recipeType: 'meal',
  ingredients: 'עוף, אורז',
})

cases.push({
  ok: !veganConflict.ok && /טבעוני|עוף|מהחי/i.test(veganConflict.result?.impossibleReason ?? ''),
  result: veganConflict.result,
  conflict: veganConflict.conflict,
  label: 'vegan + chicken clear message',
})

const mealFirst = await runCase('meal + dairy + flour/cheese/milk', {
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'קמח, גבינה, חלב',
})

cases.push(
  await runRegenerateCase('meal regenerate', {
    category: 'dairy',
    recipeType: 'meal',
    ingredients: 'קמח, גבינה, חלב',
  }, mealFirst),
)

cases.push(
  await runRegenerateCase('dessert regenerate', {
    category: 'dairy',
    recipeType: 'dessert',
    ingredients: 'קמח, גבינה, חלב',
  }, dessert),
)

const soup = await runCase('soup/stew base', {
  category: 'vegan',
  recipeType: 'soup_stew',
  ingredients: 'עדשים, עגבניה',
})

cases.push(
  await runRegenerateCase('soup/stew regenerate', {
    category: 'vegan',
    recipeType: 'soup_stew',
    ingredients: 'עדשים, עגבניה',
  }, soup),
)

const passed = cases.filter((c) => c.ok).length
const conflicts = cases.some((c) => c.conflict)
console.log(`\n${passed}/${cases.length} passed${conflicts ? ' (conflicts detected!)' : ''}`)
process.exit(passed === cases.length && !conflicts ? 0 : 1)
