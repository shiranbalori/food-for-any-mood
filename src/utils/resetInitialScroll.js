const FOCUSABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'])

export function disableBrowserScrollRestoration() {
  if (typeof window === 'undefined') return
  try {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  } catch {
    // ignore
  }
}

export function resetScrollToTop() {
  if (typeof window === 'undefined') return
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  if (document.documentElement) document.documentElement.scrollTop = 0
  if (document.body) document.body.scrollTop = 0
}

/** Blur any control focused before React paint (avoids scroll-into-view on load). */
export function clearInitialFocus() {
  if (typeof document === 'undefined') return
  const active = document.activeElement
  if (!active || active === document.body || active === document.documentElement) return
  if (FOCUSABLE_TAGS.has(active.tagName)) {
    active.blur()
  }
}

export function initInitialScrollPosition() {
  disableBrowserScrollRestoration()
  resetScrollToTop()
}

if (typeof window !== 'undefined') {
  initInitialScrollPosition()
}
