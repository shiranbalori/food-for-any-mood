import { useLanguage } from '../i18n/useLanguage'
import './LoadingAnimation.css'

const ORBIT_ICONS = ['🥄', '🍴', '🧂', '🌿']

export default function LoadingAnimation({ theme }) {
  const { t } = useLanguage()

  return (
    <div className="loading-overlay">
      <div
        className="loading"
        style={{
          '--theme-accent': theme.accent,
          '--theme-gradient': theme.gradient,
          '--theme-glow': theme.glow,
        }}
      >
        <div className="loading__card">
          <div className="loading__ring-wrap">
            <svg className="loading__ring" viewBox="0 0 100 100">
              <circle className="loading__ring-bg" cx="50" cy="50" r="42" />
              <circle className="loading__ring-fill" cx="50" cy="50" r="42" />
            </svg>
            <div className="loading__center">
              <span className="loading__bowl">🍲</span>
            </div>
            {ORBIT_ICONS.map((icon, i) => (
              <span
                key={icon}
                className="loading__orbit-icon"
                style={{ '--orbit-i': i }}
              >
                {icon}
              </span>
            ))}
          </div>

          <p className="loading__text">{t('loading')}</p>

          <div className="loading__progress">
            <div className="loading__progress-bar" />
          </div>

          <div className="loading__dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  )
}
