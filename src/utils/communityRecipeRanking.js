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
