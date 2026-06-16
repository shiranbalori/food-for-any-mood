/**
 * @deprecated Import from ./recipeInputValidation.js instead.
 * Re-exports kept so existing imports continue to work.
 */

export {
  RECIPE_INPUT_REJECTION_HE,
  RECIPE_INPUT_REJECTION_EN,
  INGREDIENT_SAFETY_REJECTION_HE,
  INGREDIENT_SAFETY_REJECTION_EN,
  BLOCKED_INGREDIENT_TERMS,
  BLOCKED_OFFENSIVE_TERMS,
  BLOCKED_NON_FOOD_OBJECT_TERMS,
  normalizeSafetyText,
  tokenMatchesBlocked,
  tokenMatchesNonFoodObject,
  fullTextMatchesBlocked,
  findInvalidIngredients,
  assessRecipeInputSafety,
  assessIngredientSafety,
  detectInputViolation,
} from './recipeInputValidation'
