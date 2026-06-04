import { useLanguage } from '../i18n/useLanguage'
import './MyAreaPageSection.css'

/**
 * @param {{ title?: string, titleKey?: string, onBack: () => void, onHome: () => void, children: import('react').ReactNode, className?: string }} props
 */
export default function MyAreaPageSection({
  title,
  titleKey,
  onBack,
  onHome,
  children,
  className = '',
}) {
  const { t } = useLanguage()
  const heading = title ?? (titleKey ? t(titleKey) : '')

  return (
    <div className={`my-area-page ${className}`.trim()}>
      <header className="my-area-page__header">
        <div className="my-area-page__nav">
          <button
            type="button"
            className="my-area-page__home"
            onClick={onHome}
            aria-label={t('myAreaHomeLabel')}
          >
            <span className="my-area-page__home-icon" aria-hidden="true">
              🏠
            </span>
          </button>
          <button type="button" className="my-area-page__back" onClick={onBack}>
            <span className="my-area-page__back-arrow" aria-hidden="true">
              ←
            </span>
            {t('myAreaBack')}
          </button>
        </div>
        <h1 className="my-area-page__title">{heading}</h1>
      </header>
      <div className="my-area-page__content">{children}</div>
    </div>
  )
}
