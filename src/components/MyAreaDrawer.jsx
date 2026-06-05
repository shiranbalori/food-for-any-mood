import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import LogOutIcon from './LogOutIcon'
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

export function getMyAreaNavItem(panelId) {
  return MY_AREA_PANEL_NAV.find((item) => item.id === panelId) ?? null
}

export const MY_AREA_PANEL_NAV = [
  { id: MY_AREA_PANELS.weekly, icon: '📅', labelKey: 'myAreaNavWeekly' },
  { id: MY_AREA_PANELS.saved, icon: '📌', labelKey: 'myAreaNavSaved', badgeKey: 'saved' },
  { id: MY_AREA_PANELS.favorites, icon: '❤️', labelKey: 'myAreaNavFavorites', badgeKey: 'favorites' },
  { id: MY_AREA_PANELS.community, icon: '👥', labelKey: 'myAreaNavCommunity' },
  { id: MY_AREA_PANELS.myRecipes, icon: '📒', labelKey: 'myAreaNavMyRecipes', badgeKey: 'myRecipes' },
  { id: MY_AREA_PANELS.story, icon: '✨', labelKey: 'myAreaNavStory' },
]

export default function MyAreaDrawer({
  open,
  onClose,
  onSelectPanel,
  savedCount = 0,
  favoritesCount = 0,
  myRecipesCount = 0,
  searchSavedRecipes = [],
  searchFavoriteRecipes = [],
  searchMealPlan = {},
  searchPrivateRecipes = [],
  searchCommunityRecipes = [],
  onSearchSelect,
}) {
  const { t } = useLanguage()
  const { isAuthenticated, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      onClose()
    } catch (error) {
      console.error('[MyAreaDrawer] sign out failed:', error)
    }
  }

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
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

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
          {MY_AREA_PANEL_NAV.map((item) => {
            const badgeCount = item.badgeKey ? getBadgeCount(item.badgeKey) : null

            return (
              <button
                key={item.id}
                type="button"
                className={`my-area-drawer__tab ${badgeCount !== null ? 'my-area-drawer__tab--has-badge' : ''}`}
                onClick={() => onSelectPanel(item.id)}
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

        {isAuthenticated ? (
          <footer className="my-area-drawer__footer">
            <button
              type="button"
              className="my-area-drawer__logout"
              onClick={handleSignOut}
            >
              <LogOutIcon size={15} className="my-area-drawer__logout-icon" />
              <span>{t('authLogout')}</span>
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  )
}
