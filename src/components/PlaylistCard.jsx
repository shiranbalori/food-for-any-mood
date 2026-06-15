import { useLanguage } from '../i18n/useLanguage'
import { isMusicPlatformSelected } from '../utils/musicPlatform'
import { buildSmartPlaylistSearch } from '../utils/playlistEngine'
import './PlaylistCard.css'

function SpotifyIcon({ className = 'playlist-card__brand-icon' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="12" fill="#1db954" />
      <path
        fill="#fff"
        d="M17.2 10.9c-2.8-1.7-7.4-1.8-10.1-1-.3.1-.5-.2-.3-.4 1-1.2 2.9-2.1 4.9-2.1 2.3 0 4.8.9 6.7 2.5.2.2.1.5-.2.4zm-.9 2.1c-.2.2-.6.1-.8 0-2.3-1.4-6-1.8-8.3-1-.3 0-.6-.2-.4-.5.2-.3.6-.5 1-.5 2.6 0 5.9.7 8 2.1.2.1.3.5.1.7zm-1 2.1c-.2.2-.5.1-.7 0-2-.1-4.2-.7-5.8-1.4-.3-.1-.4-.4-.2-.6.1-.2.4-.3.6-.2 1.8.7 3.8 1.2 5.6 1.3.2 0 .4.2.3.5z"
      />
    </svg>
  )
}

function YouTubeIcon({ className = 'playlist-card__brand-icon' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect width="24" height="24" rx="6" fill="#ff0000" />
      <path fill="#fff" d="M10 8.5v7l6-3.5-6-3.5z" />
    </svg>
  )
}

export default function PlaylistCard({
  playlist,
  musicPlatform,
  mood,
  category,
  recipeName,
  cookTime,
  style,
  spiceLevel,
  compact = false,
}) {
  const { t, language } = useLanguage()
  const selectedPlatform = isMusicPlatformSelected(musicPlatform)
    ? musicPlatform
    : isMusicPlatformSelected(playlist?.platform)
      ? playlist.platform
      : null

  if (!selectedPlatform) return null

  const data = buildSmartPlaylistSearch(
    {
      mood: mood ?? 'cozy',
      category: category ?? 'parve',
      style: style ?? 'comfort',
      cookTime: cookTime ?? 30,
      recipeName: recipeName ?? '',
      spiceLevel: spiceLevel ?? 0,
    },
    selectedPlatform,
    language,
  )
  const isSpotify = data.platform === 'spotify'
  const openLabel = isSpotify ? 'פתח ב-Spotify' : t('openInYouTube')

  if (compact) {
    return (
      <div
        className={`playlist-card playlist-card--compact playlist-card--${data.platform}`}
        style={{ '--playlist-accent': isSpotify ? '#1db954' : '#ff0000' }}
      >
        <div className="playlist-card__compact-main">
          <span className="playlist-card__label">פלייליסט מומלץ</span>
          <p className="playlist-card__compact-title">{data.name}</p>
          {data.matchPercent != null && (
            <span className="playlist-card__compact-match">{data.matchPercent}% התאמה</span>
          )}
        </div>
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`playlist-card__btn-compact playlist-card__btn-compact--${data.platform}`}
          aria-label={openLabel}
        >
          {isSpotify ? <SpotifyIcon className="playlist-card__btn-icon" /> : null}
          {openLabel}
        </a>
      </div>
    )
  }

  return (
    <div
      className={`playlist-card playlist-card--${data.platform} animate-in stagger-3`}
      style={{ '--playlist-accent': isSpotify ? '#1db954' : '#ff0000' }}
    >
      <div className="playlist-card__visual" aria-hidden="true">
        <div className="playlist-card__wave playlist-card__wave--1" />
        <div className="playlist-card__wave playlist-card__wave--2" />
        <div className="playlist-card__wave playlist-card__wave--3" />
        {isSpotify ? <SpotifyIcon /> : <YouTubeIcon />}
      </div>

      <div className="playlist-card__body">
        <div className="playlist-card__header">
          <span className="playlist-card__label">{t('playlistRecommendation')}</span>
          <span className="playlist-card__match">
            {data.matchPercent}% {t('match')}
          </span>
        </div>

        <div className="playlist-card__platform">
          {isSpotify ? t('platformSpotify') : t('platformYouTube')}
        </div>

        <h4 className="playlist-card__title">{data.name}</h4>
        <p className="playlist-card__desc">{data.description}</p>

        <div className="playlist-card__meta">
          <span>{data.energyLabel}</span>
          {mood && <span>{t(`moods.${mood}`)}</span>}
          {category && <span>{t(`categories.${category}`)}</span>}
        </div>

        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`playlist-card__btn playlist-card__btn--${data.platform}`}
          aria-label={isSpotify ? t('openInSpotify') : t('openInYouTube')}
        >
          {isSpotify ? <SpotifyIcon /> : <YouTubeIcon />}
          {isSpotify ? t('openInSpotify') : t('openInYouTube')}
        </a>
      </div>
    </div>
  )
}
