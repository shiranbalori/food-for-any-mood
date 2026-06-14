import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'
import { assessGenerationFeasibility } from '../src/utils/recipeGenerationPolicy.js'

const input = {
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'עגבניה, ביצה',
  cookingTime: 30,
  mood: 'cozy',
  language: 'he',
}

console.log('feasibility', assessGenerationFeasibility(input.ingredients, input))
const recipe = buildValidatedMockRecipe(input)
console.log(recipe ? 'OK' : 'NULL', recipe?.name ?? '')
