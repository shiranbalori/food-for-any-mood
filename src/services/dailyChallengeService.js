import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getUnlockedAchievements } from '../utils/dailyChallenge/achievements'
import {
  generateDailyChallenge,
  getChallengeDateKey,
  getPastChallengeDateKeys,
} from '../utils/dailyChallenge/generateDailyChallenge'
import { pickBestSubmission } from '../utils/dailyChallenge/weeklyWinner'
import { applyStreakOnSubmission } from '../utils/dailyChallenge/streaks'
import { POINT_AWARDS, pointsForSubmission } from '../utils/dailyChallenge/points'

export const CHALLENGE_IMAGE_BUCKET = 'challenge-submission-images'
export const CHALLENGE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const CHALLENGE_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp'

const LS_SUBMISSIONS = 'ffam_challenge_submissions'
const LS_GAMIFICATION = 'ffam_user_gamification'
const LS_LIKES = 'ffam_challenge_submission_likes'

export function isDailyChallengeAvailable() {
  return true
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function defaultGamification(userId) {
  return {
    userId,
    displayName: null,
    totalPoints: 0,
    challengesCompleted: 0,
    photosUploaded: 0,
    likesReceived: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastChallengeDate: null,
    unlockedAchievements: [],
    weeklyTopAwards: [],
    fiveLikeAwards: [],
    quizzesAnswered: 0,
    quizCorrectCount: 0,
    // quiz streak fields (additive — challenge fields above are unchanged)
    quizCurrentStreak: 0,
    quizLongestStreak: 0,
    lastQuizDate: null,
    quizStreakBonusCount: 0,
    quizCorrectStreak: 0,
    quizCorrectStreakBonusCount: 0,
  }
}

function sortLeaderboardEntries(a, b) {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
  if (b.challengesCompleted !== a.challengesCompleted) {
    return b.challengesCompleted - a.challengesCompleted
  }
  return (b.currentStreak ?? 0) - (a.currentStreak ?? 0)
}

function applySubmissionGamification(stats, challengeDate, authorName, hasPhoto) {
  const award = pointsForSubmission({ hasPhoto })
  const { stats: withStreak, streakBonus } = applyStreakOnSubmission(stats, challengeDate)
  return applyPoints(withStreak, award + streakBonus, {
    displayName: authorName ?? withStreak.displayName,
    challengesCompleted: withStreak.challengesCompleted + 1,
    photosUploaded: withStreak.photosUploaded + (hasPhoto ? 1 : 0),
  })
}

function getWeekStartKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() - (day - 1))
  return utc.toISOString().slice(0, 10)
}

function weeklyAwardKey(weekKey, submissionId) {
  return `${weekKey}:${submissionId}`
}

async function getWeeklyTopSubmissions(limit = 5) {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 7)
  const sinceIso = since.toISOString()

  if (!isSupabaseConfigured || !supabase) {
    const likes = readJson(LS_LIKES, {})
    const likeCountBySubmission = new Map()
    for (const key of Object.keys(likes)) {
      const submissionId = key.split(':').slice(1).join(':')
      likeCountBySubmission.set(submissionId, (likeCountBySubmission.get(submissionId) ?? 0) + 1)
    }

    return getAllLocalSubmissions()
      .filter((item) => item.createdAt >= sinceIso)
      .map((item) => ({
        id: item.id,
        userId: item.userId,
        likeCount: likeCountBySubmission.get(item.id) ?? item.likeCount ?? 0,
      }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, limit)
  }

  const { data, error } = await supabase
    .from('challenge_submissions')
    .select('id, user_id, created_at')
    .gte('created_at', sinceIso)

  if (error || !data?.length) return []

  const ids = data.map((row) => row.id)
  const { data: likesData } = await supabase
    .from('challenge_submission_likes')
    .select('submission_id')
    .in('submission_id', ids)

  const likeCountMap = new Map()
  for (const like of likesData ?? []) {
    likeCountMap.set(like.submission_id, (likeCountMap.get(like.submission_id) ?? 0) + 1)
  }

  return data
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      likeCount: likeCountMap.get(row.id) ?? 0,
    }))
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, limit)
}

async function processWeeklyTopAwards() {
  const weekKey = getWeekStartKey()
  const topSubmissions = await getWeeklyTopSubmissions(5)

  for (const submission of topSubmissions) {
    if (!submission.userId || submission.likeCount <= 0) continue
    const awardKey = weeklyAwardKey(weekKey, submission.id)

    if (!isSupabaseConfigured || !supabase) {
      let stats = getLocalGamification(submission.userId)
      if (stats.weeklyTopAwards.includes(awardKey)) continue
      stats = applyPoints(stats, POINT_AWARDS.TOP_WEEKLY, {
        weeklyTopAwards: [...stats.weeklyTopAwards, awardKey],
      })
      saveLocalGamification(submission.userId, stats)
      continue
    }

    let stats = await loadGamificationStats(submission.userId)
    if (stats.weeklyTopAwards.includes(awardKey)) continue
    stats = applyPoints(stats, POINT_AWARDS.TOP_WEEKLY, {
      weeklyTopAwards: [...stats.weeklyTopAwards, awardKey],
    })
    await upsertGamification(stats)
  }
}

async function loadGamificationStats(userId) {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalGamification(userId)
  }

  const { data, error } = await supabase
    .from('user_gamification')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[dailyChallengeService] gamification fetch:', error)
    return getLocalGamification(userId)
  }

  if (!data) return defaultGamification(userId)
  return mapDbGamification(data)
}

async function adjustOwnerLikes(ownerId, delta, submissionId, likeCount) {
  if (!ownerId || delta === 0) return

  let stats = await loadGamificationStats(ownerId)
  const patch = {
    likesReceived: Math.max(0, (stats.likesReceived ?? 0) + delta),
  }

  if (likeCount >= 5 && delta > 0 && !stats.fiveLikeAwards.includes(submissionId)) {
    stats = applyPoints(stats, POINT_AWARDS.FIVE_LIKES, {
      ...patch,
      fiveLikeAwards: [...stats.fiveLikeAwards, submissionId],
    })
    await upsertGamification(stats)
    return
  }

  stats = applyPoints(stats, 0, patch)
  await upsertGamification(stats)
}

function syncAchievements(stats) {
  return getUnlockedAchievements(stats, stats.unlockedAchievements ?? [])
}

function applyPoints(stats, delta, patch = {}) {
  const next = {
    ...stats,
    ...patch,
    totalPoints: Math.max(0, (stats.totalPoints ?? 0) + delta),
  }
  next.unlockedAchievements = syncAchievements(next)
  return next
}

function getLocalGamification(userId) {
  const all = readJson(LS_GAMIFICATION, {})
  return all[userId] ? { ...defaultGamification(userId), ...all[userId] } : defaultGamification(userId)
}

function saveLocalGamification(userId, stats) {
  const all = readJson(LS_GAMIFICATION, {})
  all[userId] = stats
  writeJson(LS_GAMIFICATION, all)
}

function getLocalSubmissions(challengeDate) {
  const all = readJson(LS_SUBMISSIONS, [])
  return all.filter((item) => item.challengeDate === challengeDate)
}

function getAllLocalSubmissions() {
  return readJson(LS_SUBMISSIONS, [])
}

function saveLocalSubmission(submission) {
  const all = getAllLocalSubmissions()
  all.unshift(submission)
  writeJson(LS_SUBMISSIONS, all)
}

function mapDbGamification(row) {
  if (!row) return null
  const stats = {
    userId: row.user_id,
    totalPoints: row.total_points ?? 0,
    challengesCompleted: row.challenges_completed ?? 0,
    photosUploaded: row.photos_uploaded ?? 0,
    likesReceived: row.likes_received ?? 0,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    lastChallengeDate: row.last_challenge_date ?? null,
    unlockedAchievements: row.unlocked_achievements ?? [],
    weeklyTopAwards: row.weekly_top_awards ?? [],
    fiveLikeAwards: row.five_like_awards ?? [],
    quizzesAnswered: row.quizzes_answered ?? 0,
    quizCorrectCount: row.quiz_correct_count ?? 0,
    // quiz streak fields (additive — challenge columns above are unchanged)
    quizCurrentStreak: row.quiz_current_streak ?? 0,
    quizLongestStreak: row.quiz_longest_streak ?? 0,
    lastQuizDate: row.last_quiz_date ?? null,
    quizStreakBonusCount: row.quiz_streak_bonus_count ?? 0,
    quizCorrectStreak: row.quiz_correct_streak ?? 0,
    quizCorrectStreakBonusCount: row.quiz_correct_streak_bonus_count ?? 0,
  }
  stats.unlockedAchievements = syncAchievements(stats)
  return stats
}

export async function awardGamificationPoints(userId, delta, patch = {}) {
  let stats = await loadGamificationStats(userId)
  stats = applyPoints(stats, delta, patch)
  return upsertGamification(stats)
}

export function getTodayChallenge() {
  return generateDailyChallenge(getChallengeDateKey())
}

export async function fetchUserGamification(userId) {
  if (!userId) return defaultGamification('guest')

  await processWeeklyTopAwards()
  return loadGamificationStats(userId)
}

async function upsertGamification(stats) {
  if (!isSupabaseConfigured || !supabase) {
    saveLocalGamification(stats.userId, stats)
    return stats
  }

  const { error } = await supabase.from('user_gamification').upsert(
    {
      user_id: stats.userId,
      total_points: stats.totalPoints,
      challenges_completed: stats.challengesCompleted,
      photos_uploaded: stats.photosUploaded,
      likes_received: stats.likesReceived,
      current_streak: stats.currentStreak ?? 0,
      longest_streak: stats.longestStreak ?? 0,
      last_challenge_date: stats.lastChallengeDate ?? null,
      unlocked_achievements: stats.unlockedAchievements,
      weekly_top_awards: stats.weeklyTopAwards,
      five_like_awards: stats.fiveLikeAwards,
      quizzes_answered: stats.quizzesAnswered ?? 0,
      quiz_correct_count: stats.quizCorrectCount ?? 0,
      // quiz streak fields (additive — challenge columns above are unchanged)
      quiz_current_streak: stats.quizCurrentStreak ?? 0,
      quiz_longest_streak: stats.quizLongestStreak ?? 0,
      last_quiz_date: stats.lastQuizDate ?? null,
      quiz_streak_bonus_count: stats.quizStreakBonusCount ?? 0,
      quiz_correct_streak: stats.quizCorrectStreak ?? 0,
      quiz_correct_streak_bonus_count: stats.quizCorrectStreakBonusCount ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    console.error('[dailyChallengeService] gamification upsert:', error)
    saveLocalGamification(stats.userId, stats)
  }
  return stats
}

function mapSubmission(row, profileName, likeCount = 0, userLiked = false) {
  return {
    id: row.id,
    challengeDate: row.challenge_date,
    userId: row.user_id,
    authorName: profileName ?? '—',
    dishName: row.dish_name,
    description: row.description ?? '',
    photoUrl: row.photo_url ?? null,
    likeCount,
    userLiked,
    createdAt: row.created_at,
  }
}

export async function fetchChallengeSubmissions(challengeDate, userId) {
  if (!isSupabaseConfigured || !supabase) {
    const submissions = getLocalSubmissions(challengeDate)
    const likes = readJson(LS_LIKES, {})
    return submissions.map((item) => ({
      ...item,
      likeCount: item.likeCount ?? 0,
      userLiked: Boolean(userId && likes[`${userId}:${item.id}`]),
    }))
  }

  const { data, error } = await supabase
    .from('challenge_submissions')
    .select('id, challenge_date, user_id, dish_name, description, photo_url, created_at')
    .eq('challenge_date', challengeDate)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[dailyChallengeService] submissions fetch:', error)
    return []
  }

  const rows = data ?? []
  if (rows.length === 0) return []

  const ids = rows.map((row) => row.id)
  const userIds = [...new Set(rows.map((row) => row.user_id))]

  const [profilesRes, likesRes, userLikesRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', userIds),
    supabase.from('challenge_submission_likes').select('submission_id').in('submission_id', ids),
    userId
      ? supabase
          .from('challenge_submission_likes')
          .select('submission_id')
          .eq('user_id', userId)
          .in('submission_id', ids)
      : Promise.resolve({ data: [], error: null }),
  ])

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.display_name]))
  const likeCountMap = new Map()
  for (const like of likesRes.data ?? []) {
    likeCountMap.set(like.submission_id, (likeCountMap.get(like.submission_id) ?? 0) + 1)
  }
  const userLikeSet = new Set((userLikesRes.data ?? []).map((row) => row.submission_id))

  return rows.map((row) =>
    mapSubmission(
      row,
      profileMap.get(row.user_id),
      likeCountMap.get(row.id) ?? 0,
      userLikeSet.has(row.id),
    ),
  )
}

export async function fetchAllChallengeSubmissions(userId, limit = 50) {
  if (!isSupabaseConfigured || !supabase) {
    const likes = readJson(LS_LIKES, {})
    return getAllLocalSubmissions()
      .slice(0, limit)
      .map((item) => ({
        ...item,
        userLiked: Boolean(userId && likes[`${userId}:${item.id}`]),
      }))
  }

  const { data, error } = await supabase
    .from('challenge_submissions')
    .select('id, challenge_date, user_id, dish_name, description, photo_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[dailyChallengeService] all submissions fetch:', error)
    return []
  }

  const rows = data ?? []
  const ids = rows.map((row) => row.id)
  const userIds = [...new Set(rows.map((row) => row.user_id))]

  const [profilesRes, likesRes, userLikesRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', userIds),
    ids.length
      ? supabase.from('challenge_submission_likes').select('submission_id').in('submission_id', ids)
      : Promise.resolve({ data: [], error: null }),
    userId && ids.length
      ? supabase
          .from('challenge_submission_likes')
          .select('submission_id')
          .eq('user_id', userId)
          .in('submission_id', ids)
      : Promise.resolve({ data: [], error: null }),
  ])

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.display_name]))
  const likeCountMap = new Map()
  for (const like of likesRes.data ?? []) {
    likeCountMap.set(like.submission_id, (likeCountMap.get(like.submission_id) ?? 0) + 1)
  }
  const userLikeSet = new Set((userLikesRes.data ?? []).map((row) => row.submission_id))

  return rows.map((row) =>
    mapSubmission(
      row,
      profileMap.get(row.user_id),
      likeCountMap.get(row.id) ?? 0,
      userLikeSet.has(row.id),
    ),
  )
}

async function uploadChallengePhoto(userId, submissionId, file) {
  if (!supabase) return null
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${submissionId}.${extension}`
  const { error } = await supabase.storage.from(CHALLENGE_IMAGE_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  })
  if (error) throw error
  const { data } = supabase.storage.from(CHALLENGE_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function submitDailyChallenge(userId, authorName, payload) {
  const challengeDate = getChallengeDateKey()
  const hasPhoto = Boolean(payload.imageFile)

  if (!isSupabaseConfigured || !supabase) {
    const existing = getLocalSubmissions(challengeDate).find((item) => item.userId === userId)
    if (existing) throw new Error('ALREADY_SUBMITTED')

    const submission = {
      id: `local-${userId}-${challengeDate}`,
      challengeDate,
      userId,
      authorName,
      dishName: payload.dishName.trim(),
      description: payload.description?.trim() ?? '',
      photoUrl: hasPhoto ? URL.createObjectURL(payload.imageFile) : null,
      likeCount: 0,
      userLiked: false,
      createdAt: new Date().toISOString(),
    }
    saveLocalSubmission(submission)

    let stats = getLocalGamification(userId)
    stats = applySubmissionGamification(stats, challengeDate, authorName, hasPhoto)
    saveLocalGamification(userId, stats)
    return submission
  }

  const { data: existing } = await supabase
    .from('challenge_submissions')
    .select('id')
    .eq('challenge_date', challengeDate)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) throw new Error('ALREADY_SUBMITTED')

  const { data, error } = await supabase
    .from('challenge_submissions')
    .insert({
      challenge_date: challengeDate,
      user_id: userId,
      dish_name: payload.dishName.trim(),
      description: payload.description?.trim() ?? '',
    })
    .select('id, challenge_date, user_id, dish_name, description, photo_url, created_at')
    .single()

  if (error) throw error

  let photoUrl = null
  if (payload.imageFile) {
    photoUrl = await uploadChallengePhoto(userId, data.id, payload.imageFile)
    await supabase.from('challenge_submissions').update({ photo_url: photoUrl }).eq('id', data.id)
    data.photo_url = photoUrl
  }

  let stats = await loadGamificationStats(userId)
  stats = applySubmissionGamification(stats, challengeDate, authorName, hasPhoto)
  await upsertGamification(stats)

  return mapSubmission(data, authorName, 0, false)
}

export async function toggleChallengeSubmissionLike(userId, submissionId, currentlyLiked, ownerId) {
  if (!isSupabaseConfigured || !supabase) {
    const likes = readJson(LS_LIKES, {})
    const key = `${userId}:${submissionId}`
    const all = getAllLocalSubmissions()
    const submission = all.find((item) => item.id === submissionId)
    if (!submission) return false

    if (currentlyLiked) {
      delete likes[key]
      submission.likeCount = Math.max(0, (submission.likeCount ?? 0) - 1)
    } else {
      likes[key] = true
      submission.likeCount = (submission.likeCount ?? 0) + 1
    }
    writeJson(LS_LIKES, likes)
    writeJson(LS_SUBMISSIONS, all)

    if (ownerId) {
      const ownerStats = getLocalGamification(ownerId)
      const nextLikes = Math.max(0, (ownerStats.likesReceived ?? 0) + (currentlyLiked ? -1 : 1))
      let nextStats = applyPoints(ownerStats, 0, { likesReceived: nextLikes })
      if (!currentlyLiked && submission.likeCount >= 5 && !ownerStats.fiveLikeAwards.includes(submissionId)) {
        nextStats = applyPoints(nextStats, POINT_AWARDS.FIVE_LIKES, {
          fiveLikeAwards: [...nextStats.fiveLikeAwards, submissionId],
        })
      }
      saveLocalGamification(ownerId, nextStats)
    }
    return !currentlyLiked
  }

  if (currentlyLiked) {
    await supabase
      .from('challenge_submission_likes')
      .delete()
      .eq('user_id', userId)
      .eq('submission_id', submissionId)

    const { count } = await supabase
      .from('challenge_submission_likes')
      .select('*', { count: 'exact', head: true })
      .eq('submission_id', submissionId)

    await adjustOwnerLikes(ownerId, -1, submissionId, count ?? 0)
    return false
  }

  await supabase.from('challenge_submission_likes').insert({
    user_id: userId,
    submission_id: submissionId,
  })

  const { count } = await supabase
    .from('challenge_submission_likes')
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)

  await adjustOwnerLikes(ownerId, 1, submissionId, count ?? 0)
  return true
}

export async function fetchChallengeLeaderboard(limit = 10) {
  await processWeeklyTopAwards()

  if (!isSupabaseConfigured || !supabase) {
    const all = readJson(LS_GAMIFICATION, {})
    const entries = Object.values(all).sort(sortLeaderboardEntries).slice(0, limit)

    return entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      displayName: entry.displayName ?? tFallbackName(entry.userId),
      totalPoints: entry.totalPoints,
      challengesCompleted: entry.challengesCompleted,
      currentStreak: entry.currentStreak ?? 0,
    }))
  }

  const { data, error } = await supabase
    .from('user_gamification')
    .select('user_id, total_points, challenges_completed, current_streak')
    .limit(100)

  if (error) {
    console.error('[dailyChallengeService] leaderboard fetch:', error)
    return []
  }

  const rows = [...(data ?? [])]
    .sort((a, b) =>
      sortLeaderboardEntries(
        {
          totalPoints: a.total_points ?? 0,
          challengesCompleted: a.challenges_completed ?? 0,
          currentStreak: a.current_streak ?? 0,
        },
        {
          totalPoints: b.total_points ?? 0,
          challengesCompleted: b.challenges_completed ?? 0,
          currentStreak: b.current_streak ?? 0,
        },
      ),
    )
    .slice(0, limit)

  const userIds = rows.map((row) => row.user_id)
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]))

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    displayName: profileMap.get(row.user_id) ?? '—',
    totalPoints: row.total_points ?? 0,
    challengesCompleted: row.challenges_completed ?? 0,
    currentStreak: row.current_streak ?? 0,
  }))
}

async function enrichSubmissionsWithLikes(submissions, userId) {
  if (!submissions.length) return []

  if (!isSupabaseConfigured || !supabase) {
    const likes = readJson(LS_LIKES, {})
    return submissions.map((item) => ({
      ...item,
      likeCount: item.likeCount ?? 0,
      userLiked: Boolean(userId && likes[`${userId}:${item.id}`]),
    }))
  }

  const ids = submissions.map((row) => row.id)
  const userIds = [...new Set(submissions.map((row) => row.user_id))]

  const [profilesRes, likesRes, userLikesRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', userIds),
    supabase.from('challenge_submission_likes').select('submission_id').in('submission_id', ids),
    userId
      ? supabase
          .from('challenge_submission_likes')
          .select('submission_id')
          .eq('user_id', userId)
          .in('submission_id', ids)
      : Promise.resolve({ data: [], error: null }),
  ])

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.display_name]))
  const likeCountMap = new Map()
  for (const like of likesRes.data ?? []) {
    likeCountMap.set(like.submission_id, (likeCountMap.get(like.submission_id) ?? 0) + 1)
  }
  const userLikeSet = new Set((userLikesRes.data ?? []).map((row) => row.submission_id))

  return submissions.map((row) =>
    mapSubmission(
      row,
      profileMap.get(row.user_id),
      likeCountMap.get(row.id) ?? 0,
      userLikeSet.has(row.id),
    ),
  )
}

/**
 * @param {string | null} userId
 * @param {number} [daysBack]
 */
export async function fetchChallengeHistory(userId, daysBack = 14) {
  const dateKeys = getPastChallengeDateKeys(daysBack)

  let submissionsByDate = new Map()

  if (!isSupabaseConfigured || !supabase) {
    const all = getAllLocalSubmissions()
    for (const item of all) {
      if (!dateKeys.includes(item.challengeDate)) continue
      const list = submissionsByDate.get(item.challengeDate) ?? []
      list.push(item)
      submissionsByDate.set(item.challengeDate, list)
    }
  } else {
    const { data, error } = await supabase
      .from('challenge_submissions')
      .select('id, challenge_date, user_id, dish_name, description, photo_url, created_at')
      .in('challenge_date', dateKeys)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[dailyChallengeService] history fetch:', error)
    } else {
      const grouped = new Map()
      for (const row of data ?? []) {
        const dateKey = row.challenge_date
        const list = grouped.get(dateKey) ?? []
        list.push(row)
        grouped.set(dateKey, list)
      }

      for (const [dateKey, rows] of grouped.entries()) {
        const enriched = await enrichSubmissionsWithLikes(rows, userId)
        submissionsByDate.set(dateKey, enriched)
      }
    }
  }

  return dateKeys.map((dateKey) => {
    const challenge = generateDailyChallenge(dateKey)
    const submissions = submissionsByDate.get(dateKey) ?? []
    const winner = pickBestSubmission(submissions)
    const userSubmission = userId
      ? submissions.find((item) => item.userId === userId) ?? null
      : null

    return {
      challengeDate: dateKey,
      challenge,
      submissionCount: submissions.length,
      winner,
      userSubmission,
      communitySubmissions: submissions,
    }
  })
}

/**
 * @param {number} [limit]
 */
export async function fetchBestChallengePhotos(limit = 8) {
  const submissions = await fetchAllChallengeSubmissions(null, 100)
  return submissions
    .filter((item) => item.photoUrl)
    .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
    .slice(0, limit)
}

/**
 * Weekly challenge winner from submissions in the last 7 days.
 */
export async function fetchWeeklyChallengeWinner() {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 7)
  const sinceIso = since.toISOString()

  let submissions = []

  if (!isSupabaseConfigured || !supabase) {
    submissions = getAllLocalSubmissions().filter((item) => item.createdAt >= sinceIso)
  } else {
    const { data, error } = await supabase
      .from('challenge_submissions')
      .select('id, challenge_date, user_id, dish_name, description, photo_url, created_at')
      .gte('created_at', sinceIso)

    if (error) {
      console.error('[dailyChallengeService] weekly winner fetch:', error)
      return null
    }

    submissions = await enrichSubmissionsWithLikes(data ?? [], null)
  }

  const winner = pickBestSubmission(submissions)
  if (!winner) return null

  return {
    submission: winner,
    weekStart: getWeekStartKey(),
  }
}

function tFallbackName(userId) {
  return `User ${String(userId).slice(0, 6)}`
}

export async function userSubmittedToday(userId) {
  if (!userId) return false
  const challengeDate = getChallengeDateKey()

  if (!isSupabaseConfigured || !supabase) {
    return getLocalSubmissions(challengeDate).some((item) => item.userId === userId)
  }

  const { data } = await supabase
    .from('challenge_submissions')
    .select('id')
    .eq('challenge_date', challengeDate)
    .eq('user_id', userId)
    .maybeSingle()

  return Boolean(data)
}
