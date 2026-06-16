import {
  assessRecipeInputSafety,
  detectInputViolation,
  RECIPE_INPUT_REJECTION_HE,
} from '../src/utils/recipeInputValidation.js'
import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'
import { generateAppRecipe } from '../src/services/recipeService.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function expectBlocked({ ingredients = '', dishIdea = '' }, label) {
  const result = assessRecipeInputSafety({ ingredients, dishIdea, language: 'he' })
  assert(!result.ok, `${label} should be blocked`)
  assert(result.reason === RECIPE_INPUT_REJECTION_HE, `${label} should use generic Hebrew message`)
  assert((result.invalidTerms ?? []).length === 0, `${label} must not echo blocked words`)
  assert((result.missingIngredients ?? []).length === 0, `${label} must not suggest missing ingredients`)
  console.log('blocked:', label)
}

function expectAllowed({ ingredients = '', dishIdea = '' }, label) {
  const result = assessRecipeInputSafety({ ingredients, dishIdea, language: 'he' })
  assert(result.ok, `${label} should be allowed`)
  console.log('allowed:', label)
}

const blockedCases = [
  { label: 'hebrew profanity', ingredients: 'חרא' },
  { label: 'hebrew scat', ingredients: 'קקי' },
  { label: 'hebrew insult', ingredients: 'מטומטם' },
  { label: 'hebrew slur phrase', ingredients: 'בן זונה' },
  { label: 'english profanity', ingredients: 'fuck' },
  { label: 'english scat', ingredients: 'shit' },
  { label: 'obfuscated profanity spaces', ingredients: 'f u c k' },
  { label: 'obfuscated profanity symbols', ingredients: 'f*ck' },
  { label: 'non-food car', ingredients: 'מכונית' },
  { label: 'non-food computer', ingredients: 'מחשב' },
  { label: 'non-food table', ingredients: 'שולחן' },
  { label: 'non-food football', ingredients: 'כדורגל' },
  { label: 'non-food phone', ingredients: 'טלפון' },
  { label: 'non-food house', ingredients: 'בית' },
  { label: 'profanity dish name', dishIdea: 'מטומטם' },
  { label: 'non-food dish name', dishIdea: 'מכונית' },
  { label: 'nonsense dish name', dishIdea: 'asdfgh' },
  { label: 'nonsense ingredient', ingredients: 'qwerty' },
  { label: 'mixed valid + blocked', ingredients: 'ביצים, חרא' },
  { label: 'insult variant repeated letters', ingredients: 'מטומטטם' },
]

for (const testCase of blockedCases) {
  expectBlocked(testCase, testCase.label)
}

const allowedCases = [
  { label: 'carrot cake dish', dishIdea: 'עוגת גזר' },
  { label: 'eggs and tomatoes', ingredients: 'ביצים, עגבניות' },
  { label: 'cup of sugar', ingredients: 'כוס סוכר' },
  { label: 'homemade bread phrase', ingredients: 'לחם בית' },
  { label: 'flour sugar butter', ingredients: 'קמח, סוכר, חמאה' },
  { label: 'pancakes english', dishIdea: 'Pancakes' },
  { label: 'shakshuka english', dishIdea: 'Shakshuka' },
  { label: 'unknown exotic fruit', ingredients: 'דוריאן' },
]

for (const testCase of allowedCases) {
  expectAllowed(testCase, testCase.label)
}

const blockedGeneration = await generateAppRecipe({
  category: 'dairy',
  ingredients: 'מכונית',
  dishIdea: '',
  cookingTime: 30,
  mood: 'cozy',
  isGlutenFree: false,
  musicPlatform: null,
  recipeType: 'meal',
  language: 'he',
})
assert(blockedGeneration.recipePossible === false, 'generateAppRecipe should stop for blocked input')
assert(!blockedGeneration.recipe, 'generateAppRecipe must not return a recipe')
assert(blockedGeneration.impossibleReason === RECIPE_INPUT_REJECTION_HE, 'generic validation message only')
assert((blockedGeneration.missingIngredients ?? []).length === 0, 'no missing ingredient suggestions')

const mock = buildValidatedMockRecipe({
  category: 'dairy',
  recipeType: 'dessert',
  ingredients: '',
  dishIdea: 'עוגת גזר',
  cookingTime: 45,
  mood: 'cozy',
  language: 'he',
})
assert(mock?.name === 'עוגת גזר', 'valid dish should still generate locally when validation passes')

assert(detectInputViolation('מטומטם').blocked, 'category detection should catch insults')
assert(!detectInputViolation('עוגת גזר').blocked, 'category detection should allow food dishes')

console.log('\nAll input validation tests passed')
