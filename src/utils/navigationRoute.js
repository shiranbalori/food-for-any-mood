/** My Area panel ids — must match MY_AREA_PANELS in MyAreaDrawer.jsx */
export const NAV_MY_AREA_PANELS = new Set([
  'weekly',
  'saved',
  'favorites',
  'community',
  'myRecipes',
  'themedMeals',
  'story',
])

export const NAV_GLOBAL_PAGES = {
  dailyChallenge: 'dailyChallenge',
}

const NAV_STORAGE_KEY = 'ffam-nav-hash'

const EMPTY_NAV = {
  activeMyAreaPage: null,
  activeGlobalPage: null,
  quizModalOpen: false,
  openRecipeId: null,
}

function hasNavTarget(nav) {
  return Boolean(
    nav.activeMyAreaPage || nav.activeGlobalPage || nav.quizModalOpen,
  )
}

/**
 * Parse location hash into navigation state.
 */
export function parseNavigationHash(hash = window.location.hash) {
  const raw = hash.replace(/^#/, '').replace(/^\/?/, '').trim()
  if (!raw) return { ...EMPTY_NAV }

  const [pathPart, queryPart] = raw.split('?')
  const params = new URLSearchParams(queryPart ?? '')
  const openRecipeId = params.get('open') || null

  if (pathPart === 'quiz') {
    return { ...EMPTY_NAV, quizModalOpen: true }
  }

  if (pathPart === 'daily-challenge') {
    return { ...EMPTY_NAV, activeGlobalPage: NAV_GLOBAL_PAGES.dailyChallenge }
  }

  if (pathPart.startsWith('my/')) {
    const panel = pathPart.slice(3)
    if (NAV_MY_AREA_PANELS.has(panel)) {
      return {
        ...EMPTY_NAV,
        activeMyAreaPage: panel,
        openRecipeId,
      }
    }
  }

  return { ...EMPTY_NAV }
}

/**
 * Build hash string from navigation state.
 */
export function buildNavigationHash({
  activeMyAreaPage,
  activeGlobalPage,
  quizModalOpen,
  openRecipeId,
}) {
  if (quizModalOpen) return '#/quiz'
  if (activeGlobalPage === NAV_GLOBAL_PAGES.dailyChallenge) return '#/daily-challenge'
  if (activeMyAreaPage && NAV_MY_AREA_PANELS.has(activeMyAreaPage)) {
    const base = `#/my/${activeMyAreaPage}`
    if (
      openRecipeId &&
      (activeMyAreaPage === 'saved' || activeMyAreaPage === 'community')
    ) {
      return `${base}?open=${encodeURIComponent(openRecipeId)}`
    }
    return base
  }
  return '#/'
}

/** Normalize hash for comparison (#/ vs empty). */
export function normalizeNavigationHash(hash) {
  return buildNavigationHash(parseNavigationHash(hash))
}

function buildUrlWithHash(hash) {
  return `${window.location.pathname}${window.location.search}${hash}`
}

/**
 * Read route from URL hash only (no localStorage restore).
 */
export function readNavigationRoute() {
  return parseNavigationHash(window.location.hash)
}

/**
 * Cold app startup: always Home. Clears stale hash/localStorage (e.g. #/my/community?open=...).
 */
export function getStartupNavigationRoute() {
  const homeHash = '#/'

  try {
    localStorage.setItem(NAV_STORAGE_KEY, homeHash)
  } catch {
    // ignore storage errors
  }

  const currentHash = window.location.hash
  if (currentHash && currentHash !== homeHash && currentHash !== '#') {
    window.history.replaceState(null, '', buildUrlWithHash(homeHash))
  }

  return { ...EMPTY_NAV }
}

/**
 * Persist route to URL (replaceState) and localStorage.
 */
export function writeNavigationRoute(state) {
  const hash = buildNavigationHash(state)

  try {
    localStorage.setItem(NAV_STORAGE_KEY, hash)
  } catch {
    // ignore storage errors
  }

  const nextUrl = buildUrlWithHash(hash)
  const currentNormalized = normalizeNavigationHash(window.location.hash)
  if (currentNormalized !== hash) {
    window.history.replaceState(null, '', nextUrl)
  }
}

export function applyNavigationRoute(nav, setters) {
  setters.setMyAreaOpen(false)
  setters.setActiveMyAreaPage(nav.activeMyAreaPage)
  setters.setActiveGlobalPage(nav.activeGlobalPage)
  setters.setQuizModalOpen(nav.quizModalOpen)
  setters.setOpenRecipeId(nav.openRecipeId)
}
