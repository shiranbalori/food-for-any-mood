import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'
import { validateRecipeCategory, recipeHasMeat, recipeHasDairy } from '../src/utils/recipeCategoryGuard.js'
import { assessCategoryFit } from '../src/utils/recipeCategoryFit.js'
import { assessIngredientFeasibility } from '../src/utils/recipePreReturnValidation.js'

const { recipe } = buildMockRecipe(
  { category: 'meat', ingredients: '', cookingTime: 30, mood: 'cozy', recipeType: 'meal' },
  { language: 'he' },
)
console.log('title', recipe.name)
console.log('ingredients', recipe.ingredients?.slice(0, 5))
console.log('tags', recipe.tags)
console.log('fit', assessCategoryFit('', { category: 'meat', language: 'he' }))
console.log('feas', assessIngredientFeasibility('', { recipeType: 'meal', category: 'meat', language: 'he' }))
console.log('catOk', validateRecipeCategory('meal', 'meat', recipe))
console.log('hasMeat', recipeHasMeat(recipe), 'hasDairy', recipeHasDairy(recipe))
