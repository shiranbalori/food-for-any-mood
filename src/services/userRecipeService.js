import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import {
  handleSupabaseTableResult,
  isSupabaseTableUsable,
  markSupabaseTableMissing,
} from '../lib/supabaseTableGuard'

/** @typedef {'dairy' | 'meat' | 'parve' | 'any'} KosherCategory */
/** @typedef {'meal' | 'dessert'} RecipeType */

/**
 * @typedef {Object} UserRecipe
 * @property {string} id
 * @property {string} userId
 * @property {string} title
 * @property {string} description
 * @property {string[]} ingredients
 * @property {string[]} steps
 * @property {KosherCategory} category
 * @property {RecipeType} recipeType
 * @property {number} cookingTime
 * @property {number} servings
 * @property {string | null} sharedCommunityRecipeId
 * @property {string | null} createdAt
 */

const USER_RECIPES_TABLE = 'user_recipes'

function mapDbRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? '',
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    category: row.kosher_category,
    recipeType: row.recipe_type ?? 'meal',
    cookingTime: row.cooking_time ?? 30,
    servings: row.servings ?? 4,
    sharedCommunityRecipeId: row.shared_community_recipe_id ?? null,
    createdAt: row.created_at,
  }
}

function parseListField(value) {
  return String(value ?? '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseStepsField(value) {
  return String(value ?? '')
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function assertUserRecipesTableReady() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  if (!isSupabaseTableUsable(USER_RECIPES_TABLE)) throw new Error('USER_RECIPES_UNAVAILABLE')
}

function handleUserRecipesMutationError(error) {
  if (markSupabaseTableMissing(USER_RECIPES_TABLE, error)) {
    throw new Error('USER_RECIPES_UNAVAILABLE')
  }
  throw error
}

/** Map private "any" to a community-safe kosher category. */
export function kosherCategoryForCommunity(category) {
  return category === 'any' ? 'parve' : category
}

/**
 * @param {string} userId
 * @returns {Promise<UserRecipe[]>}
 */
export async function fetchUserRecipes(userId) {
  if (!supabase || !userId) return []
  if (!isSupabaseTableUsable(USER_RECIPES_TABLE)) return []

  const { data, error } = await supabase
    .from(USER_RECIPES_TABLE)
    .select(
      'id, user_id, title, description, ingredients, steps, kosher_category, recipe_type, cooking_time, servings, shared_community_recipe_id, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const result = handleSupabaseTableResult(USER_RECIPES_TABLE, { data, error }, [])
  if (result.error) {
    console.error('[userRecipeService] fetch failed:', result.error)
    return []
  }

  return (result.data ?? []).map(mapDbRow)
}

/**
 * @param {string} userId
 * @param {Object} payload
 */
export async function createUserRecipe(userId, payload) {
  if (!supabase || !userId) throw new Error('SUPABASE_NOT_CONFIGURED')
  assertUserRecipesTableReady()

  const ingredients = parseListField(payload.ingredients)
  const steps = parseStepsField(payload.steps)

  if (!payload.title?.trim() || ingredients.length === 0 || steps.length === 0) {
    throw new Error('VALIDATION_FAILED')
  }

  const { data, error } = await supabase
    .from(USER_RECIPES_TABLE)
    .insert({
      user_id: userId,
      title: payload.title.trim(),
      description: payload.description?.trim() ?? '',
      ingredients,
      steps,
      kosher_category: payload.category,
      recipe_type: payload.recipeType ?? 'meal',
      cooking_time: payload.cookingTime ?? 30,
      servings: payload.servings ?? 4,
    })
    .select(
      'id, user_id, title, description, ingredients, steps, kosher_category, recipe_type, cooking_time, servings, shared_community_recipe_id, created_at',
    )
    .single()

  if (error) handleUserRecipesMutationError(error)
  return mapDbRow(data)
}

/**
 * @param {string} userId
 * @param {string} recipeId
 */
export async function deleteUserRecipe(userId, recipeId) {
  if (!supabase || !userId) throw new Error('SUPABASE_NOT_CONFIGURED')
  assertUserRecipesTableReady()

  const { data: row, error: fetchError } = await supabase
    .from(USER_RECIPES_TABLE)
    .select('shared_community_recipe_id')
    .eq('id', recipeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) handleUserRecipesMutationError(fetchError)

  if (row?.shared_community_recipe_id) {
    const { error: communityDeleteError } = await supabase
      .from('community_recipes')
      .delete()
      .eq('id', row.shared_community_recipe_id)
      .eq('user_id', userId)

    if (communityDeleteError) throw communityDeleteError
  }

  const { error } = await supabase
    .from(USER_RECIPES_TABLE)
    .delete()
    .eq('id', recipeId)
    .eq('user_id', userId)

  if (error) handleUserRecipesMutationError(error)
}

/**
 * Publish a copy to community_recipes and link the private row.
 * @param {string} userId
 * @param {UserRecipe} recipe
 * @returns {Promise<string>} community recipe id
 */
export async function shareUserRecipeToCommunity(userId, recipe) {
  if (!supabase || !userId) throw new Error('SUPABASE_NOT_CONFIGURED')
  assertUserRecipesTableReady()
  if (recipe.sharedCommunityRecipeId) {
    throw new Error('ALREADY_SHARED')
  }

  const { data: communityRow, error: insertError } = await supabase
    .from('community_recipes')
    .insert({
      user_id: userId,
      title: recipe.title,
      description: recipe.description ?? '',
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      kosher_category: kosherCategoryForCommunity(recipe.category),
      recipe_type: recipe.recipeType,
      is_gluten_free: false,
    })
    .select('id')
    .single()

  if (insertError) throw insertError

  const { error: updateError } = await supabase
    .from(USER_RECIPES_TABLE)
    .update({
      shared_community_recipe_id: communityRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recipe.id)
    .eq('user_id', userId)

  if (updateError) handleUserRecipesMutationError(updateError)

  return communityRow.id
}

/**
 * Remove the community copy and keep the private recipe (owner only).
 * @param {string} userId
 * @param {UserRecipe} recipe
 */
export async function unshareUserRecipeFromCommunity(userId, recipe) {
  if (!supabase || !userId) throw new Error('SUPABASE_NOT_CONFIGURED')
  assertUserRecipesTableReady()

  const communityId = recipe.sharedCommunityRecipeId
  if (!communityId) {
    throw new Error('NOT_SHARED')
  }

  const { error: deleteError } = await supabase
    .from('community_recipes')
    .delete()
    .eq('id', communityId)
    .eq('user_id', userId)

  if (deleteError) throw deleteError

  const { error: updateError } = await supabase
    .from(USER_RECIPES_TABLE)
    .update({
      shared_community_recipe_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recipe.id)
    .eq('user_id', userId)

  if (updateError) handleUserRecipesMutationError(updateError)
}

/** Whether the private recipe is currently published to the community. */
export function isUserRecipeShared(recipe) {
  return Boolean(recipe?.sharedCommunityRecipeId)
}

export function isUserRecipesAvailable() {
  return isSupabaseConfigured && Boolean(supabase)
}
