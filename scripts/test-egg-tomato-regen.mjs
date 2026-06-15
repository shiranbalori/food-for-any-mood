import { buildValidatedMockRecipe } from '../src/services/aiRecipeService.js'
import { selectAndBuildDishFromPatterns } from '../src/utils/dishSelection.js'

const BASE = {
  category: 'any',
  recipeType: 'meal',
  ingredients: 'עגבניה, ביצה',
  cookingTime: 30,
  mood: 'cozy',
  language: 'he',
}

const first = buildValidatedMockRecipe(BASE)
console.log('First:', first?.name, first?.templateKey)
console.log('Has cheese:', (first?.ingredients ?? []).some((l) => /גבינ|cheese/i.test(l)))

const second = buildValidatedMockRecipe({
  ...BASE,
  excludeTemplateKeys: first?.templateKey ? [first.templateKey] : [],
  excludeTitles: first?.name ? [first.name] : [],
  excludeCookingMethods: ['poached'],
})
console.log('Regenerate:', second?.name, second?.templateKey)
console.log('Has cheese:', (second?.ingredients ?? []).some((l) => /גבינ|cheese/i.test(l)))

const ranked = selectAndBuildDishFromPatterns(['עגבניה', 'ביצה'], {
  recipeType: 'meal',
  category: 'parve',
  selectedCategory: 'any',
  userIngredientsRaw: 'עגבניה, ביצה',
  language: 'he',
  excludeTemplateKeys: ['parve_shakshuka'],
  excludeTitles: ['שקשוקה'],
  excludeCookingMethods: ['poached'],
})
console.log('Pattern pick:', ranked?.pattern?.id, ranked?.built?.name)
