import { buildPreferenceCategoryRecipe } from '../src/services/aiRecipeService.js'
import { validateRecipeCategory, recipeHasDairy, recipeHasLandMeat, recipeHasMeat, isVeganValid } from '../src/utils/recipeCategoryGuard.js'

const categories = [
  { cat: 'dairy', check: (r) => recipeHasDairy(r) && !recipeHasLandMeat(r) },
  { cat: 'meat', check: (r) => recipeHasMeat(r) && !recipeHasDairy(r) },
  { cat: 'vegan', check: (r) => isVeganValid(r) },
  { cat: 'parve', check: (r) => !recipeHasLandMeat(r) && !recipeHasDairy(r) },
]

let totalPass = 0
let totalFail = 0

for (const { cat, check } of categories) {
  let passed = 0
  const failures = []
  for (let i = 0; i < 10; i += 1) {
    const recipe = buildPreferenceCategoryRecipe({
      category: cat,
      ingredients: '',
      cookingTime: 30,
      mood: 'cozy',
      recipeType: 'meal',
      language: 'he',
      isGlutenFree: false,
    })
    const catOk = recipe && validateRecipeCategory('meal', cat, recipe)
    const categoryContentOk = recipe && check(recipe)
    if (recipe?.name && catOk && categoryContentOk) {
      passed += 1
    } else {
      failures.push({ i, title: recipe?.name, catOk, categoryContentOk })
    }
  }
  totalPass += passed
  totalFail += 10 - passed
  console.log(`${cat}: ${passed}/10`, failures.length ? failures.slice(0, 2) : '')
}

console.log(`\nTotal: ${totalPass}/40 successful`)
if (totalFail) process.exit(1)
