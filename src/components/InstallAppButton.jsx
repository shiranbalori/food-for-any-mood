import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { isIOS } from '../utils/pwaPlatform'
import './InstallAppButton.css'

const FEEDBACK_MS = 6000

function InstallIcon() {
  return (
    <svg
      className="install-app-pill__icon"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 2.5v7.25M8 9.75L5.25 7M8 9.75L10.75 7"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 11.75v1.25c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25v-1.25"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function InstallAppButton() {
  const { t } = useLanguage()
  const { showInstallButton, isInstalledView, promptInstall } = usePwaInstall()
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const feedbackTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const showFeedback = (message) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    setFeedbackMessage(message)
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackMessage(null)
      feedbackTimerRef.current = null
    }, FEEDBACK_MS)
  }

  if (!showInstallButton) return null

  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (isInstalledView) {
      showFeedback(t('installAppInstalled'))
      return
    }

    void (async () => {
      const result = await promptInstall()

      if (result.ok) return

      if (result.reason === 'installed') {
        showFeedback(t('installAppInstalled'))
        return
      }

      if (result.reason === 'unavailable' || result.reason === 'error') {
        showFeedback(isIOS() ? t('installAppIosGuide') : t('installAppBrowserMenuGuide'))
      }
    })()
  }

  const pillClass = `install-app-pill${
    isInstalledView || feedbackMessage ? ' install-app-pill--installed' : ''
  }`

  if (isInstalledView && !feedbackMessage) {
    return (
      <div className={pillClass}>
        <span className="install-app-pill__btn install-app-pill__label" aria-live="polite">
          {t('installAppInstalled')}
        </span>
      </div>
    )
  }

  if (feedbackMessage) {
    return (
      <div className={pillClass}>
        <span className="install-app-pill__btn install-app-pill__label" role="status" aria-live="polite">
          {feedbackMessage}
        </span>
      </div>
    )
  }

  return (
    <div className={pillClass}>
      <button type="button" className="install-app-pill__btn" onClick={handleClick}>
        <InstallIcon />
        {t('installApp')}
      </button>
    </div>
  )
}
