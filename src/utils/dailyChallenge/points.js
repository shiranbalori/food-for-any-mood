export const POINT_AWARDS = {
  PARTICIPATION: 5,
  PHOTO: 2,
  FIVE_LIKES: 3,
  TOP_WEEKLY: 5,
  STREAK_3: 2,
  STREAK_7: 5,
  STREAK_30: 20,
  QUIZ_CORRECT: 2,
}

/**
 * @param {{ hasPhoto?: boolean }} options
 */
export function pointsForSubmission(options = {}) {
  let points = POINT_AWARDS.PARTICIPATION
  if (options.hasPhoto) points += POINT_AWARDS.PHOTO
  return points
}
