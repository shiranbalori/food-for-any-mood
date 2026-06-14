import { validateDishTitle } from '../src/utils/recipeTitle.js'
import { buildRealisticMealFromPattern, getBestMealPattern } from '../src/utils/mealRecipeBuilder.js'
import { buildChefIntro } from '../src/utils/chefIntro.js'
import { validateRecipeGrounding } from '../src/utils/recipeGrounding.js'

const pattern = getBestMealPattern('עגבניה, אורז', { category: 'meat' })
const built = buildRealisticMealFromPattern(pattern, {
  filteredUserIngredients: ['עגבניה', 'אורז'],
  displayNames: ['עגבניה', 'אורז'],
  language: 'he',
  cookingTime: 30,
})
const desc = buildChefIntro(built.ingredients, { chosenName: built.name, language: 'he', recipeType: 'meal', cookingTime: 30 })
console.log('title', validateDishTitle(built.name, built.ingredients, 'he', ['עגבניה', 'אורז']))
console.log('grounding', validateRecipeGrounding(['עגבניה', 'אורז'], { ...built, description: desc }))
