import { buildRecipeFromDishIdea, resolveDishIdeaTarget } from '../src/utils/dishIdeaGeneration.js'
import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'

console.log('target meal', resolveDishIdeaTarget('עוגת גזר', { category: 'dairy', recipeType: 'meal', language: 'he' }))
console.log('target dessert', resolveDishIdeaTarget('עוגת גזר', { category: 'dairy', recipeType: 'dessert', language: 'he' }))
console.log('build default', buildRecipeFromDishIdea('עוגת גזר', { category: 'dairy', language: 'he' })?.built?.name)
console.log('mock dessert', buildValidatedMockRecipe({
  category: 'dairy',
  recipeType: 'dessert',
  ingredients: '',
  dishIdea: 'עוגת גזר',
  cookingTime: 45,
  mood: 'cozy',
  language: 'he',
})?.name)
