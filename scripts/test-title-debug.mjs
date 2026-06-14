import { validateDishTitle } from '../src/utils/recipeTitle.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'

const userIngredients = parseUserIngredients('עדשים, עגבניה')
const ingredients = [
  '2 עגבניות בינוניות',
  'כוס עדשים',
  '2 כפות שמן זית (מרכיב מזווה בסיסי)',
  '1/2 כפיות מלח (מרכיב מזווה בסיסי)',
]
const title = 'מרק עדשים ועגבניות'
console.log(validateDishTitle(title, ingredients, 'he', userIngredients))
