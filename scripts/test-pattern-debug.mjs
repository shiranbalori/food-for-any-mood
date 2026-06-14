import { getBestMealPattern, buildRealisticMealFromPattern } from '../src/utils/mealRecipeBuilder.js'
import { validateRecipeCategory } from '../src/utils/recipeCategoryGuard.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'

const input = 'קמח, גבינה, חלב'
const filtered = parseUserIngredients(input)
const display = filtered

const pattern = getBestMealPattern(input, {
  category: 'dairy',
  excludeTemplateKeys: ['dairy_savory_cheese_pancakes'],
})
console.log('pattern', pattern?.id, pattern?.nameHe)
if (pattern) {
  const built = buildRealisticMealFromPattern(pattern, {
    filteredUserIngredients: filtered,
    displayNames: display,
    language: 'he',
  })
  console.log('built', built.name, built.ingredients.length, 'steps', built.steps.length)
  console.log('category valid', validateRecipeCategory('meal', 'dairy', built))
}
