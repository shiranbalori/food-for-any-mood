import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'
import { validateRecipeCategory, recipeHasMeat, recipeHasDairy } from '../src/utils/recipeCategoryGuard.js'
import { validateRecipeQuality } from '../src/utils/recipeIngredientParser.js'
import { assessCategoryFit, buildCategoryMismatchMessage } from '../src/utils/recipeCategoryFit.js'
import { assessIngredientFeasibility } from '../src/utils/recipePreReturnValidation.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'

const mismatchFor = (cat) => buildCategoryMismatchMessage(cat, 'he')

const mustGenerate = [
  ['dairy', 'meal', 'קמח, גבינה, חלב'],
  ['dairy', 'meal', 'פסטה, שמנת, פטריות'],
  ['meat', 'meal', 'עוף, אורז, בצל'],
  ['meat', 'meal', 'בשר טחון, תפוחי אדמה'],
  ['vegan', 'meal', 'עדשים, גזר, בצל'],
  ['parve', 'meal', 'טונה, אורז, מלפפון'],
  ['any', 'meal', 'לימון, סוכר, בצל'],
  ['meat', 'meal', ''],
]

const mustBlock = [
  ['dairy', 'meal', 'עוף, אורז, בצל'],
  ['meat', 'meal', 'חלב, קמח, סוכר'],
  ['vegan', 'meal', 'ביצים'],
  ['parve', 'meal', 'גבינה, עגבניות'],
]

function testGenerate(cat, type, ing) {
  const fit = assessCategoryFit(ing, { category: cat, language: 'he' })
  const feas = assessIngredientFeasibility(ing, { recipeType: type, category: cat, language: 'he' })
  if (!fit.categoryOk) return { ok: false, stage: 'fit', reason: fit.reason }
  if (!feas.recipePossible) return { ok: false, stage: 'feas', reason: feas.reason }
  const { recipe } = buildMockRecipe(
    { category: cat, ingredients: ing, cookingTime: 30, mood: 'cozy', recipeType: type },
    { language: 'he' },
  )
  const catOk = validateRecipeCategory(type, cat, recipe)
  const q = validateRecipeQuality(parseUserIngredients(ing), recipe, 'he', { recipeType: type, category: cat })
  if (!catOk) {
    return {
      ok: false,
      stage: 'postCat',
      title: recipe?.name,
      hasMeat: recipeHasMeat(recipe),
      hasDairy: recipeHasDairy(recipe),
      fitReason: fit.reason,
    }
  }
  if (!q.ok) return { ok: false, stage: 'quality', title: recipe?.name, checks: Object.entries(q.checks ?? {}).filter(([, v]) => !v).map(([k]) => k) }
  return { ok: true, title: recipe?.name }
}

function testBlock(cat, type, ing) {
  const fit = assessCategoryFit(ing, { category: cat, language: 'he' })
  const feas = assessIngredientFeasibility(ing, { recipeType: type, category: cat, language: 'he' })
  const blocked = !fit.categoryOk && fit.reason === mismatchFor(cat) && !feas.recipePossible
  return { ok: blocked, fit: fit.reason, feas: feas.reason }
}

let pass = 0
let fail = 0

console.log('=== Must generate ===')
for (const [cat, type, ing] of mustGenerate) {
  const label = `${cat} + ${ing || '(empty)'}`
  const r = testGenerate(cat, type, ing)
  if (r.ok) {
    pass++
    console.log(`PASS ${label} -> ${r.title}`)
  } else {
    fail++
    console.log(`FAIL ${label}`, r)
  }
}

console.log('\n=== Must block (category mismatch) ===')
for (const [cat, type, ing] of mustBlock) {
  const label = `${cat} + ${ing}`
  const r = testBlock(cat, type, ing)
  if (r.ok) {
    pass++
    console.log(`PASS ${label}`)
  } else {
    fail++
    console.log(`FAIL ${label}`, r)
  }
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
