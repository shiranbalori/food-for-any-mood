import { getBestSoupPattern, buildRealisticSoupFromPattern } from '../src/utils/soupRecipeBuilder.js'
import { validateRecipeCategory } from '../src/utils/recipeCategoryGuard.js'
import { buildMockRecipe } from '../src/services/mockRecipeProvider.js'

const pattern = getBestSoupPattern('עדשים, עגבניה', { category: 'vegan', language: 'he' })
console.log('pattern', pattern?.id, pattern?.nameHe)

if (pattern) {
  const built = buildRealisticSoupFromPattern(pattern, {
    filteredUserIngredients: ['עדשים', 'עגבניה'],
    displayNames: ['עדשים', 'עגבניה'],
    language: 'he',
    cookingTime: 30,
  })
  console.log('built name', built.name)
  console.log('ingredients', built.ingredients)
  console.log('steps', built.steps)
  console.log('category vegan', validateRecipeCategory('soup_stew', 'vegan', built))
}

const { recipe, meta } = buildMockRecipe(
  { category: 'vegan', ingredients: 'עדשים, עגבניה', cookingTime: 30, mood: 'cozy', recipeType: 'soup_stew' },
  { language: 'he' },
)
console.log('mock', recipe?.name, meta?.templateKey)
