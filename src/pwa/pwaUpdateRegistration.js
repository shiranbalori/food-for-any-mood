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

async function unregisterDevServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  if (!registrations.length) return
  await Promise.all(registrations.map((registration) => registration.unregister()))
  console.log('[PWA] unregistered service worker(s) in development')
}

export function initPwaUpdateRegistration() {
  if (!import.meta.env.PROD) {
    void unregisterDevServiceWorkers()
    console.log('[PWA] service worker registration skipped (development)')
    return
  }

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
