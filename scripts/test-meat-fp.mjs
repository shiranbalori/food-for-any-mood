import { getBestMealPattern, buildRealisticMealFromPattern } from '../src/utils/mealRecipeBuilder.js'
import { recipeHasLandMeat } from '../src/utils/recipeCategoryGuard.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'

const patterns = [/עוף/, /בשר/, /בקר/, /כבש/, /הודו/, /נקניק/, /קבב/, /סטייק/, /קציצ/, /chicken/i, /beef/i, /\bmeat\b/i, /steak/i, /turkey/i, /lamb/i, /pork/i, /ground beef/i]

const input = 'קמח, גבינה, חלב'
const pattern = getBestMealPattern(input, {
  category: 'dairy',
  excludeTemplateKeys: ['dairy_savory_cheese_pancakes'],
})
const built = buildRealisticMealFromPattern(pattern, {
  filteredUserIngredients: parseUserIngredients(input),
  displayNames: parseUserIngredients(input),
  language: 'he',
})
const text = [built.name, ...(built.ingredients ?? []), ...(built.steps ?? [])].join(' ')
for (const p of patterns) {
  if (p.test(text)) console.log('MATCH', String(p))
}
console.log('hasLandMeat', recipeHasLandMeat({ name: built.name, ingredients: built.ingredients, steps: built.steps }))
