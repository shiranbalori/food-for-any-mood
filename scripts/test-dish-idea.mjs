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

const carrotCake = buildValidatedMockRecipe({
  category: 'dairy',
  recipeType: 'meal',
  ingredients: '',
  dishIdea: 'עוגת גזר',
  cookingTime: 45,
  mood: 'cozy',
  language: 'he',
})
assert(carrotCake?.name === 'עוגת גזר', `expected עוגת גזר, got ${carrotCake?.name}`)
const carrotCanons = ingredientCanons(carrotCake)
assert(carrotCanons.includes('flour'), `carrot cake missing flour: ${carrotCake.ingredients?.join(', ')}`)
assert(carrotCanons.includes('carrot'), `carrot cake missing carrot: ${carrotCake.ingredients?.join(', ')}`)
assert(carrotCanons.includes('egg'), `carrot cake missing egg: ${carrotCake.ingredients?.join(', ')}`)
assert(carrotCanons.includes('sugar'), `carrot cake missing sugar: ${carrotCake.ingredients?.join(', ')}`)
assert(
  carrotCanons.includes('baking powder'),
  `carrot cake missing baking powder: ${carrotCake.ingredients?.join(', ')}`,
)
assert(
  carrotCanons.includes('cinnamon'),
  `carrot cake missing cinnamon: ${carrotCake.ingredients?.join(', ')}`,
)
assert((carrotCake.steps ?? []).length >= 4, 'carrot cake needs realistic steps')
console.log('✅ dish idea carrot cake →', carrotCake.name, carrotCake.ingredients.join(' | '))

console.log('\nAll dish idea tests passed')
