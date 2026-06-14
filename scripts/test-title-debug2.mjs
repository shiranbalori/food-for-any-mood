import { isLiteralIngredientTitle } from '../src/utils/recipeTitle.js'
import { isIngredientListTitle } from '../src/utils/ingredientBasedTitle.js'

const ingredients = [
  '2 עגבניות בינוניות',
  'כוס עדשים',
  '2 כפות שמן זית (מרכיב מזווה בסיסי)',
]
const title = 'מרק עדשים ועגבניות'
console.log('isIngredientListTitle', isIngredientListTitle(title, ingredients, 'he'))
console.log('isLiteral', isLiteralIngredientTitle(title, ingredients, 'he'))
