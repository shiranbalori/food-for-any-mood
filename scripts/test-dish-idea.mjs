import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'
import { buildRecipeFromDishIdea } from '../src/utils/dishIdeaGeneration.js'
import { canonicalIngredient } from '../src/data/ingredientKnowledge.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function ingredientCanons(recipe) {
  return (recipe?.ingredients ?? []).map((line) => canonicalIngredient(line)).filter(Boolean)
}

const cheesecake = buildRecipeFromDishIdea('Cheesecake', {
  category: 'any',
  ingredients: '',
  language: 'en',
})
assert(cheesecake?.built?.name, 'cheesecake build failed')
assert((cheesecake.built.ingredients ?? []).length >= 5, 'cheesecake missing ingredients')
assert(cheesecake.baseIngredientsAdded, 'cheesecake should flag base ingredients')
console.log('✅ dish idea cheesecake', cheesecake.built.name, cheesecake.built.ingredients.length, 'items')

const shakshuka = buildValidatedMockRecipe({
  category: 'parve',
  recipeType: 'meal',
  ingredients: '',
  dishIdea: 'Shakshuka',
  cookingTime: 30,
  mood: 'cozy',
  language: 'en',
})
assert(/shakshuka/i.test(shakshuka?.name ?? ''), `expected shakshuka, got ${shakshuka?.name}`)
assert(shakshuka?.baseIngredientsAdded, 'shakshuka should add base ingredients')
console.log('✅ dish idea shakshuka only →', shakshuka.name)

const pancakes = buildValidatedMockRecipe({
  category: 'dairy',
  recipeType: 'meal',
  ingredients: 'egg',
  dishIdea: 'Pancakes',
  cookingTime: 20,
  mood: 'cozy',
  language: 'en',
})
assert(/pancake/i.test(pancakes?.name ?? ''), `expected pancakes, got ${pancakes?.name}`)
const pancakeCanons = ingredientCanons(pancakes)
assert(
  pancakeCanons.includes('baking powder'),
  `pancakes missing baking powder: ${pancakes.ingredients?.join(', ')}`,
)
assert(
  pancakeCanons.includes('salt'),
  `pancakes missing salt: ${pancakes.ingredients?.join(', ')}`,
)
assert(
  !pancakeCanons.some((canon) => ['oil', 'olive', 'olive oil'].includes(canon)),
  `pancakes should not include oil/olive oil: ${pancakes.ingredients?.join(', ')}`,
)
console.log('✅ dish idea pancakes quality →', pancakes.name, pancakes.ingredients.join(' | '))

console.log('\nAll dish idea tests passed')
