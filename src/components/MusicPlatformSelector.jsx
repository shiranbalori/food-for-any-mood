import { useLanguage } from '../i18n/useLanguage'
import './MusicPlatformSelector.css'

const PLATFORMS = [
  {
    id: 'spotify',
    label: 'Spotify',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="platform-icon platform-icon--spotify">
        <circle cx="12" cy="12" r="12" fill="currentColor" />
        <path
          fill="#fff"
          d="M17.2 10.9c-2.8-1.7-7.4-1.8-10.1-1 -.3.1-.5-.2-.3-.4 1-1.2 2.9-2.1 4.9-2.1 2.3 0 4.8.9 6.7 2.5.2.2.1.5-.2.4zm-.9 2.1c-.2.2-.6.1-.8 0-2.3-1.4-6-1.8-8.3-1-.3 0-.6-.2-.4-.5.2-.3.6-.5 1-.5 2.6 0 5.9.7 8 2.1.2.1.3.5.1.7zm-1 2.1c-.2.2-.5.1-.7 0-2-.1-4.2-.7-5.8-1.4-.3-.1-.4-.4-.2-.6.1-.2.4-.3.6-.2 1.8.7 3.8 1.2 5.6 1.3.2 0 .4.2.3.5z"
        />
      </svg>
    ),
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="platform-icon platform-icon--youtube">
        <rect width="24" height="24" rx="6" fill="currentColor" />
        <path fill="#fff" d="M10 8.5v7l6-3.5-6-3.5z" />
      </svg>
    ),
  },
]

export default function MusicPlatformSelector({ selected, onChange, theme }) {
  const { t } = useLanguage()

  return (
    <section
      className="music-platform"
      style={{
        '--theme-accent': theme.accent,
        '--theme-accent-light': theme.accentLight,
        '--theme-glow': theme.glow,
      }}
    >
      <h2 className="section-title">{t('musicPlatformTitle')}</h2>
      <div className="music-platform__grid">
        {PLATFORMS.map((platform) => (
          <button
            key={platform.id}
            type="button"
            className={`music-platform__card music-platform__card--${platform.id} ${
              selected === platform.id ? 'music-platform__card--active' : ''
            }`}
            onClick={() => onChange(platform.id)}
            aria-pressed={selected === platform.id}
          >
            {platform.icon}
            <span>{platform.label}</span>
            {selected === platform.id && (
              <span className="music-platform__check">✓</span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
