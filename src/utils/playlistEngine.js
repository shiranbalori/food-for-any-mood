export const PLAYLISTS = [
  {
    id: 'soft-jazz-kitchen',
    name: { he: 'ג\'אז רך למטבח', en: 'Soft Jazz Kitchen' },
    description: {
      he: 'צלילים חלקים ונעימים — מושלם לבישול רגוע ואינטימי',
      en: 'Smooth, warm tones — perfect for calm, intimate cooking',
    },
    moods: ['cozy', 'relaxed', 'comfort'],
    categories: ['dairy', 'parve'],
    styles: ['comfort', 'romantic'],
    energy: 'low',
    timeMin: 15,
    timeMax: 60,
    spotifyQuery: 'lofi cooking playlist',
    youtubeQuery: 'lofi cooking music playlist',
  },
  {
    id: 'morning-sunshine',
    name: { he: 'אור בוקר', en: 'Morning Sunshine' },
    description: {
      he: 'POP עליז וקליל — אנרגיה טובה להתחלת יום במטבח',
      en: 'Upbeat pop vibes — bright energy to start your day',
    },
    moods: ['happy', 'energetic'],
    categories: ['dairy', 'parve'],
    styles: ['quick', 'family'],
    energy: 'high',
    timeMin: 5,
    timeMax: 30,
    spotifyQuery: 'happy cooking music',
    youtubeQuery: 'happy cooking music playlist',
  },
  {
    id: 'fiesta-night',
    name: { he: 'לילה פסטה', en: 'Fiesta Night' },
    description: {
      he: 'קצב לatin חי — מתאים לטacos, תבשילים חריפים ואנרגיה גבוהה',
      en: 'Lively Latin beats — great for tacos, bold flavors, high energy',
    },
    moods: ['happy', 'energetic', 'adventurous'],
    categories: ['meat', 'parve'],
    styles: ['quick', 'family'],
    energy: 'high',
    timeMin: 15,
    timeMax: 45,
    spotifyQuery: 'latin fiesta cooking playlist',
    youtubeQuery: 'latin party cooking music',
  },
  {
    id: 'rainy-day-warmth',
    name: { he: 'חום של יום גשום', en: 'Rainy Day Warmth' },
    description: {
      he: 'אינדי ואקוסטי — לבישול איטי ומרגיע ביום קריר',
      en: 'Indie & acoustic — for slow, soul-warming stovetop sessions',
    },
    moods: ['cozy', 'comfort', 'relaxed'],
    categories: ['meat', 'dairy'],
    styles: ['comfort', 'family'],
    energy: 'low',
    timeMin: 45,
    timeMax: 120,
    spotifyQuery: 'cozy rainy day cooking playlist',
    youtubeQuery: 'cozy rainy day cooking music',
  },
  {
    id: 'bold-smoky',
    name: { he: 'עשן ואש', en: 'Bold & Smoky' },
    description: {
      he: 'רוק ו-blues — לאנרגיה גברית ומתכוני בשר על הלהבה',
      en: 'Rock & blues — bold energy for searing and grilling',
    },
    moods: ['energetic', 'adventurous', 'happy'],
    categories: ['meat'],
    styles: ['quick', 'romantic'],
    energy: 'high',
    timeMin: 10,
    timeMax: 40,
    spotifyQuery: 'blues rock cooking playlist',
    youtubeQuery: 'blues rock kitchen music',
  },
  {
    id: 'candlelight-dinner',
    name: { he: 'ארוחת נרות', en: 'Candlelight Dinner' },
    description: {
      he: 'ג׳azz רומנטי — לארוחות אינטימיות וארוכות',
      en: 'Romantic jazz — intimate, unhurried dinner cooking',
    },
    moods: ['cozy', 'relaxed', 'happy'],
    categories: ['dairy', 'meat', 'parve'],
    styles: ['romantic', 'comfort'],
    energy: 'low',
    timeMin: 35,
    timeMax: 90,
    spotifyQuery: 'romantic dinner jazz playlist',
    youtubeQuery: 'romantic dinner jazz cooking music',
  },
  {
    id: 'fresh-focused',
    name: { he: 'טרי וממוקד', en: 'Fresh & Focused' },
    description: {
      he: 'Lo-fi ואלקטרוניקה עדינה — לbowls בריאים וירקות',
      en: 'Lo-fi & light electronic — clean energy for healthy bowls',
    },
    moods: ['energetic', 'relaxed', 'happy'],
    categories: ['parve'],
    styles: ['healthy', 'quick'],
    energy: 'medium',
    timeMin: 15,
    timeMax: 45,
    spotifyQuery: 'lofi healthy cooking playlist',
    youtubeQuery: 'lofi healthy kitchen music',
  },
  {
    id: 'middle-eastern-grooves',
    name: { he: 'קצבים מהמזרח', en: 'Middle Eastern Grooves' },
    description: {
      he: 'מוזיקה מזרח תיכונית — לshakshuka, kofta ותבלינים',
      en: 'Middle Eastern rhythms — for shakshuka, kofta & spices',
    },
    moods: ['adventurous', 'happy', 'energetic'],
    categories: ['meat', 'dairy', 'parve'],
    styles: ['family', 'comfort'],
    energy: 'medium',
    timeMin: 20,
    timeMax: 55,
    spotifyQuery: 'israeli dinner music',
    youtubeQuery: 'middle eastern cooking music playlist',
  },
  {
    id: 'asian-fusion-beats',
    name: { he: 'ביטים אסייתיים', en: 'Asian Fusion Beats' },
    description: {
      he: 'היפ-hop ואלקטרוניקה — לstir-fry מהיר ואנרגטי',
      en: 'Hip-hop & electronic — fast-paced wok and stir-fry energy',
    },
    moods: ['energetic', 'adventurous'],
    categories: ['parve', 'meat'],
    styles: ['quick', 'healthy'],
    energy: 'high',
    timeMin: 10,
    timeMax: 35,
    spotifyQuery: 'asian cooking beats playlist',
    youtubeQuery: 'asian fusion cooking music',
  },
  {
    id: 'sunday-supper',
    name: { he: 'ארוחת ראשון', en: 'Sunday Supper' },
    description: {
      he: 'סoul ו-R&B — לבישול משפחתי ארוך בסוף השבוע',
      en: 'Soul & R&B — family-style long-form weekend cooking',
    },
    moods: ['happy', 'cozy', 'comfort'],
    categories: ['meat', 'dairy'],
    styles: ['family', 'comfort'],
    energy: 'medium',
    timeMin: 40,
    timeMax: 120,
    spotifyQuery: 'sunday supper soul playlist',
    youtubeQuery: 'sunday family cooking music',
  },
  {
    id: 'cozy-curry-vibes',
    name: { he: 'ווייב קארי', en: 'Cozy Curry Vibes' },
    description: {
      he: 'מוזיקת עולם רגועה — לcurry ותבשילים חמים',
      en: 'Chill world music — warm pots, spices, and slow simmers',
    },
    moods: ['cozy', 'comfort', 'relaxed'],
    categories: ['parve'],
    styles: ['comfort', 'healthy'],
    energy: 'low',
    timeMin: 25,
    timeMax: 60,
    spotifyQuery: 'cozy curry cooking playlist',
    youtubeQuery: 'cozy curry kitchen music',
  },
  {
    id: 'weeknight-wins',
    name: { he: 'ניצחון של ערב חול', en: 'Weeknight Wins' },
    description: {
      he: 'POP מודרני — קצבי ומושלם לבישול מהיר בערב',
      en: 'Modern pop — upbeat tempo for quick weeknight meals',
    },
    moods: ['happy', 'energetic', 'comfort'],
    categories: ['meat', 'dairy', 'parve'],
    styles: ['quick', 'family'],
    energy: 'high',
    timeMin: 10,
    timeMax: 35,
    spotifyQuery: 'quick cooking upbeat playlist',
    youtubeQuery: 'upbeat weeknight kitchen music',
  },
]

export const ENERGY_LABELS = {
  low: { he: 'אנרגיה נמוכה', en: 'Low energy' },
  medium: { he: 'אנרגיה בינונית', en: 'Medium energy' },
  high: { he: 'אנרגיה גבוהה', en: 'High energy' },
}

const MOOD_SEARCH_HINTS = {
  happy: 'happy cooking music',
  cozy: 'cozy cooking playlist',
  energetic: 'upbeat cooking playlist',
  relaxed: 'chill cooking music',
  adventurous: 'world cooking music',
  comfort: 'comfort food cooking music',
}

const RECIPE_KEYWORD_HINTS = [
  { pattern: /שקשוק|shakshuka|חומוס|hummus|פלאפל|falafel|ישראל|israel/i, query: 'israeli dinner music' },
  { pattern: /פסטה|pasta|risotto|שמנת/i, query: 'italian cooking playlist' },
  { pattern: /קארי|curry|עדשים|lentil|תבשיל/i, query: 'cozy curry cooking playlist' },
  { pattern: /מוקפץ|wok|סויה|soy|אסי/i, query: 'asian cooking beats playlist' },
  { pattern: /קציצ|בשר|burger|steak|גריל/i, query: 'blues rock cooking playlist' },
  { pattern: /סלט|ירק|טofu|טופו|בריא/i, query: 'lofi healthy cooking playlist' },
  { pattern: /עוף|chicken|תרנגול/i, query: 'family cooking music playlist' },
]

const MOOD_TITLE_SUFFIX = {
  happy: { he: ' — עליז', en: ' — Happy' },
  cozy: { he: ' — חמים', en: ' — Cozy' },
  energetic: { he: ' — אנרגטי', en: ' — Energetic' },
  relaxed: { he: ' — רגוע', en: ' — Relaxed' },
  adventurous: { he: ' — הרפתקני', en: ' — Adventurous' },
  comfort: { he: ' — מנחם', en: ' — Comfort' },
}

const CATEGORY_DESC = {
  dairy: { he: 'מתאים לארוחות חלביות ונעימות', en: 'Great for dairy dishes' },
  meat: { he: 'מתאים לבשר, גריל וארוחות עשירות', en: 'Great for meat and grill nights' },
  parve: { he: 'מתאים למנות קלות, ירקות וטופו', en: 'Great for light plant-forward meals' },
}

export function buildPlatformSearchUrl(platform, query) {
  const encoded = encodeURIComponent(query)
  if (platform === 'youtube') {
    return `https://www.youtube.com/results?search_query=${encoded}`
  }
  return `https://open.spotify.com/search/${encoded}`
}

function inferEnergyLevel({ mood, cookTime, spiceLevel, style }) {
  let score = 0

  const moodEnergy = {
    energetic: 3,
    happy: 2,
    adventurous: 2,
    cozy: 0,
    relaxed: 0,
    comfort: 1,
  }
  score += moodEnergy[mood] ?? 1

  if (cookTime <= 25) score += 2
  else if (cookTime <= 45) score += 1
  else score -= 1

  if (style === 'quick') score += 1
  if (style === 'romantic' || style === 'comfort') score -= 1

  score += spiceLevel >= 2 ? 1 : 0

  if (score >= 4) return 'high'
  if (score >= 2) return 'medium'
  return 'low'
}

function scorePlaylist(playlist, { mood, category, style, cookTime, energy }) {
  const moodScore = playlist.moods.includes(mood) ? 1 : 0.25
  const categoryScore = playlist.categories.includes(category) ? 1 : 0.3
  const styleScore = playlist.styles.includes(style) ? 1 : 0.35
  const timeScore =
    cookTime >= playlist.timeMin && cookTime <= playlist.timeMax
      ? 1
      : Math.max(0.3, 1 - Math.abs(cookTime - (playlist.timeMin + playlist.timeMax) / 2) / 60)
  const energyScore = playlist.energy === energy ? 1 : playlist.energy === 'medium' ? 0.7 : 0.4

  return (
    moodScore * 0.28 +
    categoryScore * 0.18 +
    styleScore * 0.18 +
    timeScore * 0.18 +
    energyScore * 0.18
  )
}

function pickBestPlaylist({ mood, category, style, cookTime, spiceLevel }) {
  const energy = inferEnergyLevel({ mood, cookTime, spiceLevel, style })
  const scored = PLAYLISTS.map((playlist) => ({
    playlist,
    score: scorePlaylist(playlist, { mood, category, style, cookTime, energy }),
  })).sort((a, b) => b.score - a.score)

  const top = scored.slice(0, 3)
  const pick = top[Math.floor(Math.random() * top.length)] ?? scored[0]
  return { ...pick, energy }
}

function detectRecipeSearchHint(recipeName = '') {
  if (!recipeName) return null
  const match = RECIPE_KEYWORD_HINTS.find(({ pattern }) => pattern.test(recipeName))
  return match?.query ?? null
}

function buildTimeSearchHint(cookTime) {
  if (cookTime <= 20) return 'quick cooking upbeat playlist'
  if (cookTime >= 50) return 'slow cooking relaxing playlist'
  return null
}

function buildSearchQuery({ mood, category, cookTime, recipeName, platform, baseQuery }) {
  const recipeHint = detectRecipeSearchHint(recipeName)
  const timeHint = buildTimeSearchHint(cookTime)

  let query = baseQuery

  if (recipeHint) {
    query = recipeHint
  } else if (mood === 'cozy' && cookTime >= 40) {
    query = 'romantic dinner jazz playlist'
  } else if (mood === 'happy' && cookTime <= 25) {
    query = 'happy cooking music'
  } else if (timeHint) {
    query = timeHint
  } else if (MOOD_SEARCH_HINTS[mood]) {
    query = MOOD_SEARCH_HINTS[mood]
  } else if (category === 'meat' && mood === 'energetic') {
    query = 'blues rock cooking playlist'
  } else if (category === 'parve' && cookTime <= 30) {
    query = 'lofi cooking playlist'
  }

  if (category === 'dairy' && mood === 'cozy' && !recipeHint) {
    query = 'romantic dinner jazz playlist'
  }

  if (platform === 'youtube' && !query.includes('playlist') && !query.includes('music')) {
    return `${query} playlist`
  }

  if (platform === 'spotify' && !query.includes('playlist') && !query.includes('music')) {
    return `${query} playlist`
  }

  return query
}

function buildHebrewDescription({ category, cookTime, recipeName, energy, language }) {
  const lang = language === 'he' ? 'he' : 'en'
  const categoryText = CATEGORY_DESC[category]?.[lang] ?? ''
  const energyText = ENERGY_LABELS[energy]?.[lang] ?? ''

  if (lang === 'he') {
    const timeText =
      cookTime <= 25
        ? `בישול מהיר של כ-${cookTime} דקות`
        : cookTime >= 50
          ? `בישול ארוך ונינוח של כ-${cookTime} דקות`
          : `בישול של כ-${cookTime} דקות`
    const recipeText = recipeName ? `ל"${recipeName}"` : 'למתכון שלך'
    return `${energyText}. ${categoryText}. ${timeText} — ${recipeText}.`
  }

  const timeText =
    cookTime <= 25
      ? `Quick ${cookTime}-minute cook`
      : cookTime >= 50
        ? `Slow ${cookTime}-minute cook`
        : `${cookTime}-minute cook`
  const recipeText = recipeName ? `for "${recipeName}"` : 'for your recipe'
  return `${energyText}. ${categoryText}. ${timeText} ${recipeText}.`
}

/**
 * Builds a smart playlist search recommendation from recipe context.
 */
export function buildSmartPlaylistSearch(
  { mood, category, style = 'comfort', cookTime = 30, recipeName = '', spiceLevel = 0 },
  platform = 'spotify',
  language = 'he',
) {
  const { playlist, score, energy } = pickBestPlaylist({
    mood,
    category,
    style,
    cookTime,
    spiceLevel,
  })

  const baseQuery = platform === 'youtube' ? playlist.youtubeQuery : playlist.spotifyQuery
  const searchQuery = buildSearchQuery({
    mood,
    category,
    cookTime,
    recipeName,
    platform,
    baseQuery,
  })

  const lang = language === 'he' ? 'he' : 'en'
  const moodSuffix = MOOD_TITLE_SUFFIX[mood]?.[lang] ?? ''
  const name = `${playlist.name[lang] ?? playlist.name.en}${moodSuffix}`
  const description = buildHebrewDescription({
    category,
    cookTime,
    recipeName,
    energy,
    language: lang,
  })
  const matchPercent = Math.min(99, Math.round(score * 70 + 22 + Math.random() * 6))

  return {
    id: playlist.id,
    name,
    description,
    energy,
    energyLabel: ENERGY_LABELS[energy][lang] ?? ENERGY_LABELS[energy].en,
    platform,
    url: buildPlatformSearchUrl(platform, searchQuery),
    searchQuery,
    matchPercent,
  }
}

export function recommendPlaylist(
  { mood, category, style, cookTime, spiceLevel = 0, recipeName = '' },
  platform = 'spotify',
  language = 'he',
) {
  return buildSmartPlaylistSearch(
    { mood, category, style, cookTime, spiceLevel, recipeName },
    platform,
    language,
  )
}

export function resolvePlaylist(
  playlist,
  platform = 'spotify',
  language = 'he',
  context = null,
) {
  if (context) {
    return buildSmartPlaylistSearch(
      {
        mood: context.mood ?? 'cozy',
        category: context.category ?? 'parve',
        style: context.style ?? 'comfort',
        cookTime: context.cookTime ?? 30,
        recipeName: context.recipeName ?? '',
        spiceLevel: context.spiceLevel ?? 0,
      },
      platform,
      language,
    )
  }

  if (!playlist) {
    return recommendPlaylist(
      { mood: 'cozy', category: 'parve', style: 'comfort', cookTime: 30 },
      platform,
      language,
    )
  }

  if (
    typeof playlist === 'object' &&
    typeof playlist.name === 'string' &&
    typeof playlist.url === 'string' &&
    playlist.url.startsWith('http')
  ) {
    const energy = playlist.energy ?? 'medium'
    return {
      id: playlist.id ?? 'custom-playlist',
      name: playlist.name,
      description: playlist.description ?? '',
      energy,
      energyLabel: ENERGY_LABELS[energy][language] ?? ENERGY_LABELS[energy].en,
      platform: playlist.platform === 'youtube' ? 'youtube' : platform,
      url: playlist.url,
      searchQuery: playlist.searchQuery ?? '',
      matchPercent: playlist.matchPercent ?? 85,
    }
  }

  const playlistId =
    typeof playlist === 'object' && playlist.id
      ? playlist.id
      : PLAYLISTS.find((p) => p.name.en === playlist)?.id

  const def = PLAYLISTS.find((p) => p.id === playlistId) ?? PLAYLISTS[0]
  const query = platform === 'youtube' ? def.youtubeQuery : def.spotifyQuery

  return {
    id: def.id,
    name: def.name[language] ?? def.name.en,
    description: def.description[language] ?? def.description.en,
    energy: typeof playlist === 'object' ? playlist.energy ?? 'medium' : 'medium',
    energyLabel:
      ENERGY_LABELS[typeof playlist === 'object' ? playlist.energy ?? 'medium' : 'medium'][
        language
      ] ?? ENERGY_LABELS.medium.en,
    platform,
    url: buildPlatformSearchUrl(platform, query),
    searchQuery: query,
    matchPercent:
      typeof playlist === 'object' && playlist.matchPercent
        ? playlist.matchPercent
        : 80,
  }
}
