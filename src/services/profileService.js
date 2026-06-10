import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { normalizeDisplayNameInput, validateDisplayName } from '../utils/displayName'

export class ProfileUpdateError extends Error {
  constructor(code, details = null) {
    super(code)
    this.name = 'ProfileUpdateError'
    this.code = code
    this.details = details
  }
}

export class ProfileServiceError extends Error {
  constructor(error, context) {
    super(formatSupabaseError(error, context))
    this.name = 'ProfileServiceError'
    this.code = error?.code ?? null
    this.original = error
    this.context = context
  }
}

export function formatSupabaseError(error, context = 'profileService') {
  if (!error) return `[${context}] Unknown error`

  const parts = [`[${context}]`]
  if (error.message) parts.push(error.message)
  if (error.code) parts.push(`code=${error.code}`)
  if (error.details) parts.push(`details=${error.details}`)
  if (error.hint) parts.push(`hint=${error.hint}`)

  return parts.join(' | ')
}

async function isDisplayNameTakenFallback(trimmed, excludeUserId = null) {
  const { data, error } = await supabase.from('profiles').select('id, display_name')

  if (error) {
    console.error('[profileService] fallback uniqueness check failed:', error)
    throw new ProfileServiceError(error, 'isDisplayNameTakenFallback')
  }

  const normalized = trimmed.toLowerCase()
  return (data ?? []).some(
    (row) =>
      row.id !== excludeUserId &&
      normalizeDisplayNameInput(row.display_name).toLowerCase() === normalized,
  )
}

/**
 * Case-insensitive, trim-aware uniqueness check (excluding optional user id).
 * @param {string} displayName
 * @param {string | null | undefined} excludeUserId
 */
export async function isDisplayNameTaken(displayName, excludeUserId = null) {
  if (!isSupabaseConfigured || !supabase) return false

  const trimmed = normalizeDisplayNameInput(displayName)
  if (!trimmed) return false

  const { data, error } = await supabase.rpc('is_display_name_taken', {
    candidate: trimmed,
    exclude_user_id: excludeUserId,
  })

  if (error) {
    console.error('[profileService] RPC is_display_name_taken failed:', error)
    const rpcMissing =
      error.code === 'PGRST202' ||
      error.code === '42883' ||
      /is_display_name_taken/i.test(error.message ?? '')

    if (rpcMissing) {
      console.warn('[profileService] Falling back to client-side uniqueness check')
      return isDisplayNameTakenFallback(trimmed, excludeUserId)
    }

    throw new ProfileServiceError(error, 'is_display_name_taken')
  }

  return Boolean(data)
}

/**
 * @param {string} userId
 * @param {string} displayName
 */
export async function updateUserDisplayName(userId, displayName) {
  if (!isSupabaseConfigured || !supabase) {
    throw new ProfileUpdateError('SUPABASE_NOT_CONFIGURED')
  }

  if (!userId) {
    throw new ProfileUpdateError('REQUIRED')
  }

  const validation = validateDisplayName(displayName)
  if (!validation.ok) {
    throw new ProfileUpdateError(validation.code)
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const authUserId = sessionData?.session?.user?.id
  if (authUserId && authUserId !== userId) {
    console.error('[profileService] auth uid mismatch:', { authUserId, userId })
    throw new ProfileUpdateError('AUTH_MISMATCH')
  }

  let taken = false
  try {
    taken = await isDisplayNameTaken(validation.value, userId)
  } catch (error) {
    if (error instanceof ProfileServiceError) throw error
    console.error('[profileService] uniqueness check unexpected error:', error)
    throw error
  }

  if (taken) {
    throw new ProfileUpdateError('TAKEN')
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: validation.value }, { onConflict: 'id' })
    .select('id, display_name')
    .single()

  if (error) {
    console.error('[profileService] updateUserDisplayName failed:', {
      userId,
      displayName: validation.value,
      error,
    })

    if (error.code === '23505') {
      throw new ProfileUpdateError('TAKEN')
    }

    throw new ProfileServiceError(error, 'updateUserDisplayName')
  }

  if (!data) {
    const noRowError = { message: 'Profile row was not returned after save', code: 'NO_ROW' }
    console.error('[profileService] updateUserDisplayName empty result:', { userId })
    throw new ProfileServiceError(noRowError, 'updateUserDisplayName')
  }

  return data
}

/**
 * Validate + uniqueness for signup (before auth user exists).
 * @param {string} displayName
 */
export async function assertDisplayNameAvailableForSignup(displayName) {
  const validation = validateDisplayName(displayName)
  if (!validation.ok) {
    throw new ProfileUpdateError(validation.code)
  }

  const taken = await isDisplayNameTaken(validation.value)
  if (taken) {
    throw new ProfileUpdateError('TAKEN')
  }

  return validation.value
}
