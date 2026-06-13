import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'
import {
  validateRecipeCategory,
  recipeHasDairy,
  recipeHasLandMeat,
  recipeHasMeat,
  isVeganValid,
} from '../src/utils/recipeCategoryGuard.js'
import { assessCategoryFit } from '../src/utils/recipeCategoryFit.js'
import { assessIngredientFeasibility } from '../src/utils/recipePreReturnValidation.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'
import { ingredientsMatch } from '../src/data/ingredientKnowledge.js'

const GENERIC_FAILURE = 'לא הצלחנו ליצור מתכון אמין'

const cases = [
  {
    label: 'Dairy',
    category: 'dairy',
    ingredients: 'קמח, גבינה, חלב',
    categoryCheck: (recipe) => recipeHasDairy(recipe) && !recipeHasLandMeat(recipe),
  },
  {
    label: 'Meat',
    category: 'meat',
    ingredients: 'בשר טחון, תפוחי אדמה, בצל',
    categoryCheck: (recipe) => recipeHasMeat(recipe) && !recipeHasDairy(recipe),
  },
  {
    label: 'Vegan',
    category: 'vegan',
    ingredients: 'עדשים, גזר, בצל',
    categoryCheck: (recipe) => isVeganValid(recipe),
  },
  {
    label: 'Parve',
    category: 'parve',
    ingredients: 'טונה, אורז, מלפפון',
    categoryCheck: (recipe) => !recipeHasLandMeat(recipe) && !recipeHasDairy(recipe),
  },
  {
    label: 'No preference',
    category: 'any',
    ingredients: 'לימון, סוכר, קמח',
    categoryCheck: () => true,
  },
]

const baseInput = {
  cookingTime: 30,
  mood: 'cozy',
  recipeType: 'meal',
  language: 'he',
  isGlutenFree: false,
}

let passed = 0
let failed = 0

console.log('=== Real user ingredient verification ===\n')

for (const testCase of cases) {
  const { label, category, ingredients, categoryCheck } = testCase
  const fit = assessCategoryFit(ingredients, { category, language: 'he' })
  const feas = assessIngredientFeasibility(ingredients, {
    recipeType: 'meal',
    category,
    language: 'he',
  })

  if (!fit.categoryOk) {
    failed++
    console.log(`FAIL ${label}`)
    console.log(`  Pre-gen category block: ${fit.reason}`)
    console.log('')
    continue
  }

  if (!feas.recipePossible) {
    failed++
    console.log(`FAIL ${label}`)
    console.log(`  Pre-gen feasibility block: ${feas.reason}`)
    console.log('')
    continue
  }

  const recipe = buildValidatedMockRecipe({ ...baseInput, category, ingredients })

  if (!recipe?.name) {
    failed++
    console.log(`FAIL ${label}`)
    console.log(`  No recipe returned (would show generic failure message)`)
    console.log('')
    continue
  }

  const userList = parseUserIngredients(ingredients)
  const missingFromRecipe = userList.filter(
    (userIng) => !(recipe.ingredients ?? []).some((line) => ingredientsMatch(line, userIng)),
  )
  const catOk = validateRecipeCategory('meal', category, recipe)
  const contentOk = categoryCheck(recipe)

  const ok =
    Boolean(recipe.name) &&
    catOk &&
    contentOk &&
    missingFromRecipe.length === 0

  if (ok) {
    passed++
    console.log(`PASS ${label}`)
    console.log(`  Title: ${recipe.name}`)
    console.log(`  Ingredients in recipe: ${(recipe.ingredients ?? []).slice(0, 5).join(' | ')}`)
    console.log(`  Category validation: OK`)
    console.log(`  User ingredients present: ${userList.join(', ')}`)
    console.log(`  Generic failure: no`)
  } else {
    failed++
    console.log(`FAIL ${label}`)
    console.log(`  Title: ${recipe?.name ?? '(none)'}`)
    console.log(`  Category validation: ${catOk ? 'OK' : 'FAILED'}`)
    console.log(`  Category content check: ${contentOk ? 'OK' : 'FAILED'}`)
    if (missingFromRecipe.length) {
      console.log(`  Missing user ingredients: ${missingFromRecipe.join(', ')}`)
    }
    console.log(`  Generic failure: ${recipe ? 'no' : `yes (${GENERIC_FAILURE})`}`)
  }
  console.log('')
}

console.log(`Summary: ${passed}/${cases.length} passed`)
if (failed) process.exit(1)
