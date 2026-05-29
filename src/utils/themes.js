export const CATEGORIES = {
  dairy: {
    id: 'dairy',
    emoji: '🥛',
    gradient: 'linear-gradient(135deg, #bfdbfe 0%, #60a5fa 45%, #3b82f6 100%)',
    mesh: 'radial-gradient(at 20% 20%, rgba(147, 197, 253, 0.45) 0%, transparent 50%), radial-gradient(at 80% 10%, rgba(96, 165, 250, 0.3) 0%, transparent 45%)',
    accent: '#2563eb',
    accentLight: 'rgba(219, 234, 254, 0.85)',
    accentDark: '#1e40af',
    glow: 'rgba(59, 130, 246, 0.45)',
    cardBg: 'rgba(219, 234, 254, 0.6)',
    shadow: '0 24px 48px rgba(37, 99, 235, 0.18), 0 0 0 1px rgba(255,255,255,0.5) inset',
  },
  meat: {
    id: 'meat',
    emoji: '🥩',
    gradient: 'linear-gradient(135deg, #fecaca 0%, #f87171 42%, #dc2626 100%)',
    mesh: 'radial-gradient(at 15% 80%, rgba(252, 165, 165, 0.4) 0%, transparent 50%), radial-gradient(at 85% 20%, rgba(239, 68, 68, 0.25) 0%, transparent 45%)',
    accent: '#dc2626',
    accentLight: 'rgba(254, 202, 202, 0.85)',
    accentDark: '#991b1b',
    glow: 'rgba(239, 68, 68, 0.4)',
    cardBg: 'rgba(254, 205, 211, 0.6)',
    shadow: '0 24px 48px rgba(185, 28, 28, 0.18), 0 0 0 1px rgba(255,255,255,0.5) inset',
  },
  parve: {
    id: 'parve',
    emoji: '🥗',
    gradient: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 45%, #059669 100%)',
    mesh: 'radial-gradient(at 70% 30%, rgba(110, 231, 183, 0.4) 0%, transparent 50%), radial-gradient(at 25% 75%, rgba(52, 211, 153, 0.28) 0%, transparent 45%)',
    accent: '#059669',
    accentLight: 'rgba(209, 250, 229, 0.85)',
    accentDark: '#047857',
    glow: 'rgba(16, 185, 129, 0.4)',
    cardBg: 'rgba(209, 250, 229, 0.6)',
    shadow: '0 24px 48px rgba(5, 150, 105, 0.18), 0 0 0 1px rgba(255,255,255,0.5) inset',
  },
}

export const MOODS = [
  { id: 'happy', emoji: '😊' },
  { id: 'cozy', emoji: '🛋️' },
  { id: 'energetic', emoji: '⚡' },
  { id: 'relaxed', emoji: '🧘' },
  { id: 'adventurous', emoji: '🌍' },
  { id: 'comfort', emoji: '🤗' },
]

export function getTheme(categoryId) {
  return CATEGORIES[categoryId] ?? CATEGORIES.parve
}
