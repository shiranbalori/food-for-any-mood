import { useLanguage } from '../i18n/useLanguage'
import LanguageToggle from './LanguageToggle'
import './Header.css'

export default function Header() {
  const { t } = useLanguage()

  return (
    <header className="header">
      <LanguageToggle />
      <div className="header__badge">{t('badge')}</div>
      <h1 className="header__title" dir="ltr">
        FOOD FOR <span className="header__highlight">ANY MOOD</span>
      </h1>
      <p className="header__subtitle">{t('subtitle')}</p>
    </header>
  )
}
