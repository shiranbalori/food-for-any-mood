import { getBestMealPattern } from '../src/utils/mealRecipeBuilder.js'
import { buildRealisticMealFromPattern } from '../src/utils/mealRecipeBuilder.js'
import { validateRecipeCategory } from '../src/utils/recipeCategoryGuard.js'

const pattern = getBestMealPattern('קמח, עגבניה', { category: 'dairy', language: 'he' })
console.log('pattern', pattern?.id)
if (pattern) {
  const built = buildRealisticMealFromPattern(pattern, {
    filteredUserIngredients: ['קמח', 'עגבניה'],
    displayNames: ['קמח', 'עגבניה'],
    language: 'he',
    cookingTime: 30,
    servings: 4,
  })
  console.log('name', built.name)
  console.log('category valid', validateRecipeCategory('meal', 'dairy', built))
}
