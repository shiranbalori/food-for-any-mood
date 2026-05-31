import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { MOCK_COMMUNITY_RECIPES } from '../data/mockCommunityRecipes'

function averageRating(ratings) {
  if (!ratings?.length) return 0
  const sum = ratings.reduce((acc, value) => {
    const rating = typeof value === 'number' ? value : value?.rating ?? 0
    return acc + rating
  }, 0)
  return Math.round((sum / ratings.length) * 10) / 10
}

function mapMockRecipe(recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    description: '',
    ingredients: [],
    steps: [],
    category: recipe.category,
    recipeType: recipe.recipeType ?? 'meal',
    authorId: null,
    authorName: recipe.authorName,
    rating: recipe.rating ?? 0,
    ratingCount: recipe.ratingCount ?? 0,
    views: recipe.views ?? 0,
    likeCount: recipe.likeCount ?? 0,
    userLiked: false,
    userRating: null,
    createdAt: null,
  }
}

function mapDbRecipe(row, { profileMap, likeCountMap, ratingsByRecipe, userLikeSet, userRatingMap }) {
  const recipeRatings = ratingsByRecipe.get(row.id) ?? []

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    category: row.kosher_category,
    recipeType: row.recipe_type ?? 'meal',
    authorId: row.user_id,
    authorName: profileMap.get(row.user_id) ?? '—',
    rating: averageRating(recipeRatings),
    ratingCount: recipeRatings.length,
    views: row.view_count ?? 0,
    likeCount: likeCountMap.get(row.id) ?? 0,
    userLiked: userLikeSet.has(row.id),
    userRating: userRatingMap.get(row.id) ?? null,
    createdAt: row.created_at,
  }
}

function buildCountMap(rows, key) {
  const map = new Map()
  for (const row of rows ?? []) {
    const id = row[key]
    map.set(id, (map.get(id) ?? 0) + 1)
  }
  return map
}

function buildRatingsMap(rows) {
  const map = new Map()
  for (const row of rows ?? []) {
    const list = map.get(row.recipe_id) ?? []
    list.push(row.rating)
    map.set(row.recipe_id, list)
  }
  return map
}

/**
 * @param {string | null | undefined} userId
 */
export async function fetchCommunityRecipes(userId) {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_COMMUNITY_RECIPES.map(mapMockRecipe)
  }

  const { data: recipes, error } = await supabase
    .from('community_recipes')
    .select(
      'id, user_id, title, description, ingredients, steps, kosher_category, recipe_type, view_count, created_at',
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[communityRecipeService] fetch failed:', error)
    throw error
  }

  const recipeList = recipes ?? []
  if (recipeList.length === 0) {
    return []
  }

  const recipeIds = recipeList.map((row) => row.id)
  const userIds = [...new Set(recipeList.map((row) => row.user_id).filter(Boolean))]

  const fetches = [
    userIds.length > 0
      ? supabase.from('profiles').select('id, display_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('recipe_likes').select('recipe_id').in('recipe_id', recipeIds),
    supabase.from('recipe_ratings').select('recipe_id, rating').in('recipe_id', recipeIds),
    userId
      ? supabase.from('recipe_likes').select('recipe_id').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
    userId
      ? supabase.from('recipe_ratings').select('recipe_id, rating').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]

  const [profilesRes, allLikesRes, allRatingsRes, userLikesRes, userRatingsRes] =
    await Promise.all(fetches)

  if (profilesRes.error) {
    console.error('[communityRecipeService] profiles fetch:', profilesRes.error)
  }
  if (allLikesRes.error) {
    console.error('[communityRecipeService] likes fetch:', allLikesRes.error)
  }
  if (allRatingsRes.error) {
    console.error('[communityRecipeService] ratings fetch:', allRatingsRes.error)
  }
  if (userLikesRes.error) {
    console.error('[communityRecipeService] user likes fetch:', userLikesRes.error)
  }
  if (userRatingsRes.error) {
    console.error('[communityRecipeService] user ratings fetch:', userRatingsRes.error)
  }

  const profileMap = new Map(
    (profilesRes.data ?? []).map((profile) => [profile.id, profile.display_name]),
  )
  const likeCountMap = buildCountMap(allLikesRes.data, 'recipe_id')
  const ratingsByRecipe = buildRatingsMap(allRatingsRes.data)
  const userLikeSet = new Set((userLikesRes.data ?? []).map((row) => row.recipe_id))
  const userRatingMap = new Map(
    (userRatingsRes.data ?? []).map((row) => [row.recipe_id, row.rating]),
  )

  return recipeList.map((row) =>
    mapDbRecipe(row, {
      profileMap,
      likeCountMap,
      ratingsByRecipe,
      userLikeSet,
      userRatingMap,
    }),
  )
}

/**
 * @param {string} userId
 * @param {Object} payload
 */
export async function uploadCommunityRecipe(userId, payload) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')

  const ingredients = payload.ingredients
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

  const steps = payload.steps
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  const { data, error } = await supabase
    .from('community_recipes')
    .insert({
      user_id: userId,
      title: payload.title.trim(),
      description: payload.description?.trim() ?? '',
      ingredients,
      steps,
      kosher_category: payload.category,
      recipe_type: payload.recipeType,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function toggleRecipeLike(userId, recipeId, currentlyLiked) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')

  if (currentlyLiked) {
    const { error } = await supabase
      .from('recipe_likes')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_id', recipeId)
    if (error) throw error
    return false
  }

  const { error } = await supabase.from('recipe_likes').insert({
    user_id: userId,
    recipe_id: recipeId,
  })
  if (error) throw error
  return true
}

export async function rateCommunityRecipe(userId, recipeId, rating) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')

  const { error } = await supabase.from('recipe_ratings').upsert(
    {
      user_id: userId,
      recipe_id: recipeId,
      rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'recipe_id,user_id' },
  )

  if (error) throw error
}

export async function incrementRecipeViews(recipeId) {
  if (!supabase) return

  const { error } = await supabase.rpc('increment_recipe_views', {
    recipe_uuid: recipeId,
  })

  if (error) console.error('[communityRecipeService] increment views:', error)
}
