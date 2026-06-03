import { useLanguage } from '../i18n/useLanguage'
import { usePwaInstall } from '../hooks/usePwaInstall'
import './InstallAppButton.css'

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
  const { showInstallButton, isInstalled, promptInstall } = usePwaInstall()

  if (!showInstallButton) return null

  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    void promptInstall()
  }

  return (
    <div className={`install-app-pill${isInstalled ? ' install-app-pill--installed' : ''}`}>
      {isInstalled ? (
        <span className="install-app-pill__btn install-app-pill__label" aria-live="polite">
          {t('installAppInstalled')}
        </span>
      ) : (
        <button type="button" className="install-app-pill__btn" onClick={handleClick}>
          <InstallIcon />
          {t('installApp')}
        </button>
      )}
    </div>
  )
}
