/** @typedef {'new' | 'popular' | 'topRated' | 'mostSaved'} CommunityRecipeCategory */

export const COMMUNITY_RECIPE_CATEGORIES = {
  new: 'new',
  popular: 'popular',
  topRated: 'topRated',
  mostSaved: 'mostSaved',
}

/**
 * @param {Object} recipe
 */
export function enrichCommunityRecipe(recipe) {
  const viewsCount = recipe.viewsCount ?? recipe.views ?? 0
  const likeCount = recipe.likeCount ?? 0
  const savesCount = recipe.savesCount ?? 0
  const ratingsCount = recipe.ratingsCount ?? recipe.ratingCount ?? 0
  const sharesCount = recipe.sharesCount ?? 0
  const averageRating = recipe.averageRating ?? recipe.rating ?? 0
  const popularityScore =
    viewsCount * 1 + likeCount * 5 + ratingsCount * 3 + sharesCount * 10

  return {
    ...recipe,
    viewsCount,
    likeCount,
    savesCount,
    ratingsCount,
    sharesCount,
    averageRating,
    totalRatings: ratingsCount,
    rating: averageRating,
    ratingCount: ratingsCount,
    popularityScore,
  }
}

/**
 * @param {ReturnType<typeof enrichCommunityRecipe>[]} recipes
 * @param {CommunityRecipeCategory} category
 */
export function sortCommunityRecipesByCategory(recipes, category) {
  const list = [...recipes]

  switch (category) {
    case COMMUNITY_RECIPE_CATEGORIES.popular:
      return list.sort((a, b) => b.popularityScore - a.popularityScore)
    case COMMUNITY_RECIPE_CATEGORIES.topRated:
      return list.sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating
        }
        return b.totalRatings - a.totalRatings
      })
    case COMMUNITY_RECIPE_CATEGORIES.mostSaved:
      return list.sort((a, b) => b.likeCount - a.likeCount)
    case COMMUNITY_RECIPE_CATEGORIES.new:
    default:
      return list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })
  }
}

/**
 * @param {ReturnType<typeof enrichCommunityRecipe>[]} recipes
 * @param {number} [limit=5]
 */
export function getTopRatedCommunityRecipes(recipes, limit = 5) {
  return sortCommunityRecipesByCategory(
    recipes.filter((recipe) => recipe.totalRatings > 0),
    COMMUNITY_RECIPE_CATEGORIES.topRated,
  ).slice(0, limit)
}

/**
 * Current calendar week (Monday 00:00 – next Monday), local timezone.
 * @param {Date} [referenceDate]
 */
export function getCurrentWeekRange(referenceDate = new Date()) {
  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + mondayOffset)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

/**
 * @param {string | null | undefined} isoString
 * @param {Date} [referenceDate]
 */
export function isRecipeCreatedInCurrentWeek(isoString, referenceDate = new Date()) {
  if (!isoString) return false
  const created = new Date(isoString)
  if (Number.isNaN(created.getTime())) return false
  const { start, end } = getCurrentWeekRange(referenceDate)
  return created >= start && created < end
}

/**
 * Engagement score for weekly ranking: likes + saves + ratings + comments.
 * @param {Object} recipe
 */
export function getWeeklyEngagementScore(recipe) {
  const likeCount = recipe.likeCount ?? 0
  const savesCount = recipe.savesCount ?? 0
  const ratingsCount = recipe.totalRatings ?? recipe.ratingCount ?? recipe.ratingsCount ?? 0
  const commentCount = recipe.commentCount ?? 0
  return likeCount + savesCount + ratingsCount + commentCount
}

/**
 * Top community recipes from the current week by engagement score.
 * @param {ReturnType<typeof enrichCommunityRecipe>[]} recipes
 * @param {number} [limit=5]
 * @param {Date} [referenceDate]
 */
export function getWeeklyTopCommunityRecipes(recipes, limit = 5, referenceDate = new Date()) {
  return recipes
    .filter((recipe) => isRecipeCreatedInCurrentWeek(recipe.createdAt, referenceDate))
    .map((recipe) => ({
      ...recipe,
      weeklyEngagementScore: getWeeklyEngagementScore(recipe),
    }))
    .sort((a, b) => {
      if (b.weeklyEngagementScore !== a.weeklyEngagementScore) {
        return b.weeklyEngagementScore - a.weeklyEngagementScore
      }
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, limit)
}
