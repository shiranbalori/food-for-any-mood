import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeDeferredInstallPrompt,
} from '../pwa/installPromptCapture'

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * Captures the browser install prompt for PWA installation.
 */
export function usePwaInstall() {
  const deferredPromptRef = useRef(getDeferredInstallPrompt())
  const [deferredPromptEvent, setDeferredPromptEvent] = useState(getDeferredInstallPrompt)
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplay)
  const isInstalledRef = useRef(isInstalled)
  isInstalledRef.current = isInstalled

  useEffect(() => {
    return subscribeDeferredInstallPrompt((event) => {
      if (isInstalledRef.current) return
      deferredPromptRef.current = event
      setDeferredPromptEvent(event)
      console.log('[PWA] prompt exists:', Boolean(event))
    })
  }, [])

  useEffect(() => {
    const onAppInstalled = () => {
      deferredPromptRef.current = null
      setDeferredPromptEvent(null)
      clearDeferredInstallPrompt()
      setIsInstalled(true)
      console.log('[PWA] appinstalled — installed state set')
    }

    window.addEventListener('appinstalled', onAppInstalled)
    return () => window.removeEventListener('appinstalled', onAppInstalled)
  }, [])

  const promptInstall = useCallback(async () => {
    console.log('[PWA] install clicked')

    if (isInstalledRef.current) {
      return { ok: false, reason: 'installed' }
    }

    const deferredPrompt = deferredPromptRef.current ?? getDeferredInstallPrompt()

    if (!deferredPrompt) {
      console.log('[PWA] prompt missing')
      return { ok: false, reason: 'unavailable' }
    }

    console.log('[PWA] prompt exists')

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      console.log('[PWA] user choice:', choice.outcome)

      deferredPromptRef.current = null
      setDeferredPromptEvent(null)
      clearDeferredInstallPrompt()

      if (choice.outcome === 'accepted') {
        setIsInstalled(true)
        return { ok: true, outcome: 'accepted' }
      }

      return { ok: false, outcome: 'dismissed' }
    } catch (error) {
      console.log('[PWA] prompt() error:', error)
      return { ok: false, reason: 'error' }
    }
  }, [])

  const hasPrompt = Boolean(deferredPromptEvent ?? deferredPromptRef.current)
  const showInstallButton = isInstalled || !isStandaloneDisplay()

  return {
    hasPrompt,
    showInstallButton,
    isInstalled,
    promptInstall,
  }
}
