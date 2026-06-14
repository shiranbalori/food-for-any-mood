import { validateRecipeBeforeReturn } from '../src/utils/recipePreReturnValidation.js'
import { buildRealisticMealFromPattern, getBestMealPattern } from '../src/utils/mealRecipeBuilder.js'

const pattern = getBestMealPattern('קמח, עגבניה', { category: 'dairy' })
const built = buildRealisticMealFromPattern(pattern, {
  filteredUserIngredients: ['קמח', 'עגבניה'],
  displayNames: ['קמח', 'עגבניה'],
  language: 'he',
  cookingTime: 30,
})
console.log(validateRecipeBeforeReturn(built, 'קמח, עגבניה', { language: 'he' }))
