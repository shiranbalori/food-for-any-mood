/**
 * Lightweight stage timer for recipe generation pipeline debugging.
 */

/** @typedef {{ stage: string, durationMs: number, status: 'Success' | 'Failed', detail?: string }} TimingRow */

export function createRecipeGenerationTimer(label = 'recipe-generation') {
  const startedAt = performance.now()
  /** @type {TimingRow[]} */
  const rows = []
  let lastMark = startedAt

  function mark(stage, status = 'Success', detail = '') {
    const now = performance.now()
    const durationMs = Math.round(now - lastMark)
    rows.push({ stage, durationMs, status, detail: detail || undefined })
    lastMark = now
    console.log(
      `[recipeTiming] ${stage} | ${durationMs}ms | ${status}${detail ? ` | ${detail}` : ''}`,
    )
    return durationMs
  }

  function fail(stage, error, detail = '') {
    const message = error instanceof Error ? error.message : String(error ?? 'unknown error')
    mark(stage, 'Failed', detail || message)
    return message
  }

  function totalMs() {
    return Math.round(performance.now() - startedAt)
  }

  function printTable() {
    const total = totalMs()
    console.group(`[recipeTiming] ${label} — stage breakdown (total ${total}ms)`)
    console.table(
      rows.map(({ stage, durationMs, status, detail }) => ({
        Stage: stage,
        'Duration (ms)': durationMs,
        Status: status,
        Detail: detail ?? '',
      })),
    )
    console.log(`[recipeTiming] TOTAL | ${total}ms`)
    console.groupEnd()
    return { rows, totalMs: total }
  }

  return { mark, fail, totalMs, printTable, rows }
}
