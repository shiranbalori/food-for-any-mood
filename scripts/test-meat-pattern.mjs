import { getBestMealPattern, buildRealisticMealFromPattern } from '../src/utils/mealRecipeBuilder.js'
import { validateRecipeCategory } from '../src/utils/recipeCategoryGuard.js'
import { validateRecipeBeforeReturn } from '../src/utils/recipePreReturnValidation.js'
import { validateRecipeRelevance } from '../src/utils/ingredientRelevance.js'

const pattern = getBestMealPattern('עגבניה, אורז', { category: 'meat' })
console.log('pattern', pattern?.id)
const built = buildRealisticMealFromPattern(pattern, {
  filteredUserIngredients: ['עגבניה', 'אורז'],
  displayNames: ['עגבניה', 'אורז'],
  language: 'he',
  cookingTime: 30,
})
console.log('name', built.name)
console.log('category', validateRecipeCategory('meal', 'meat', built))
console.log('preReturn', validateRecipeBeforeReturn(built, 'עגבניה, אורז'))
console.log('relevance', validateRecipeRelevance(['עגבניה', 'אורז'], built))
