import { useLanguage } from '../i18n/useLanguage'
import './SpiceLevel.css'

export default function SpiceLevel({ level = 0, max = 3 }) {
  const { t } = useLanguage()
  const safeLevel = Math.min(max, Math.max(0, level ?? 0))

  const label =
    safeLevel <= 1 ? t('spiceMild') : safeLevel === 2 ? t('spiceMedium') : t('spiceHot')

  return (
    <div className="spice-level" aria-label={`${t('spiceLevel')} ${safeLevel}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`spice-level__chili ${i < safeLevel ? 'spice-level__chili--active' : ''}`}
        >
          🌶️
        </span>
      ))}
      <span className="spice-level__label">{label}</span>
    </div>
  )
}
