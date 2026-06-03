/**
 * Captures beforeinstallprompt for the install button.
 * Inline script in index.html runs first; this module syncs and notifies React.
 */

const PWA_GLOBAL = '__FOOD_MOOD_PWA__'
export const INSTALL_PROMPT_READY_EVENT = 'food-mood-pwa:install-prompt-ready'
export const INSTALL_APP_INSTALLED_EVENT = 'food-mood-pwa:app-installed'

let deferredInstallPrompt = null
const listeners = new Set()

function ensureGlobal() {
  if (typeof window === 'undefined') return null
  if (!window[PWA_GLOBAL]) {
    window[PWA_GLOBAL] = { deferredPrompt: null }
  }
  return window[PWA_GLOBAL]
}

function persistPrompt(event) {
  deferredInstallPrompt = event
  const bucket = ensureGlobal()
  if (bucket) bucket.deferredPrompt = event
}

export function getDeferredInstallPrompt() {
  if (deferredInstallPrompt) return deferredInstallPrompt
  const bucket = ensureGlobal()
  return bucket?.deferredPrompt ?? null
}

export function clearDeferredInstallPrompt() {
  deferredInstallPrompt = null
  const bucket = ensureGlobal()
  if (bucket) bucket.deferredPrompt = null
  listeners.forEach((listener) => listener(null))
}

export function subscribeDeferredInstallPrompt(listener) {
  listeners.add(listener)
  listener(getDeferredInstallPrompt())
  return () => listeners.delete(listener)
}

function notifyListeners() {
  const current = getDeferredInstallPrompt()
  listeners.forEach((listener) => listener(current))
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault()
  persistPrompt(event)
  console.log('[PWA] beforeinstallprompt captured')
  notifyListeners()
}

async function logManifestCheck() {
  try {
    const response = await fetch('/manifest.webmanifest', { cache: 'no-store' })
    if (!response.ok) {
      console.log('[PWA] manifest fetch failed:', response.status)
      return
    }
    const manifest = await response.json()
    const icons = Array.isArray(manifest.icons) ? manifest.icons : []
    const has192 = icons.some((icon) => String(icon.sizes).includes('192'))
    const has512 = icons.some((icon) => String(icon.sizes).includes('512'))
    const valid = Boolean(
      manifest.name &&
        manifest.short_name &&
        manifest.start_url === '/' &&
        manifest.display === 'standalone' &&
        has192 &&
        has512,
    )
    console.log('[PWA] manifest linked and valid:', valid)
  } catch (error) {
    console.log('[PWA] manifest check error:', error)
  }
}

if (typeof window !== 'undefined') {
  const restored = getDeferredInstallPrompt()
  if (restored) {
    console.log('[PWA] restored deferred prompt from early capture')
    notifyListeners()
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

  window.addEventListener(INSTALL_PROMPT_READY_EVENT, () => {
    const event = getDeferredInstallPrompt()
    if (event && event !== deferredInstallPrompt) {
      persistPrompt(event)
      notifyListeners()
    }
  })

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] appinstalled fired')
    clearDeferredInstallPrompt()
    window.dispatchEvent(new Event(INSTALL_APP_INSTALLED_EVENT))
  })

  window.addEventListener(INSTALL_APP_INSTALLED_EVENT, () => {
    clearDeferredInstallPrompt()
  })

  void logManifestCheck()
}
