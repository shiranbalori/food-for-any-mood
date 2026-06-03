/** Captured before React mounts so we never miss beforeinstallprompt. */

let deferredInstallPrompt = null
const listeners = new Set()

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt
}

export function clearDeferredInstallPrompt() {
  deferredInstallPrompt = null
  listeners.forEach((listener) => listener(null))
}

export function subscribeDeferredInstallPrompt(listener) {
  listeners.add(listener)
  listener(deferredInstallPrompt)
  return () => listeners.delete(listener)
}

function notifyListeners() {
  listeners.forEach((listener) => listener(deferredInstallPrompt))
}

async function logManifestCheck() {
  try {
    const response = await fetch('/manifest.webmanifest', { cache: 'no-store' })
    if (!response.ok) {
      console.log('[PWA] manifest fetch failed:', response.status)
      return
    }
    const manifest = await response.json()
    const valid = Boolean(
      manifest.name &&
        manifest.short_name &&
        manifest.start_url &&
        manifest.display === 'standalone' &&
        Array.isArray(manifest.icons) &&
        manifest.icons.length > 0
    )
    console.log('[PWA] manifest linked and valid:', valid, manifest)
  } catch (error) {
    console.log('[PWA] manifest check error:', error)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event
    console.log('[PWA] beforeinstallprompt fired')
    notifyListeners()
  })

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] appinstalled fired')
    clearDeferredInstallPrompt()
  })

  void logManifestCheck()
}
