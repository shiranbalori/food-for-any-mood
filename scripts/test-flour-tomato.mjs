import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'

const recipe = buildValidatedMockRecipe({
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'קמח, עגבניה',
  cookingTime: 30,
  mood: 'cozy',
  language: 'he',
})
console.log(recipe?.name ?? 'NULL')
