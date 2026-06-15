import { buildIngredientFirstFallbackRecipe } from '../src/services/mockRecipeProvider.js'

const cases = [
  ['potato+onion', { category: 'parve', recipeType: 'meal', ingredients: 'תפוח אדמה, בצל' }],
  ['tuna+corn', { category: 'parve', recipeType: 'meal', ingredients: 'טונה, תירס' }],
  ['mushroom+cream', { category: 'dairy', recipeType: 'meal', ingredients: 'פטריות, שמנת' }],
  ['chickpea', { category: 'vegan', recipeType: 'meal', ingredients: 'חומוס' }],
  ['carrot+flour', { category: 'dairy', recipeType: 'dessert', ingredients: 'גזר, קמח' }],
]

for (const [label, params] of cases) {
  const { recipe, meta } = buildIngredientFirstFallbackRecipe(
    { ...params, cookingTime: 30, mood: 'cozy', isGlutenFree: false, musicPlatform: 'spotify' },
    { language: 'he' },
  )
  console.log(label, '→', recipe.name, '|', meta.templateKey)
}
