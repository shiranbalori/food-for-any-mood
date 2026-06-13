import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'
import { validateRecipeCategory, recipeHasMeat, recipeHasDairy, isVeganValid } from '../src/utils/recipeCategoryGuard.js'
import { validateRecipeQuality } from '../src/utils/recipeIngredientParser.js'
import { assessCategoryFit, CATEGORY_MISMATCH_MESSAGE } from '../src/utils/recipeCategoryFit.js'
import { assessIngredientFeasibility } from '../src/utils/recipePreReturnValidation.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'

const mismatchMsg = CATEGORY_MISMATCH_MESSAGE.he
let passed = 0
let failed = 0

function expect(label, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`OK  ${label}`)
  } else {
    failed++
    console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function expectBlocked(label, cat, type, ingredients) {
  const fit = assessCategoryFit(ingredients, { category: cat, language: 'he' })
  const feas = assessIngredientFeasibility(ingredients, { recipeType: type, category: cat, language: 'he' })
  expect(
    label,
    !fit.categoryOk && fit.reason === mismatchMsg && !feas.recipePossible && feas.reason === mismatchMsg,
    `fit=${fit.reason} feas=${feas.reason}`,
  )
}

function expectGenerated(label, cat, type, ingredients, { requireMeat = false, requireDairy = false, requireVegan = false, requireSoup = false } = {}) {
  const fit = assessCategoryFit(ingredients, { category: cat, language: 'he' })
  const feas = assessIngredientFeasibility(ingredients, { recipeType: type, category: cat, language: 'he' })
  if (!fit.categoryOk || !feas.recipePossible) {
    expect(label, false, `blocked: ${fit.reason || feas.reason}`)
    return
  }
  const { recipe } = buildMockRecipe(
    { category: cat, ingredients, cookingTime: 30, mood: 'cozy', recipeType: type },
    { language: 'he' },
  )
  const userList = parseUserIngredients(ingredients)
  const catOk = validateRecipeCategory(type, cat, recipe)
  const quality = validateRecipeQuality(userList, recipe, 'he', { recipeType: type, category: cat })
  const soupOk = !requireSoup || /מרק|תבשיל|stew|soup/i.test(`${recipe.name} ${(recipe.steps ?? []).join(' ')}`)
  const proteinOk =
    (!requireMeat || recipeHasMeat(recipe)) &&
    (!requireDairy || recipeHasDairy(recipe)) &&
    (!requireVegan || isVeganValid(recipe))
  expect(
    label,
    Boolean(recipe?.name) && quality.ok && catOk && soupOk && proteinOk,
    `title=${recipe?.name} catOk=${catOk} quality=${quality.ok}`,
  )
}

console.log('=== Category mismatch blocks ===')
expectBlocked('meat + pasta/cream/mushrooms', 'meat', 'meal', 'פסטה, שמנת, פטריות')
expectBlocked('dairy + chicken/rice', 'dairy', 'meal', 'עוף, אורז, בצל')
expectBlocked('vegan + eggs', 'vegan', 'meal', 'ביצים')
expectBlocked('parve + cheese', 'parve', 'meal', 'גבינה')

console.log('\n=== Empty category generation ===')
expectGenerated('empty meat meal', 'meat', 'meal', '', { requireMeat: true })
expectGenerated('empty meat soup', 'meat', 'soup_stew', '', { requireMeat: true, requireSoup: true })
expectGenerated('empty dairy soup', 'dairy', 'soup_stew', '', { requireDairy: true, requireSoup: true })
expectGenerated('empty vegan soup', 'vegan', 'soup_stew', '', { requireVegan: true, requireSoup: true })

console.log('\n=== Valid any-category generation ===')
expectGenerated('any + lemon sugar flour (meal)', 'any', 'meal', 'לימון, סוכר, קמח')
expectGenerated('any + eggs/tomato/onion', 'any', 'meal', 'ביצים, עגבניות, בצל')

console.log('\n=== Valid ingredient generation ===')
expectGenerated('meat + chicken/rice', 'meat', 'meal', 'עוף, אורז, בצל', { requireMeat: true })
expectGenerated('dairy + pasta/cream/mushrooms', 'dairy', 'meal', 'פסטה, שמנת, פטריות', { requireDairy: true })
expectGenerated('vegan + lentils/carrot/onion', 'vegan', 'meal', 'עדשים, גזר, בצל', { requireVegan: true })

console.log(`\nSummary: ${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
