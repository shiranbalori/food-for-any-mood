/**
 * Score for weekly winner selection: likes, engagement (photo/description).
 * @param {{ likeCount?: number, photoUrl?: string | null, description?: string }} submission
 */
export function scoreChallengeSubmission(submission) {
  const likes = submission.likeCount ?? 0
  const photoBonus = submission.photoUrl ? 3 : 0
  const descBonus = submission.description?.trim() ? 1 : 0
  const engagement = photoBonus + descBonus + likes
  return likes * 10 + engagement
}

/**
 * @param {Array<{ likeCount?: number, photoUrl?: string | null, description?: string }>} submissions
 */
export function pickBestSubmission(submissions) {
  if (!submissions?.length) return null
  return [...submissions].sort((a, b) => scoreChallengeSubmission(b) - scoreChallengeSubmission(a))[0]
}
