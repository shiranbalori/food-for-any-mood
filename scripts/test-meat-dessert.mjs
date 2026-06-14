import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'

for (const [label, params] of [
  ['meat', { category: 'meat', recipeType: 'meal', ingredients: 'עגבניה, אורז' }],
  ['dessert', { category: 'dairy', recipeType: 'dessert', ingredients: 'קמח, גבינה, חלב' }],
]) {
  const recipe = buildValidatedMockRecipe({ ...params, cookingTime: 30, mood: 'cozy', language: 'he' })
  console.log(recipe ? 'OK' : 'NULL', label, recipe?.name ?? '')
}
