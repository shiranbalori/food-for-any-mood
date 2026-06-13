import { buildMockRecipe } from "../src/services/mockRecipeProvider.js"
import { validateRecipeCategory } from "../src/utils/recipeCategoryGuard.js"
import { validateRecipeQuality } from "../src/utils/recipeIngredientParser.js"
import { assessCategoryFit } from "../src/utils/recipeCategoryFit.js"
import { assessIngredientFeasibility } from "../src/utils/recipePreReturnValidation.js"

for (const [label, cat, type, ing] of [
  ["empty meat meal", "meat", "meal", ""],
  ["empty meat soup", "meat", "soup_stew", ""],
  ["dairy mismatch", "meat", "meal", "פסטה, שמנת, פטריות"],
  ["meat ok", "meat", "meal", "עוף, אורז, בצל"],
]) {
  const fit = assessCategoryFit(ing, { category: cat, language: "he" })
  const feas = assessIngredientFeasibility(ing, { recipeType: type, category: cat, language: "he" })
  console.log("---", label, "---")
  console.log("fit", fit.categoryOk, fit.categoryMismatch, fit.reason?.slice(0,40))
  console.log("feas", feas.recipePossible)
  if (!feas.recipePossible) continue
  const { recipe } = buildMockRecipe({ category: cat, ingredients: ing, cookingTime: 30, mood: "cozy", recipeType: type }, { language: "he" })
  const catOk = validateRecipeCategory(type, cat, recipe)
  const q = validateRecipeQuality([], recipe, "he", { recipeType: type, category: cat })
  console.log("title", recipe.name, "catOk", catOk, "quality", q.ok)
}
