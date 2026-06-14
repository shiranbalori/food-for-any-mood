import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'
import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'

const input = {
  category: 'dairy',
  ingredients: 'קמח, גבינה, חלב',
  cookingTime: 30,
  mood: 'cozy',
  recipeType: 'dessert',
  language: 'he',
}

const direct = buildMockRecipe(input, { language: 'he' })
console.log('direct mock:', direct.recipe?.name)

const validated = buildValidatedMockRecipe(input)
console.log('validated mock:', validated?.name ?? 'null')
