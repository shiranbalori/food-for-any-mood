import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { fetchUserGamification } from '../services/dailyChallengeService'
import LanguageToggle from './LanguageToggle'
import InstallAppButton from './InstallAppButton'
import AuthModal from './AuthModal'
import HomeIcon from './HomeIcon'
import UserChallengeStats from './dailyChallenge/UserChallengeStats'
import './Header.css'

export default function Header({ onOpenMyArea, onGoHome, gamificationRefreshKey = 0 }) {
  const { t } = useLanguage()
  const { user, isAuthenticated, displayName, signOut, isSupabaseReady, loading } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [gamificationStats, setGamificationStats] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setGamificationStats(null)
      return undefined
    }
    let cancelled = false
    fetchUserGamification(user.id).then((stats) => {
      if (!cancelled) setGamificationStats(stats)
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, gamificationRefreshKey])

  const openAuth = (mode) => {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('[Header] sign out failed:', error)
    }
  }

  return (
    <header className="header">
      <div className="header__top">
        {!loading && isSupabaseReady && (
          <div className="header__auth">
            {isAuthenticated ? (
              <>
                <div className="header__profile">
                  <span className="header__user">{t('authHello', { name: displayName })}</span>
                  {gamificationStats ? (
                    <UserChallengeStats stats={gamificationStats} compact />
                  ) : null}
                </div>
                <button type="button" className="btn btn--ghost header__auth-btn" onClick={handleSignOut}>
                  {t('authLogout')}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn--ghost header__auth-btn" onClick={() => openAuth('login')}>
                  {t('authLogin')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost header__auth-btn header__auth-btn--primary"
                  onClick={() => openAuth('signup')}
                >
                  {t('authSignup')}
                </button>
              </>
            )}
          </div>
        )}
        <div className="header__toolbar">
          {onGoHome && (
            <button
              type="button"
              className="header__home-btn"
              onClick={onGoHome}
              aria-label={t('myAreaHomeLabel')}
            >
              <HomeIcon size={19} className="header__home-btn-icon" />
            </button>
          )}
          {onOpenMyArea && (
            <button type="button" className="header__my-area-btn" onClick={onOpenMyArea}>
              <span className="header__my-area-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3 5h14M3 10h14M3 15h14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="header__my-area-label">{t('myAreaMenu')}</span>
            </button>
          )}
          <div className="header__top-end">
            <LanguageToggle />
            <InstallAppButton />
          </div>
        </div>
      </div>

      <p className="header__badge">{t('badge')}</p>
      <h1 className="header__title" dir="ltr">
        FOOD FOR <span className="header__highlight">ANY MOOD</span>
      </h1>
      <p className="header__subtitle">{t('subtitle')}</p>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </header>
  )
}
