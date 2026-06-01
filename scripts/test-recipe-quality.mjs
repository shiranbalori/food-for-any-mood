import assert from 'node:assert/strict'
import { deriveRecipeTags, validateRecipeTags } from '../src/utils/recipeTags.js'
import { validateRecipeQuality } from '../src/utils/recipeIngredientParser.js'
import { validateDishTitle } from '../src/utils/recipeTitle.js'
import { FORBIDDEN_GENERIC_TITLES } from '../src/utils/ingredientBasedTitle.js'
import { calculateHealthScoreDetailed } from '../src/utils/nutritionScore.js'
import {
  buildGroundedChefTitle,
  validateTitleGrounding,
} from '../src/utils/recipeGrounding.js'
import { applyRecipeIngredientParser } from '../src/utils/recipeIngredientParser.js'

function testDerivedTagsRejectHealthyHighCalorieDessert() {
  const recipe = {
    name: 'עוגת שוקולד',
    ingredients: ['קמח', 'סוכר', 'שוקולד', 'ביצים'],
    steps: ['מחממים תנור ל-180 מעלות.', 'מערבבים קמח וסוכר.', 'אופים 25 דקות.', 'מגישים.'],
    nutrition: { calories: 620, protein: 8, fat: 32, carbs: 70 },
    healthScore: 82,
    spiceLevel: 0,
    tags: ['healthy', 'dietFriendly'],
  }
  const derived = deriveRecipeTags(recipe, { category: 'dairy', recipeType: 'dessert' })
  assert.equal(derived.includes('healthy'), false)
  assert.equal(derived.includes('dietFriendly'), false)
}

function testSpicyRecipeNotChildFriendly() {
  const recipe = {
    name: 'קארי חריף',
    ingredients: ['עוף', 'curry', 'chili'],
    steps: ['מחממים מחבת.', 'מוסיפים עוף.', 'מבשלים 20 דקות.', 'מגישים.'],
    nutrition: { calories: 420, protein: 30, fat: 12, carbs: 20 },
    healthScore: 70,
    spiceLevel: 2,
    tags: [],
  }
  const derived = deriveRecipeTags(recipe, { category: 'meat', recipeType: 'meal', spiceLevel: 2 })
  assert.equal(derived.includes('childFriendly'), false)
}

function testValidateRecipeQualityRequiresTitleAndRelevance() {
  const recipe = {
    name: 'מנה ביתית מהמטבח',
    ingredients: ['ביצה', 'פסטה', 'מלח', 'שמן'],
    steps: [
      'מבשלים את הפסטה במים רותחים.',
      'מחממים מחבת ומוסיפים ביצה.',
      'מערבבים עם הפסטה.',
      'מגישים חם.',
    ],
    nutrition: { calories: 420, protein: 16, fat: 14, carbs: 48 },
    healthScore: 72,
    spiceLevel: 0,
    tags: ['comfortFood'],
  }
  const report = validateRecipeQuality(['ביצה', 'פסטה'], recipe, 'he')
  assert.equal(report.ok, false)
  assert.equal(report.checks.titleOk, false)
}

function testForbiddenGenericTitles() {
  assert.equal(FORBIDDEN_GENERIC_TITLES.has('מנה ביתית מהמטבח'), true)
  assert.equal(FORBIDDEN_GENERIC_TITLES.has('ביצה עם פסטה'), true)
}

function testValidateDishTitleRejectsLiteralJoin() {
  const result = validateDishTitle('ביצה עם פסטה', ['ביצה', 'פסטה'], 'he')
  assert.equal(result.ok, false)
}

function testHighCarbPastaScoresLow() {
  const result = calculateHealthScoreDetailed({
    ingredients: ['500g פסטה', '2 כפות שמן זית', 'מלח', 'פלפל שחור'],
    calories: 1707,
    protein: 56,
    carbs: 299,
    fat: 28,
    servings: 4,
    language: 'en',
  })

  assert.ok(result.score < 40, `expected low score for pasta-heavy meal, got ${result.score}`)
  assert.ok(result.healthScoreBreakdown.carbs < 0, 'carbs contribution should be negative')
  assert.ok(result.healthScoreBreakdown.vegetable < 0, 'vegetable contribution should be negative')
  assert.ok(typeof result.explanation === 'string' && result.explanation.length > 0)
  assert.equal(result.healthScoreBreakdown.perServing.calories, 427)
  assert.equal(result.healthScoreBreakdown.perServing.carbs, 74.8)
}

function testForbiddenTitleWithOnlyEggAndPasta() {
  const badTitle = 'פסטה שמנת פטריות'
  const userIngredients = ['ביצה', 'פסטה']
  const recipeIngredients = ['פסטה', 'ביצים', 'מלח', 'שמן זית']

  const grounding = validateTitleGrounding(badTitle, recipeIngredients, userIngredients, 'he')
  assert.equal(grounding.ok, false)

  const groundedTitle = buildGroundedChefTitle(userIngredients, recipeIngredients, 'he')
  assert.match(groundedTitle, /פסטה/)
  assert.doesNotMatch(groundedTitle, /שמנת|פטריות|אלפרדו|גבינ/)
  assert.equal(validateTitleGrounding(groundedTitle, recipeIngredients, userIngredients, 'he').ok, true)
}

function testValidateRecipeQualityRejectsUngroundedTitle() {
  const recipe = {
    name: 'פסטה שמנת פטריות',
    description: 'פסטה עשירה בשמנת ופטריות',
    ingredients: ['פסטה', 'ביצים', 'מלח', 'שמן זית'],
    steps: [
      'מבשלים את הפסטה במים רותחים.',
      'מחממים מחבת ומוסיפים ביצה.',
      'מערבבים עם הפסטה.',
      'מגישים חם.',
    ],
    nutrition: { calories: 420, protein: 16, fat: 14, carbs: 48 },
    healthScore: 72,
    spiceLevel: 0,
    tags: ['comfortFood'],
  }
  const report = validateRecipeQuality(['ביצה', 'פסטה'], recipe, 'he')
  assert.equal(report.ok, false)
  assert.equal(report.checks.groundingOk, false)
}

function testApplyParserRepairsUngroundedRecipe() {
  const recipe = {
    name: 'פסטה שמנת פטריות',
    description: 'פסטה עשירה בשמנת ופטריות',
    ingredients: ['500g פסטה', '2 ביצים', 'מלח', 'שמן זית'],
    steps: [
      'מבשלים את הפסטה במים רותחים.',
      'מחממים מחבת ומוסיפים ביצה.',
      'מערבבים עם הפסטה.',
      'מגישים חם.',
    ],
    nutrition: { calories: 420, protein: 16, fat: 14, carbs: 48, servings: 2 },
    healthScore: 72,
    spiceLevel: 0,
    tags: ['comfortFood'],
  }
  const { recipe: repaired, validation } = applyRecipeIngredientParser(recipe, 'ביצה, פסטה', 'he', {
    source: 'test',
  })
  assert.doesNotMatch(repaired.name, /שמנת|פטריות/)
  assert.equal(validation.checks.groundingOk, true)
}

const tests = [
  testDerivedTagsRejectHealthyHighCalorieDessert,
  testSpicyRecipeNotChildFriendly,
  testValidateRecipeQualityRequiresTitleAndRelevance,
  testForbiddenGenericTitles,
  testValidateDishTitleRejectsLiteralJoin,
  testHighCarbPastaScoresLow,
  testForbiddenTitleWithOnlyEggAndPasta,
  testValidateRecipeQualityRejectsUngroundedTitle,
  testApplyParserRepairsUngroundedRecipe,
]

let passed = 0
for (const run of tests) {
  run()
  passed += 1
}

console.log(`recipe quality tests passed: ${passed}/${tests.length}`)
