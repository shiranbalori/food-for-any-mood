import { registerSW } from 'virtual:pwa-register'

let updateAvailable = false
let applyUpdate = null
const listeners = new Set()

function notifyListeners() {
  listeners.forEach((listener) => listener(updateAvailable))
}

export function subscribePwaUpdate(listener) {
  listeners.add(listener)
  listener(updateAvailable)
  return () => listeners.delete(listener)
}

/** Reload only when the user explicitly requests it — never auto. */
export function reloadForPwaUpdate() {
  if (!applyUpdate) return
  void applyUpdate(true)
}

export function initPwaUpdateRegistration() {
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable = true
      console.log('[PWA] update available — waiting for user action')
      notifyListeners()
    },
    onRegisteredSW(_swScriptUrl, registration) {
      console.log('[PWA] service worker registered', registration)
    },
    onRegisterError(error) {
      console.error('[PWA] service worker registration failed', error)
    },
  })
}
