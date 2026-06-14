import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'

const cases = [
  ['flour tomato', { category: 'dairy', recipeType: 'meal', ingredients: 'קמח, עגבניה' }],
  ['soup vegan', { category: 'vegan', recipeType: 'soup_stew', ingredients: 'עדשים, עגבניה' }],
]

for (const [label, params] of cases) {
  const recipe = buildValidatedMockRecipe({ ...params, cookingTime: 30, mood: 'cozy', language: 'he' })
  console.log(recipe ? 'OK' : 'NULL', label, recipe?.name ?? '')
}
