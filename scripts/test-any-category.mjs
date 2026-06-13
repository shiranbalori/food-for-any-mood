import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'
import { validateRecipeCategory } from '../src/utils/recipeCategoryGuard.js'
import { validateRecipeQuality } from '../src/utils/recipeIngredientParser.js'
import { assessCategoryFit, CATEGORY_MISMATCH_MESSAGE } from '../src/utils/recipeCategoryFit.js'
import { assessIngredientFeasibility } from '../src/utils/recipePreReturnValidation.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'

const mismatch = CATEGORY_MISMATCH_MESSAGE.he

function test(label, cat, type, ing, { shouldBlock = false, requireMeat = false } = {}) {
  const fit = assessCategoryFit(ing, { category: cat, language: 'he' })
  const feas = assessIngredientFeasibility(ing, { recipeType: type, category: cat, language: 'he' })
  if (shouldBlock) {
    const ok = !fit.categoryOk && fit.reason === mismatch && !feas.recipePossible
    console.log(ok ? 'OK' : 'FAIL', label, shouldBlock ? '(blocked)' : '', !ok ? { fit, feas: feas.reason } : '')
    return ok
  }
  if (!feas.recipePossible) {
    console.log('FAIL', label, 'feas blocked:', feas.reason)
    return false
  }
  const { recipe } = buildMockRecipe(
    { category: cat, ingredients: ing, cookingTime: 30, mood: 'cozy', recipeType: type },
    { language: 'he' },
  )
  const q = validateRecipeQuality(parseUserIngredients(ing), recipe, 'he', { recipeType: type, category: cat })
  const catOk = validateRecipeCategory(type, cat, recipe)
  const ok = Boolean(recipe?.name) && q.ok && catOk
  console.log(ok ? 'OK' : 'FAIL', label, recipe?.name, { quality: q.ok, catOk })
  return ok
}

let pass = 0
let fail = 0
for (const r of [
  () => test('any + lemon sugar flour (dessert)', 'any', 'dessert', 'לימון, סוכר, קמח'),
  () => test('any + lemon sugar flour (meal)', 'any', 'meal', 'לימון, סוכר, קמח'),
  () => test('any + eggs tomato onion', 'any', 'meal', 'ביצים, עגבניות, בצל'),
  () => test('meat empty', 'meat', 'meal', ''),
  () => test('meat + lemon sugar flour', 'meat', 'meal', 'לימון, סוכר, קמח', { shouldBlock: true }),
  () => test('vegan + eggs', 'vegan', 'meal', 'ביצים', { shouldBlock: true }),
]) {
  if (r()) pass++
  else fail++
}
console.log(`\n${pass} passed, ${fail} failed`)
