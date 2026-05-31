import { useLanguage } from '../i18n/useLanguage'
import { usePwaInstall } from '../hooks/usePwaInstall'
import './InstallAppButton.css'

export default function InstallAppButton() {
  const { t } = useLanguage()
  const { canInstall, promptInstall } = usePwaInstall()

  if (!canInstall) return null

  return (
    <button
      type="button"
      className="install-app-btn btn btn--ghost"
      onClick={() => promptInstall()}
    >
      {t('installApp')}
    </button>
  )
}
