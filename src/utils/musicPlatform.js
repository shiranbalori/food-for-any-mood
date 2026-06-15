import { recommendPlaylist } from './playlistEngine'

/** @typedef {'spotify' | 'youtube'} MusicPlatform */

/**
 * @param {unknown} platform
 * @returns {platform is MusicPlatform}
 */
export function isMusicPlatformSelected(platform) {
  return platform === 'spotify' || platform === 'youtube'
}

/**
 * @param {unknown} platform
 * @returns {MusicPlatform | null}
 */
export function normalizeMusicPlatform(platform) {
  return isMusicPlatformSelected(platform) ? platform : null
}

/**
 * Build a playlist recommendation only when the user picked a platform.
 * @returns {ReturnType<typeof recommendPlaylist> | null}
 */
export function buildPlaylistIfSelected(context, platform, language = 'he') {
  const selected = normalizeMusicPlatform(platform)
  if (!selected) return null
  return recommendPlaylist(context, selected, language)
}
