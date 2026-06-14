import { buildRealisticMealFromPattern, getBestMealPattern } from '../src/utils/mealRecipeBuilder.js'
import { validateRecipeCategory } from '../src/utils/recipeCategoryGuard.js'
import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'
import { applyRecipeIngredientParser } from '../src/utils/recipeIngredientParser.js'

const pattern = getBestMealPattern('קמח, עגבניה', { category: 'dairy' })
const built = buildRealisticMealFromPattern(pattern, {
  filteredUserIngredients: ['קמח', 'עגבניה'],
  displayNames: ['קמח', 'עגבניה'],
  language: 'he',
  cookingTime: 30,
})
console.log('built category', validateRecipeCategory('meal', 'dairy', built))

const { recipe } = buildMockRecipe(
  { category: 'dairy', ingredients: 'קמח, עגבניה', cookingTime: 30, mood: 'cozy', recipeType: 'meal' },
  { language: 'he' },
)
console.log('mock name', recipe.name)
console.log('mock category', validateRecipeCategory('meal', 'dairy', recipe))

const { recipe: parsed } = applyRecipeIngredientParser(recipe, 'קמח, עגבניה', 'he', {
  cookingTime: 30,
  recipeType: 'meal',
  category: 'dairy',
  preserveOriginalSteps: true,
  skipRequantify: true,
  source: 'mock',
})
console.log('parsed name', parsed.name)
console.log('parsed ing', parsed.ingredients)
console.log('parsed category', validateRecipeCategory('meal', 'dairy', parsed))
