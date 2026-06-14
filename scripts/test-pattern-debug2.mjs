import { getBestMealPattern, buildRealisticMealFromPattern } from '../src/utils/mealRecipeBuilder.js'
import {
  validateRecipeCategory,
  recipeHasDairy,
  recipeHasLandMeat,
} from '../src/utils/recipeCategoryGuard.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'

const input = 'קמח, גבינה, חלב'
const filtered = parseUserIngredients(input)
const pattern = getBestMealPattern(input, {
  category: 'dairy',
  excludeTemplateKeys: ['dairy_savory_cheese_pancakes'],
})
const built = buildRealisticMealFromPattern(pattern, {
  filteredUserIngredients: filtered,
  displayNames: filtered,
  language: 'he',
})
const recipe = { ...built, ingredients: built.ingredients, steps: built.steps, tags: built.tags ?? [] }
console.log('name', recipe.name)
console.log('hasDairy', recipeHasDairy(recipe), 'hasLandMeat', recipeHasLandMeat(recipe))
console.log('ingredients', recipe.ingredients)
console.log('valid', validateRecipeCategory('meal', 'dairy', recipe))
