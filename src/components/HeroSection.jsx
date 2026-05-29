import LanguageToggle from './LanguageToggle'
import { useLanguage } from '../i18n/useLanguage'
import './HeroSection.css'

function AppLogo() {
  return (
    <div className="hero__logo" aria-hidden="true">
      <svg viewBox="0 0 64 64" className="hero__logo-svg">
        <defs>
          <linearGradient id="heroLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#heroLogoGrad)" opacity="0.15" />
        <circle cx="32" cy="32" r="22" fill="url(#heroLogoGrad)" />
        <path
          d="M22 28c0-5 4-9 10-9s10 4 10 9v2c0 8-6 14-10 17-4-3-10-9-10-17v-2z"
          fill="white"
          opacity="0.95"
        />
        <circle cx="26" cy="27" r="2" fill="#6366f1" opacity="0.5" />
        <circle cx="38" cy="25" r="1.5" fill="#6366f1" opacity="0.4" />
      </svg>
    </div>
  )
}

export default function HeroSection({ onStartCooking }) {
  const { t } = useLanguage()

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__top">
        <LanguageToggle />
      </div>

      <div className="hero__content">
        <div className="hero__brand">
          <AppLogo />
          <h1 id="hero-title" className="hero__title" dir="ltr">
            FOOD FOR <span className="hero__highlight">ANY MOOD</span>
          </h1>
        </div>

        <p className="hero__subtitle">{t('heroSubtitle')}</p>
        <p className="hero__description">{t('heroDescription')}</p>

        <button type="button" className="btn btn--primary hero__cta" onClick={onStartCooking}>
          {t('heroCta')}
        </button>
      </div>
    </section>
  )
}
