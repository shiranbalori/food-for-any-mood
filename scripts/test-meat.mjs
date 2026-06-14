import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'

const recipe = buildValidatedMockRecipe({
  category: 'meat',
  recipeType: 'meal',
  ingredients: 'עגבניה, אורז',
  cookingTime: 30,
  mood: 'cozy',
  language: 'he',
})
console.log(recipe?.name ?? 'NULL', recipe?.templateKey ?? '')
