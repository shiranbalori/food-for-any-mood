import { useEffect } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import './MyAreaDrawer.css'

export const MY_AREA_PANELS = {
  weekly: 'weekly',
  saved: 'saved',
  favorites: 'favorites',
  community: 'community',
}

const NAV_ITEMS = [
  { id: MY_AREA_PANELS.weekly, icon: '📅', labelKey: 'myAreaNavWeekly' },
  { id: MY_AREA_PANELS.saved, icon: '🔖', labelKey: 'myAreaNavSaved' },
  { id: MY_AREA_PANELS.favorites, icon: '⭐', labelKey: 'myAreaNavFavorites' },
  { id: MY_AREA_PANELS.community, icon: '👥', labelKey: 'myAreaNavCommunity' },
]

export default function MyAreaDrawer({ open, activePanel, onClose, onSelectPanel, onBack, children }) {
  const { t } = useLanguage()

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (activePanel) onBack()
        else onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, activePanel, onBack, onClose])

  if (!open) return null

  const activeItem = NAV_ITEMS.find((item) => item.id === activePanel)

  return (
    <div className="my-area-drawer" role="presentation">
      <button
        type="button"
        className="my-area-drawer__overlay"
        aria-label={t('myAreaClose')}
        onClick={onClose}
      />

      <aside
        className="my-area-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-area-drawer-title"
      >
        <header className="my-area-drawer__header">
          {activePanel ? (
            <button type="button" className="my-area-drawer__back" onClick={onBack}>
              <span aria-hidden="true">→</span>
              {t('myAreaBack')}
            </button>
          ) : (
            <h2 id="my-area-drawer-title" className="my-area-drawer__title">
              {t('myAreaTitle')}
            </h2>
          )}
          <button
            type="button"
            className="my-area-drawer__close"
            onClick={onClose}
            aria-label={t('myAreaClose')}
          >
            ×
          </button>
        </header>

        {!activePanel ? (
          <nav className="my-area-drawer__nav" aria-label={t('myAreaTitle')}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="my-area-drawer__nav-item"
                onClick={() => onSelectPanel(item.id)}
              >
                <span className="my-area-drawer__nav-icon-wrap" aria-hidden="true">
                  <span className="my-area-drawer__nav-icon">{item.icon}</span>
                </span>
                <span className="my-area-drawer__nav-text">
                  <span className="my-area-drawer__nav-label">{t(item.labelKey)}</span>
                </span>
                <span className="my-area-drawer__nav-chevron" aria-hidden="true">
                  ‹
                </span>
              </button>
            ))}
          </nav>
        ) : (
          <div className="my-area-drawer__body">
            {activeItem && (
              <h3 className="my-area-drawer__panel-title">
                <span aria-hidden="true">{activeItem.icon}</span>
                {t(activeItem.labelKey)}
              </h3>
            )}
            <div className="my-area-drawer__content">{children}</div>
          </div>
        )}
      </aside>
    </div>
  )
}
