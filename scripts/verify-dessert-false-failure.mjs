import { generateAppRecipe } from '../src/services/recipeService.js'
import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'

const input = {
  category: 'dairy',
  ingredients: 'קמח, גבינה, חלב',
  cookingTime: 30,
  mood: 'cozy',
  recipeType: 'dessert',
}

const mock = buildValidatedMockRecipe(input)
console.log('mock fallback:', mock?.name ?? 'NULL')

const result = await generateAppRecipe(input, { language: 'he' })
const conflict = result.recipePossible === false && Boolean(result.recipe)
console.log('generateAppRecipe:', {
  recipePossible: result.recipePossible,
  title: result.recipe?.name ?? result.impossibleReason,
  conflict,
})
process.exit(conflict ? 1 : result.recipe ? 0 : 1)
