import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import LanguageToggle from './LanguageToggle'
import InstallAppButton from './InstallAppButton'
import AuthModal from './AuthModal'
import './Header.css'

export default function Header() {
  const { t } = useLanguage()
  const { isAuthenticated, displayName, signOut, isSupabaseReady, loading } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')

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
        <div className="header__top-end">
          <LanguageToggle />
          <InstallAppButton />
        </div>
        {!loading && isSupabaseReady && (
          <div className="header__auth">
            {isAuthenticated ? (
              <>
                <span className="header__user">{t('authHello', { name: displayName })}</span>
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
