import { getBestMealPattern, buildRealisticMealFromPattern } from '../src/utils/mealRecipeBuilder.js'
import { validateRecipeCategory, recipeHasLandMeat } from '../src/utils/recipeCategoryGuard.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'

const input = 'קמח, עגבניה'
const filtered = parseUserIngredients(input)
const pattern = getBestMealPattern(input, { category: 'dairy' })
console.log('pattern', pattern?.id)
const built = buildRealisticMealFromPattern(pattern, {
  filteredUserIngredients: filtered,
  displayNames: filtered,
  language: 'he',
})
const recipe = { ...built, tags: [] }
console.log('name', recipe.name, 'landMeat', recipeHasLandMeat(recipe), 'valid', validateRecipeCategory('meal', 'dairy', recipe))
