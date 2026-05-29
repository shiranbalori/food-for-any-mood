import { useLanguage } from '../i18n/useLanguage'
import './LanguageToggle.css'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="language-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={`language-toggle__btn ${language === 'he' ? 'language-toggle__btn--active' : ''}`}
        onClick={() => setLanguage('he')}
      >
        עברית
      </button>
      <span className="language-toggle__sep">|</span>
      <button
        type="button"
        className={`language-toggle__btn ${language === 'en' ? 'language-toggle__btn--active' : ''}`}
        onClick={() => setLanguage('en')}
      >
        English
      </button>
    </div>
  )
}
