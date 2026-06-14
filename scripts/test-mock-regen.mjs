import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'

function test(label, params, options = {}) {
  const recipe = buildValidatedMockRecipe({ ...params, cookingTime: 30, mood: 'cozy', language: 'he', ...options })
  console.log(recipe ? 'OK' : 'NULL', label, recipe?.name ?? '', recipe?.templateKey ?? '')
  return recipe
}

const mealFirst = test('meal dairy flour/cheese/milk', {
  category: 'dairy', recipeType: 'meal', ingredients: 'קמח, גבינה, חלב',
})

test('meal regenerate', {
  category: 'dairy', recipeType: 'meal', ingredients: 'קמח, גבינה, חלב',
}, {
  excludeTemplateKeys: mealFirst?.templateKey ? [mealFirst.templateKey] : [],
  excludeTitles: mealFirst?.name ? [mealFirst.name] : [],
})

test('flour tomato dairy', {
  category: 'dairy', recipeType: 'meal', ingredients: 'קמח, עגבניה',
})

const soupFirst = test('soup base', {
  category: 'vegan', recipeType: 'soup_stew', ingredients: 'עדשים, עגבניה',
})

test('soup regenerate', {
  category: 'vegan', recipeType: 'soup_stew', ingredients: 'עדשים, עגבניה',
}, {
  excludeTemplateKeys: soupFirst?.templateKey ? [soupFirst.templateKey] : [],
  excludeTitles: soupFirst?.name ? [soupFirst.name] : [],
})
