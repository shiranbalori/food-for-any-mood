import { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { reloadForPwaUpdate, subscribePwaUpdate } from '../pwa/pwaUpdateRegistration'
import './PwaUpdateNotice.css'

export default function PwaUpdateNotice() {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => subscribePwaUpdate(setVisible), [])

  if (!visible) return null

  const handleReload = (event) => {
    event.preventDefault()
    reloadForPwaUpdate()
  }

  return (
    <div className="pwa-update-notice" role="status" aria-live="polite">
      <span className="pwa-update-notice__text">{t('pwaUpdateAvailable')}</span>
      <button type="button" className="pwa-update-notice__btn" onClick={handleReload}>
        {t('pwaUpdateReload')}
      </button>
    </div>
  )
}
