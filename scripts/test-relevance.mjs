import { validateRecipeRelevance, titleContainsUserIngredient } from '../src/utils/ingredientRelevance.js'

const recipe = { name: 'קרפ מלוח בגבינה ועגבניות', ingredients: [], steps: [] }
const user = ['קמח', 'עגבניה']
console.log('titleContains', titleContainsUserIngredient(user, recipe.name))
console.log('relevance', validateRecipeRelevance(user, recipe))
