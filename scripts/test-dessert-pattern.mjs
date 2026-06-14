import { getBestDessertPattern, buildRealisticDessertFromPattern } from '../src/utils/dessertRecipeBuilder.js'
import { validateRecipeBeforeReturn } from '../src/utils/recipePreReturnValidation.js'
import { validateRecipeCategory } from '../src/utils/recipeCategoryGuard.js'

const pattern = getBestDessertPattern('קמח, גבינה, חלב', { category: 'dairy' })
console.log('pattern', pattern?.id)
const built = buildRealisticDessertFromPattern(pattern, {
  filteredUserIngredients: ['קמח', 'גבינה', 'חלב'],
  displayNames: ['קמח', 'גבינה', 'חלב'],
  language: 'he',
  cookingTime: 30,
})
console.log('name', built.name)
console.log('category', validateRecipeCategory('dessert', 'dairy', built))
console.log('preReturn', validateRecipeBeforeReturn(built, 'קמח, גבינה, חלב'))
