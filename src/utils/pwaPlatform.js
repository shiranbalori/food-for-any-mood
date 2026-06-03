/** True on iOS / iPadOS — beforeinstallprompt is not available in Safari. */
export function isIOS() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
