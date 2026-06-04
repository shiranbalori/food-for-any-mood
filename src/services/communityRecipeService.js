import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { MOCK_COMMUNITY_RECIPES } from '../data/mockCommunityRecipes'
import { enrichCommunityRecipe } from '../utils/communityRecipeRanking'

export const COMMUNITY_RECIPE_IMAGE_BUCKET = 'community-recipe-images'
export const COMMUNITY_RECIPE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const COMMUNITY_RECIPE_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])

function averageRating(ratings) {
  if (!ratings?.length) return 0
  const sum = ratings.reduce((acc, value) => {
    const rating = typeof value === 'number' ? value : value?.rating ?? 0
    return acc + rating
  }, 0)
  return Math.round((sum / ratings.length) * 10) / 10
}

function mapMockRecipe(recipe) {
  const ratingsCount = recipe.ratingCount ?? 0
  const savesCount = recipe.likeCount ?? 0
  const viewsCount = recipe.views ?? 0
  const sharesCount = recipe.sharesCount ?? 0
  const averageRatingValue = recipe.rating ?? 0

  return enrichCommunityRecipe({
    id: recipe.id,
    title: recipe.title,
    description: '',
    ingredients: [],
    steps: [],
    category: recipe.category,
    recipeType: recipe.recipeType ?? 'meal',
    imageUrl: recipe.imageUrl ?? null,
    authorId: null,
    authorName: recipe.authorName,
    averageRating: averageRatingValue,
    rating: averageRatingValue,
    ratingCount: ratingsCount,
    totalRatings: ratingsCount,
    ratingsCount,
    views: viewsCount,
    viewsCount,
    likeCount: savesCount,
    savesCount,
    sharesCount,
    userLiked: false,
    userRating: null,
    isGlutenFree: recipe.isGlutenFree ?? false,
    createdAt: recipe.createdAt ?? null,
  })
}

function mapDbRecipe(row, { profileMap, likeCountMap, shareCountMap, ratingsByRecipe, userLikeSet, userRatingMap }) {
  const recipeRatings = ratingsByRecipe.get(row.id) ?? []
  const ratingsCount = recipeRatings.length
  const averageRatingValue = averageRating(recipeRatings)
  const savesCount = likeCountMap.get(row.id) ?? 0
  const viewsCount = row.view_count ?? 0
  const sharesCount = shareCountMap.get(row.id) ?? 0

  return enrichCommunityRecipe({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    category: row.kosher_category,
    recipeType: row.recipe_type ?? 'meal',
    imageUrl: row.image_url ?? null,
    authorId: row.user_id,
    authorName: profileMap.get(row.user_id) ?? '—',
    averageRating: averageRatingValue,
    rating: averageRatingValue,
    ratingCount: ratingsCount,
    totalRatings: ratingsCount,
    ratingsCount,
    views: viewsCount,
    viewsCount,
    likeCount: savesCount,
    savesCount,
    sharesCount,
    userLiked: userLikeSet.has(row.id),
    userRating: userRatingMap.get(row.id) ?? null,
    isGlutenFree: Boolean(row.is_gluten_free),
    createdAt: row.created_at,
  })
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

function normalizeImageExtension(file) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && ALLOWED_IMAGE_EXTENSIONS.has(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return null
}

/**
 * @param {File | null | undefined} file
 * @returns {{ ok: true } | { ok: false, code: 'INVALID_TYPE' | 'TOO_LARGE' }}
 */
export function validateCommunityRecipeImage(file) {
  if (!file) return { ok: true }

  const extension = file.name.split('.').pop()?.toLowerCase()
  const typeAllowed = ALLOWED_IMAGE_TYPES.has(file.type)
  const extensionAllowed = extension ? ALLOWED_IMAGE_EXTENSIONS.has(extension) : false

  if (!typeAllowed && !extensionAllowed) {
    return { ok: false, code: 'INVALID_TYPE' }
  }
  if (file.size > COMMUNITY_RECIPE_IMAGE_MAX_BYTES) {
    return { ok: false, code: 'TOO_LARGE' }
  }
  return { ok: true }
}

async function uploadCommunityRecipeImage(userId, recipeId, file) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')

  const extension = normalizeImageExtension(file)
  if (!extension) throw new Error('INVALID_IMAGE_TYPE')

  const path = `${userId}/${recipeId}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from(COMMUNITY_RECIPE_IMAGE_BUCKET)
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(COMMUNITY_RECIPE_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
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
      'id, user_id, title, description, ingredients, steps, kosher_category, recipe_type, image_url, is_gluten_free, view_count, created_at',
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
    supabase.from('recipe_shares').select('recipe_id').in('recipe_id', recipeIds),
    supabase.from('recipe_ratings').select('recipe_id, rating').in('recipe_id', recipeIds),
    userId
      ? supabase.from('recipe_likes').select('recipe_id').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
    userId
      ? supabase.from('recipe_ratings').select('recipe_id, rating').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]

  const [profilesRes, allLikesRes, allSharesRes, allRatingsRes, userLikesRes, userRatingsRes] =
    await Promise.all(fetches)

  if (profilesRes.error) {
    console.error('[communityRecipeService] profiles fetch:', profilesRes.error)
  }
  if (allLikesRes.error) {
    console.error('[communityRecipeService] likes fetch:', allLikesRes.error)
  }
  if (allSharesRes.error) {
    console.error('[communityRecipeService] shares fetch:', allSharesRes.error)
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
  const shareCountMap = buildCountMap(allSharesRes.data, 'recipe_id')
  const ratingsByRecipe = buildRatingsMap(allRatingsRes.data)
  const userLikeSet = new Set((userLikesRes.data ?? []).map((row) => row.recipe_id))
  const userRatingMap = new Map(
    (userRatingsRes.data ?? []).map((row) => [row.recipe_id, row.rating]),
  )

  return recipeList.map((row) =>
    mapDbRecipe(row, {
      profileMap,
      likeCountMap,
      shareCountMap,
      ratingsByRecipe,
      userLikeSet,
      userRatingMap,
    }),
  )
}

/**
 * @param {string} userId
 * @param {Object} payload
 * @param {File | null | undefined} [payload.imageFile]
 */
export async function uploadCommunityRecipe(userId, payload) {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')

  if (payload.imageFile) {
    const imageValidation = validateCommunityRecipeImage(payload.imageFile)
    if (!imageValidation.ok) {
      throw new Error(imageValidation.code)
    }
  }

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
      is_gluten_free: Boolean(payload.isGlutenFree),
    })
    .select('id')
    .single()

  if (error) throw error

  if (payload.imageFile) {
    const imageUrl = await uploadCommunityRecipeImage(userId, data.id, payload.imageFile)
    const { error: updateError } = await supabase
      .from('community_recipes')
      .update({ image_url: imageUrl })
      .eq('id', data.id)
      .eq('user_id', userId)

    if (updateError) throw updateError
  }

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

  const { error } = await supabase.from('recipe_ratings').insert({
    user_id: userId,
    recipe_id: recipeId,
    rating,
  })

  if (error?.code === '23505') {
    throw new Error('ALREADY_RATED')
  }
  if (error) throw error
}

export async function incrementRecipeViews(recipeId) {
  if (!supabase) return

  const { error } = await supabase.rpc('increment_recipe_views', {
    recipe_uuid: recipeId,
  })

  if (error) console.error('[communityRecipeService] increment views:', error)
}

/**
 * @param {string | null | undefined} userId
 * @param {string} recipeId
 */
export async function incrementRecipeShare(userId, recipeId) {
  if (!supabase) return

  const { error } = await supabase.from('recipe_shares').insert({
    recipe_id: recipeId,
    user_id: userId ?? null,
  })

  if (error) console.error('[communityRecipeService] increment share:', error)
}
