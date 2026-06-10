const RESERVED_NAMES = new Set([
  'admin',
  'administrator',
  'support',
  'system',
  'foodforanymood',
])

const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N} _]+$/u

export function normalizeDisplayNameInput(value) {
  return (value ?? '').trim()
}

export function resolveCommunityAuthorName(recipe, currentUserId, currentDisplayName, fallbackName) {
  if (recipe?.authorId && currentUserId && recipe.authorId === currentUserId) {
    return currentDisplayName || fallbackName
  }
  return recipe?.authorName || fallbackName
}

export function getDefaultDisplayName(language = 'he') {
  return language === 'he' ? 'משתמש' : 'User'
}

export function resolvePublicDisplayName(rawName, language = 'he') {
  const trimmed = normalizeDisplayNameInput(rawName)
  if (!trimmed) return getDefaultDisplayName(language)
  return trimmed
}

export function needsDisplayNameSetup(rawName) {
  return !normalizeDisplayNameInput(rawName)
}

export function isReservedDisplayName(name) {
  const key = normalizeDisplayNameInput(name).toLowerCase().replace(/\s+/g, '')
  return RESERVED_NAMES.has(key)
}

/**
 * @returns {{ ok: true, value: string } | { ok: false, code: string }}
 */
export function validateDisplayName(name) {
  const trimmed = normalizeDisplayNameInput(name)

  if (!trimmed) {
    return { ok: false, code: 'REQUIRED' }
  }
  if (trimmed.length < 3) {
    return { ok: false, code: 'TOO_SHORT' }
  }
  if (trimmed.length > 30) {
    return { ok: false, code: 'TOO_LONG' }
  }
  if (!DISPLAY_NAME_PATTERN.test(trimmed)) {
    return { ok: false, code: 'INVALID_CHARS' }
  }
  if (isReservedDisplayName(trimmed)) {
    return { ok: false, code: 'RESERVED' }
  }

  return { ok: true, value: trimmed }
}

export function getDisplayNameValidationMessage(code, t) {
  switch (code) {
    case 'REQUIRED':
      return t('authDisplayNameRequired')
    case 'TOO_SHORT':
      return t('authDisplayNameTooShort')
    case 'TOO_LONG':
      return t('authDisplayNameTooLong')
    case 'INVALID_CHARS':
      return t('authDisplayNameInvalidChars')
    case 'TAKEN':
      return t('authDisplayNameTaken')
    case 'RESERVED':
      return t('authDisplayNameReserved')
    default:
      return t('authErrorGeneric')
  }
}
