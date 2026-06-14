import { titleDescribesDish } from '../src/utils/recipeTitle.js'
import { buildRealisticMealFromPattern, getBestMealPattern } from '../src/utils/mealRecipeBuilder.js'

const pattern = getBestMealPattern('עגבניה, אורז', { category: 'meat' })
const built = buildRealisticMealFromPattern(pattern, {
  filteredUserIngredients: ['עגבניה', 'אורז'],
  displayNames: ['עגבניה', 'אורז'],
  language: 'he',
  cookingTime: 30,
})
console.log('name', built.name)
console.log('describes', titleDescribesDish(built.name, built.ingredients, 'he', ['עגבניה', 'אורז']))
