export const RECIPE_STYLES = {
  quick: {
    id: 'quick',
    maxTime: 25,
    moods: ['energetic', 'happy'],
  },
  healthy: {
    id: 'healthy',
    minHealthScore: 78,
    moods: ['relaxed', 'energetic'],
  },
  comfort: {
    id: 'comfort',
    moods: ['cozy', 'comfort', 'relaxed'],
  },
  family: {
    id: 'family',
    minServings: 3,
    moods: ['happy', 'cozy', 'comfort'],
  },
  romantic: {
    id: 'romantic',
    minTime: 35,
    moods: ['cozy', 'relaxed', 'happy'],
  },
}

export const RECIPE_TAGS = {
  highProtein: { minProtein: 25 },
  healthy: { minHealthScore: 80 },
  quick: { maxTime: 25 },
  vegetarian: { categories: ['dairy', 'parve', 'vegan'] },
  comfortFood: { styles: ['comfort'] },
}

export const MOOD_STYLE_AFFINITY = {
  happy: ['family', 'quick'],
  cozy: ['comfort', 'romantic', 'family'],
  energetic: ['quick', 'healthy'],
  relaxed: ['healthy', 'romantic', 'comfort'],
  adventurous: ['quick', 'family'],
  comfort: ['comfort', 'family'],
}

export function inferPreferredStyles(mood, time) {
  const styles = new Set(MOOD_STYLE_AFFINITY[mood] ?? ['comfort'])

  if (time <= 25) styles.add('quick')
  if (time >= 40) styles.add('romantic')
  if (time >= 50) styles.add('family')
  if (time <= 30) styles.add('quick')

  return [...styles]
}
