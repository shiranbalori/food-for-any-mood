import { polishHebrewRecipeForDisplay } from './recipeHebrewPolish'

const HEBREW_CHAR = /[\u0590-\u05FF]/
const LATIN_CHAR = /[A-Za-z]/

const REPLACEMENTS = [
  [/olive\s+oil/gi, 'שמן זית'],
  [/black\s+pepper/gi, 'פלפל שחור'],
  [/heavy\s+cream/gi, 'שמנת מתוקה'],
  [/sour\s+cream/gi, 'חמאה חמוצה'],
  [/lemon\s+juice/gi, 'מיץ לימון'],
  [/pine\s+nuts/gi, 'צנוברים'],
  [/(?:tahini|tehina|thina|tahina|tahin)/gi, 'טחינה'],
  [/(?:חטina|טחina|חטינa|טחינa|חטin|טחin)/gi, 'טחינה'],
  [/(?:balsamico|balsamic|alsamico)/gi, 'בלסמי'],
  [/\u05d1[a-zA-Z]*(?:samic|samico)/gi, 'בלסמי'],
  [/oregano/gi, 'אורגנו'],
  [/parsley/gi, 'פטרוזיליה'],
  [/basil/gi, 'בזיליקום'],
  [/mozzarella/gi, 'מוצרלה'],
  [/parmesan|parmezan/gi, 'פרמזן'],
  [/\bfeta\b/gi, 'גבינת פטה'],
  [/ricotta/gi, 'ריקוטה'],
  [/chilli?/gi, "צ'ילי"],
  [/cumin/gi, 'כמון'],
  [/paprika/gi, 'פפריקה'],
  [/\bhoney\b/gi, 'דבש'],
  [/\blemon\b/gi, 'לימון'],
  [/thyme/gi, 'טימין'],
  [/\bherbs\b/gi, 'עשבי תיבול'],
  [/\bgarlic\b/gi, 'שום'],
  [/\bonion\b/gi, 'בצל'],
  [/\btomato(?:es)?\b/gi, 'עגבניות'],
  [/\bcheese\b/gi, 'גבינה'],
  [/\bbutter\b/gi, 'חמאה'],
  [/\bsalt\b/gi, 'מלח'],
  [/\bpepper\b/gi, 'פלפל'],
  [/\boil\b/gi, 'שמן'],
  [/\bwater\b/gi, 'מים'],
  [/\bsugar\b/gi, 'סוכר'],
  [/\bflour\b/gi, 'קמח'],
  [/\bmilk\b/gi, 'חלב'],
  [/\beggs?\b/gi, 'ביצים'],
  [/\bchicken\b/gi, 'עוף'],
  [/\bbeef\b/gi, 'בשר'],
  [/\bfish\b/gi, 'דג'],
  [/\brice\b/gi, 'אורז'],
  [/\bpasta\b/gi, 'פסטה'],
  [/\bcream\b/gi, 'שמנת'],
  [/\byogurt\b/gi, 'יוגורט'],
  [/\bvinegar\b/gi, 'חומץ'],
  [/\bcinnamon\b/gi, 'קינמון'],
  [/\bnuts\b/gi, 'אגוזים'],
  [/\bwalnuts\b/gi, 'אגוזי מלך'],
  [/\bhummus\b/gi, 'חומוס'],
  [/\btbsp\b/gi, 'כפות'],
  [/\btsp\b/gi, 'כפיות'],
  [/\bkcal\b/gi, 'קלוריות'],
  [/\bcal\b/gi, 'קלוריות'],
]

const LATIN_WORD = /[A-Za-z]{2,}/g

const MIXED_WORD =
  /(?<![\u0590-\u05FFa-zA-Z])([\u0590-\u05FF]+[a-zA-Z]+|[a-zA-Z]+[\u0590-\u05FF]+)(?![\u0590-\u05FFa-zA-Z])/g

export function hasMixedScript(text) {
  return HEBREW_CHAR.test(String(text)) && LATIN_CHAR.test(String(text))
}

function applyReplacements(text) {
  let result = text
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function fixMixedToken(token) {
  if (!hasMixedScript(token)) return token
  const lowered = token.toLowerCase()
  for (const [pattern, replacement] of REPLACEMENTS) {
    if (pattern.test(token) || pattern.test(lowered)) {
      pattern.lastIndex = 0
      return replacement
    }
    pattern.lastIndex = 0
  }
  const hebrewOnly = token.match(HEBREW_CHAR)
  if (hebrewOnly?.length) {
    const joined = hebrewOnly.join('')
    if (joined.length >= 2) return joined
  }
  const latinOnly = (token.match(LATIN_CHAR) || []).join('')
  if (latinOnly) {
    for (const [pattern, replacement] of REPLACEMENTS) {
      if (pattern.test(latinOnly)) {
        pattern.lastIndex = 0
        return replacement
      }
      pattern.lastIndex = 0
    }
  }
  return ''
}

function fixMixedWords(text) {
  if (!text || !hasMixedScript(text)) return text
  let cleaned = text.replace(MIXED_WORD, (_, token) => fixMixedToken(token) || '')
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  cleaned = cleaned.replace(/\s+,/g, ',')
  cleaned = cleaned.replace(/,\s*,+/g, ', ')
  return cleaned.trim()
}

function stripUnknownLatinWords(text) {
  if (!HEBREW_CHAR.test(text)) return text
  let cleaned = text.replace(LATIN_WORD, (token) => {
    for (const [pattern, replacement] of REPLACEMENTS) {
      if (pattern.test(token)) {
        pattern.lastIndex = 0
        return replacement
      }
      pattern.lastIndex = 0
    }
    return ''
  })
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  return cleaned.trim()
}

export function normalizeHebrewDisplayText(text, language = 'he') {
  if (language !== 'he' || text == null) return text == null ? '' : String(text)
  const raw = String(text).trim()
  if (!raw) return raw
  return stripUnknownLatinWords(fixMixedWords(applyReplacements(raw))).trim()
}

function normalizeStringList(items, language) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => normalizeHebrewDisplayText(item, language))
    .filter((item) => String(item || '').trim())
}

export function normalizeHebrewRecipeContent(recipe, language = 'he') {
  if (language !== 'he' || !recipe || typeof recipe !== 'object') return recipe
  const out = { ...recipe }
  for (const key of ['name', 'description', 'categoryNote']) {
    if (out[key]) out[key] = normalizeHebrewDisplayText(out[key], language)
  }
  if (out.ingredients) out.ingredients = normalizeStringList(out.ingredients, language)
  if (out.steps) out.steps = normalizeStringList(out.steps, language)
  if (Array.isArray(out.optionalUpgrades)) {
    out.optionalUpgrades = out.optionalUpgrades.map((upgrade) => ({
      ...upgrade,
      ingredient: normalizeHebrewDisplayText(upgrade.ingredient, language),
      reason: normalizeHebrewDisplayText(upgrade.reason, language),
    }))
  }
  return polishHebrewRecipeForDisplay(out, language)
}

function normalizeDictFields(data, { stringKeys, listKeys, language }) {
  const out = { ...data }
  for (const key of stringKeys) {
    if (out[key]) out[key] = normalizeHebrewDisplayText(out[key], language)
  }
  for (const key of listKeys) {
    if (out[key]) out[key] = normalizeStringList(out[key], language)
  }
  return out
}

export function normalizeThemedMealContent(meal, language = 'he') {
  if (language !== 'he' || !meal || typeof meal !== 'object') return meal
  return normalizeDictFields(meal, {
    stringKeys: ['mealTitle', 'description', 'starter', 'main', 'dessert'],
    listKeys: ['sides', 'drinks', 'servingIdeas', 'hostingTips'],
    language,
  })
}

export function normalizeRecipeUpgradeContent(upgrade, language = 'he') {
  if (language !== 'he' || !upgrade || typeof upgrade !== 'object') return upgrade
  return normalizeDictFields(upgrade, {
    stringKeys: ['upgradedTitle', 'servingSuggestion', 'premiumTouch', 'nutritionImpact'],
    listKeys: ['changes', 'upgradedIngredients', 'preparationNotes'],
    language,
  })
}

export function normalizeThemedMealUpgradeContent(upgrade, language = 'he') {
  if (language !== 'he' || !upgrade || typeof upgrade !== 'object') return upgrade
  return normalizeDictFields(upgrade, {
    stringKeys: ['upgradedMealTitle'],
    listKeys: [
      'upgradedMenu',
      'dishUpgrades',
      'servingIdeas',
      'atmosphereIdeas',
      'specialAdditions',
      'impressiveTips',
    ],
    language,
  })
}
