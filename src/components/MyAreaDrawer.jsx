import { useEffect } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import MyAreaSearch from './MyAreaSearch'
import './MyAreaDrawer.css'

export const MY_AREA_PANELS = {
  weekly: 'weekly',
  saved: 'saved',
  favorites: 'favorites',
  community: 'community',
  myRecipes: 'myRecipes',
  story: 'story',
}

const NAV_ITEMS = [
  { id: MY_AREA_PANELS.weekly, icon: '📅', labelKey: 'myAreaNavWeekly' },
  { id: MY_AREA_PANELS.saved, icon: '📌', labelKey: 'myAreaNavSaved', badgeKey: 'saved' },
  { id: MY_AREA_PANELS.favorites, icon: '❤️', labelKey: 'myAreaNavFavorites', badgeKey: 'favorites' },
  { id: MY_AREA_PANELS.community, icon: '👥', labelKey: 'myAreaNavCommunity' },
  { id: MY_AREA_PANELS.myRecipes, icon: '📒', labelKey: 'myAreaNavMyRecipes', badgeKey: 'myRecipes' },
  { id: MY_AREA_PANELS.story, icon: '✨', labelKey: 'myAreaNavStory' },
]

export default function MyAreaDrawer({
  open,
  activePanel,
  onClose,
  onSelectPanel,
  onBack,
  savedCount = 0,
  favoritesCount = 0,
  myRecipesCount = 0,
  searchSavedRecipes = [],
  searchFavoriteRecipes = [],
  searchMealPlan = {},
  searchPrivateRecipes = [],
  searchCommunityRecipes = [],
  onSearchSelect,
  children,
}) {
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

  const getBadgeCount = (badgeKey) => {
    if (badgeKey === 'saved') return savedCount
    if (badgeKey === 'favorites') return favoritesCount
    if (badgeKey === 'myRecipes') return myRecipesCount
    return null
  }

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
          <h2 id="my-area-drawer-title" className="my-area-drawer__title">
            {t('myAreaTitle')}
          </h2>
          <button
            type="button"
            className="my-area-drawer__close"
            onClick={onClose}
            aria-label={t('myAreaClose')}
          >
            ×
          </button>
        </header>

        <MyAreaSearch
          savedRecipes={searchSavedRecipes}
          favoriteRecipes={searchFavoriteRecipes}
          mealPlan={searchMealPlan}
          privateRecipes={searchPrivateRecipes}
          communityRecipes={searchCommunityRecipes}
          onSelectResult={onSearchSelect}
        />

        <nav className="my-area-drawer__tabs" aria-label={t('myAreaTitle')}>
          {NAV_ITEMS.map((item) => {
            const isActive = activePanel === item.id
            const badgeCount = item.badgeKey ? getBadgeCount(item.badgeKey) : null

            return (
              <button
                key={item.id}
                type="button"
                className={`my-area-drawer__tab ${isActive ? 'my-area-drawer__tab--active' : ''} ${badgeCount !== null ? 'my-area-drawer__tab--has-badge' : ''}`}
                onClick={() => onSelectPanel(item.id)}
                aria-pressed={isActive}
                aria-current={isActive ? 'page' : undefined}
              >
                {badgeCount !== null && (
                  <span
                    className={`my-area-drawer__tab-badge ${badgeCount === 0 ? 'my-area-drawer__tab-badge--empty' : ''}`}
                    aria-label={String(badgeCount)}
                  >
                    {badgeCount}
                  </span>
                )}
                <span className="my-area-drawer__tab-main">
                  <span className="my-area-drawer__tab-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="my-area-drawer__tab-label">{t(item.labelKey)}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="my-area-drawer__body">
          {activePanel ? (
            <div key={activePanel} className="my-area-drawer__content my-area-drawer__content--animate">
              {children}
            </div>
          ) : (
            <p className="my-area-drawer__hint">{t('myAreaSelectTab')}</p>
          )}
        </div>
      </aside>
    </div>
  )
}
