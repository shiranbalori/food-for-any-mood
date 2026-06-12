import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'
import { validateRecipeCategory } from '../src/utils/recipeCategoryGuard.js'
import { validateRecipeQuality } from '../src/utils/recipeIngredientParser.js'
import { assessIngredientSafety } from '../src/utils/ingredientSafetyValidation.js'
import { assessIngredientFeasibility } from '../src/utils/recipePreReturnValidation.js'
import { validateRecipeDiversity } from '../src/utils/recipeDiversity.js'
import { parseUserIngredients } from '../src/utils/ingredientRelevance.js'

const cases = [
  { name: 'dessert flour', ingredients: 'קמח, סוכר, חמאה, קינמון', recipeType: 'dessert', category: 'dairy' },
  { name: 'meal eggs', ingredients: 'ביצים, עגבניות, בצל', recipeType: 'meal', category: 'parve' },
  { name: 'meal pasta', ingredients: 'פסטה, שמנת, פטריות', recipeType: 'meal', category: 'dairy' },
  { name: 'empty soup dairy', ingredients: '', recipeType: 'soup_stew', category: 'dairy' },
  { name: 'empty soup vegan', ingredients: '', recipeType: 'soup_stew', category: 'vegan' },
  { name: 'empty meal dairy', ingredients: '', recipeType: 'meal', category: 'dairy' },
  { name: 'empty meal vegan', ingredients: '', recipeType: 'meal', category: 'vegan' },
]

for (const c of cases) {
  const safety = assessIngredientSafety(c.ingredients, { language: 'he' })
  const feas = assessIngredientFeasibility(c.ingredients, {
    recipeType: c.recipeType,
    category: c.category,
    language: 'he',
  })
  const { recipe } = buildMockRecipe(
    {
      category: c.category,
      ingredients: c.ingredients,
      cookingTime: 30,
      mood: 'cozy',
      recipeType: c.recipeType,
    },
    { language: 'he' },
  )
  const userList = parseUserIngredients(c.ingredients)
  const catOk = validateRecipeCategory(c.recipeType, c.category, recipe)
  const quality = validateRecipeQuality(userList, recipe, 'he', {
    recipeType: c.recipeType,
    category: c.category,
  })
  console.log('---', c.name, '---')
  console.log('safety', safety.ok, 'feas', feas.recipePossible, 'cat', catOk, 'quality', quality.ok)
  console.log('title:', recipe.name)
  if (!quality.ok) {
    console.log(
      '  failed:',
      Object.entries(quality.checks ?? {})
        .filter(([, v]) => !v)
        .map(([k]) => k),
    )
  }
}

console.log('\n=== Regenerate diversity (empty soup dairy) ===')
const first = buildMockRecipe(
  { category: 'dairy', ingredients: '', cookingTime: 30, mood: 'cozy', recipeType: 'soup_stew' },
  { language: 'he' },
)
const second = buildMockRecipe(
  { category: 'dairy', ingredients: '', cookingTime: 30, mood: 'cozy', recipeType: 'soup_stew' },
  {
    language: 'he',
    excludeTitles: [first.recipe.name],
    excludeTemplateKeys: [first.meta.templateKey],
  },
)
const div = validateRecipeDiversity(second.recipe, {
  recipeType: 'soup_stew',
  excludeTitles: [first.recipe.name],
})
console.log('first:', first.recipe.name, 'key:', first.meta.templateKey)
console.log('second:', second.recipe.name, 'key:', second.meta.templateKey, 'same?', first.recipe.name === second.recipe.name, 'divOk', div.ok)

for (const [label, cat, type] of [
  ['empty soup vegan', 'vegan', 'soup_stew'],
  ['empty meal dairy', 'dairy', 'meal'],
  ['empty meal vegan', 'vegan', 'meal'],
]) {
  const a = buildMockRecipe(
    { category: cat, ingredients: '', cookingTime: 30, mood: 'cozy', recipeType: type },
    { language: 'he' },
  )
  const b = buildMockRecipe(
    { category: cat, ingredients: '', cookingTime: 30, mood: 'cozy', recipeType: type },
    {
      language: 'he',
      excludeTitles: [a.recipe.name],
      excludeTemplateKeys: [a.meta.templateKey],
    },
  )
  console.log(`\n=== Regenerate ${label} ===`)
  console.log('first:', a.recipe.name)
  console.log('second:', b.recipe.name, 'same?', a.recipe.name === b.recipe.name)
}
