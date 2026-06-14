import { generateAppRecipe } from '../src/services/recipeService.js'

const result = await generateAppRecipe(
  {
    category: 'dairy',
    ingredients: 'קמח, גבינה, חלב',
    cookingTime: 30,
    mood: 'cozy',
    recipeType: 'dessert',
  },
  { language: 'he' },
)

const conflict = result.recipePossible === false && Boolean(result.recipe)
console.log('recipePossible:', result.recipePossible)
console.log('title:', result.recipe?.name ?? result.impossibleReason)
console.log('conflict:', conflict)
process.exit(conflict ? 1 : result.recipe ? 0 : 1)
