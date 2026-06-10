import { useLanguage } from '../i18n/useLanguage'
import './MyAreaPageSection.css'

/**
 * @param {{
 *   title?: string,
 *   titleKey?: string,
 *   children: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export default function MyAreaPageSection({ title, titleKey, children, className = '' }) {
  const { t } = useLanguage()
  const heading = title ?? (titleKey ? t(titleKey) : '')

  return (
    <div className={`my-area-page ${className}`.trim()}>
      <header className="my-area-page__header">
        <h1 className="my-area-page__title">{heading}</h1>
      </header>
      <div className="my-area-page__content">{children}</div>
    </div>
  )
}
