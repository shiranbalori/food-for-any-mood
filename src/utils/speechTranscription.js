/**
 * @typedef {'text' | 'ingredients' | 'steps'} MergeMode
 */

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function createSpeechRecognition() {
  if (typeof window === 'undefined') return null
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) return null
  return new SpeechRecognition()
}

/**
 * @param {string} language
 */
export function speechRecognitionLang(language) {
  return language === 'he' ? 'he-IL' : 'en-US'
}

/**
 * @param {string} existing
 * @param {string} transcript
 * @param {MergeMode} [mode='text']
 */
export function mergeTranscriptIntoField(existing, transcript, mode = 'text') {
  const next = String(transcript ?? '').trim()
  if (!next) return existing ?? ''

  const current = String(existing ?? '').trim()
  if (!current) return next

  if (mode === 'steps') {
    const separator = existing.endsWith('\n') ? '' : '\n'
    return `${existing.trimEnd()}${separator}${next}`
  }

  if (mode === 'ingredients') {
    const separator = /[,;\n]\s*$/.test(existing) ? ' ' : ', '
    return `${existing.trimEnd()}${separator}${next}`
  }

  const separator = existing.endsWith(' ') ? '' : ' '
  return `${existing.trimEnd()}${separator}${next}`
}
