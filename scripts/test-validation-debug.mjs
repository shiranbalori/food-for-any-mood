import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'
import { finalizeRecipeForUser } from '../src/services/aiRecipeService.js'

// replicate finalizeRecipeForUser export - it's not exported, need different approach
import { buildRealisticMealFromPattern, getBestMealPattern } from '../src/utils/mealRecipeBuilder.js'
import { applyRecipeIngredientParser } from '../src/utils/recipeIngredientParser.js'
import { validateRecipeCategory } from '../src/utils/recipeCategoryGuard.js'
import { assessGenerationFeasibility } from '../src/utils/recipeGenerationPolicy.js'
import { validatePreReturnRecipe } from '../src/utils/recipePreReturnValidation.js'

const userInput = {
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'קמח, עגבניה',
  cookingTime: 30,
  mood: 'cozy',
  language: 'he',
}

const { recipe, meta } = buildMockRecipe(
  { category: 'dairy', ingredients: 'קמח, עגבניה', cookingTime: 30, mood: 'cozy', recipeType: 'meal' },
  { language: 'he' },
)
console.log('mock name', recipe?.name, 'template', meta?.templateKey)

const pattern = getBestMealPattern('קמח, עגבניה', { category: 'dairy' })
const built = buildRealisticMealFromPattern(pattern, {
  filteredUserIngredients: ['קמח', 'עגבניה'],
  displayNames: ['קמח', 'עגבניה'],
  language: 'he',
  cookingTime: 30,
})
console.log('built name', built.name)

const { recipe: parsed } = applyRecipeIngredientParser(built, userInput.ingredients, 'he', {
  cookingTime: 30,
  recipeType: 'meal',
  category: 'dairy',
  preserveOriginalSteps: true,
  skipRequantify: true,
})
console.log('parsed name', parsed.name)
console.log('category', validateRecipeCategory('meal', 'dairy', parsed))

const feasibility = assessGenerationFeasibility(userInput)
console.log('feasibility', feasibility)

const preReturn = validatePreReturnRecipe(parsed, userInput)
console.log('preReturn checks', preReturn?.checks)
console.log('preReturn ok', preReturn?.ok)
