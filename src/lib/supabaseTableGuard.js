/**
 * Graceful handling when optional Supabase tables are not deployed yet.
 * Logs once per table per session and avoids repeated 404 / PGRST205 noise.
 */

const warnedTables = new Set()
const missingTables = new Set()

/**
 * @param {{ code?: string, message?: string, status?: number, details?: string, hint?: string } | null | undefined} error
 */
export function isMissingSupabaseTableError(error) {
  if (!error) return false

  const code = String(error.code ?? '')
  const message = String(error.message ?? '').toLowerCase()
  const details = String(error.details ?? '').toLowerCase()
  const hint = String(error.hint ?? '').toLowerCase()
  const status = Number(error.status ?? error.statusCode ?? 0)

  if (code === 'PGRST205') return true
  if (status === 404) return true
  if (message.includes('could not find the table')) return true
  if (details.includes('could not find the table')) return true
  if (hint.includes('could not find the table')) return true
  if (message.includes('relation') && message.includes('does not exist')) return true
  return false
}

/**
 * @param {string} tableName
 * @param {{ code?: string, message?: string } | null | undefined} error
 */
export function warnMissingSupabaseTable(tableName, error) {
  if (warnedTables.has(tableName)) return
  warnedTables.add(tableName)
  missingTables.add(tableName)
  const code = error?.code ? ` (${error.code})` : ''
  console.warn(
    `[supabase] Table "${tableName}" is unavailable${code}. ` +
      'Feature disabled gracefully — using empty/default data.',
  )
}

export function isSupabaseTableUsable(tableName) {
  return !missingTables.has(tableName)
}

/**
 * @param {string} tableName
 * @param {{ code?: string, message?: string, status?: number, details?: string } | null | undefined} error
 */
export function markSupabaseTableMissing(tableName, error) {
  if (!isMissingSupabaseTableError(error)) return false
  warnMissingSupabaseTable(tableName, error)
  return true
}

/**
 * @template T
 * @param {string} tableName
 * @param {{ data?: T, error?: { code?: string, message?: string, status?: number, details?: string } | null }} result
 * @param {T} fallback
 */
export function handleSupabaseTableResult(tableName, { data, error }, fallback) {
  if (!error) {
    return { ok: true, data: data ?? fallback, missingTable: false, error: null }
  }

  if (markSupabaseTableMissing(tableName, error)) {
    return { ok: true, data: fallback, missingTable: true, error: null }
  }

  return { ok: false, data: fallback, missingTable: false, error }
}
