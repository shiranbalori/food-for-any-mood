import assert from 'node:assert/strict'
import {
  calculateHealthScoreDetailed,
  estimateSugarPerServing,
} from '../src/utils/nutritionScore.js'

// Two reference recipes used to verify the nutrition-scoring correctness fixes:
//   1) sugar is no longer inferred from carbohydrates (no `carbs * 0.35`)
//   2) the same carbohydrates are not penalized twice (carb band + refined-carb)
const beefAndRice = {
  label: 'beef + rice',
  ingredients: [
    '600 גרם בשר בקר',
    '2 כוסות אורז',
    '2 בצלות בינוניות',
    '2 כפות שמן זית',
    '4 שיני שום',
    'מלח',
    'פלפל שחור',
  ],
  calories: 3204,
  protein: 185.2,
  carbs: 324,
  fat: 121.2,
  servings: 4,
}

const eggTomatoCheese = {
  label: 'egg + tomato + cheese',
  ingredients: [
    '4 ביצים',
    '2 עגבניות',
    '1 בצל',
    '60 גרם גבינה צהובה',
    '1 כף שמן זית',
    'מלח',
    'פלפל שחור',
  ],
  calories: 760,
  protein: 56,
  carbs: 24,
  fat: 48,
  servings: 2,
}

function score(recipe) {
  return calculateHealthScoreDetailed({
    ingredients: recipe.ingredients,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    servings: recipe.servings,
    language: 'he',
  })
}

function report(recipe, result) {
  const b = result.healthScoreBreakdown
  console.log(`\n=== ${recipe.label} ===`)
  console.log(`score: ${result.score} (${result.classification.id})`)
  console.log('per serving:', b.perServing)
  console.log('contributions:', {
    base: b.baseScore,
    calories: b.calories,
    protein: b.protein,
    carbs: b.carbs,
    fat: b.fat,
    vegetable: b.vegetable,
    fiber: b.fiber,
    ultraProcessed: b.ultraProcessedPenalty,
  })
  console.log('reason:', result.explanation)
}

function testNoFakeSugarFromCarbs() {
  // A savory, starch-heavy dish has no sweeteners, so estimated sugar must be 0
  // regardless of how high its carbohydrate count is.
  const sugar = estimateSugarPerServing(beefAndRice.ingredients, beefAndRice.servings, 81)
  assert.equal(sugar, 0, `expected 0 estimated sugar for savory beef+rice, got ${sugar}`)

  const result = score(beefAndRice)
  assert.equal(
    result.healthScoreBreakdown.perServing.sugar,
    0,
    'beef+rice should report 0g sugar per serving',
  )
}

function testNoDoublePenaltyForRiceCarbs() {
  // High carbs (>80g/serving) lands in the -30 band. Rice is also a refined carb.
  // The two must not stack: the carbs contribution should be exactly the band (-30),
  // not band + refined (-30 + -6) and not band + refined + fake-sugar.
  const result = score(beefAndRice)
  assert.equal(
    result.healthScoreBreakdown.carbs,
    -30,
    `carbs contribution should be the single worst penalty (-30), got ${result.healthScoreBreakdown.carbs}`,
  )
}

function testRealSugarStillCounts() {
  // A genuinely sweet ingredient must still register sugar so the fix does not
  // accidentally exempt desserts.
  const sugar = estimateSugarPerServing(['2 כפות סוכר', 'דבש', '200 גרם קמח'], 2)
  assert.ok(sugar > 0, `expected real sweeteners to count, got ${sugar}`)
}

function testEggRecipeUnaffected() {
  const result = score(eggTomatoCheese)
  assert.equal(
    result.healthScoreBreakdown.perServing.sugar,
    0,
    'egg recipe has no sweeteners and should report 0g sugar',
  )
}

const tests = [
  testNoFakeSugarFromCarbs,
  testNoDoublePenaltyForRiceCarbs,
  testRealSugarStillCounts,
  testEggRecipeUnaffected,
]

let passed = 0
for (const run of tests) {
  run()
  passed += 1
}

const beefResult = score(beefAndRice)
const eggResult = score(eggTomatoCheese)
report(beefAndRice, beefResult)
report(eggTomatoCheese, eggResult)

console.log(`\nnutrition scoring tests passed: ${passed}/${tests.length}`)
