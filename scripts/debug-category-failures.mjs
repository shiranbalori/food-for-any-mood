import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'
import { validateRecipeCategory, recipeHasMeat, recipeHasDairy } from '../src/utils/recipeCategoryGuard.js'
import { assessCategoryFit } from '../src/utils/recipeCategoryFit.js'
import { assessIngredientFeasibility } from '../src/utils/recipePreReturnValidation.js'
import { canonicalIngredient } from '../src/data/ingredientKnowledge.js'

for (const [cat, ing] of [
  ['meat', 'בשר טחון, תפוחי אדמה'],
  ['parve', 'טונה, אורז, מלפפון'],
]) {
  console.log('---', cat, ing)
  console.log('canonical:', ing.split(',').map((s) => canonicalIngredient(s.trim())))
  console.log('fit', JSON.stringify(assessCategoryFit(ing, { category: cat, language: 'he' })))
  console.log('feas', JSON.stringify(assessIngredientFeasibility(ing, { recipeType: 'meal', category: cat, language: 'he' })))
  const { recipe } = buildMockRecipe(
    { category: cat, ingredients: ing, cookingTime: 30, mood: 'cozy', recipeType: 'meal' },
    { language: 'he' },
  )
  console.log('title', recipe.name)
  console.log('ingredients', recipe.ingredients)
  console.log('catOk', validateRecipeCategory('meal', cat, recipe))
  console.log('hasMeat', recipeHasMeat(recipe), 'hasDairy', recipeHasDairy(recipe))
}
