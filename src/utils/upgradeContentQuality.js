/** Concrete upgrade content validation and fallbacks (mirrors backend/upgrade_content_quality.py). */

import {
  normalizeRecipeUpgradeContent,
  normalizeThemedMealUpgradeContent,
} from './hebrewDisplayText'

const VAGUE_WORDS = [
  'מיוחד',
  'משודרג',
  'איכותי',
  'נימוח',
  'מפנק',
  'חגיגי',
  'עשיר',
  'מרשים',
  'מעוצב',
  'תיבול',
  "טאץ'",
  'טאץ',
  'פרימיום',
  'מושקע',
  'מעודנ',
  'ויזואל',
  'אווירה',
  'מוזיקת רקע',
]

const QUANTITY_PATTERN = /(\d+|חצי|רבע|שליש|כף|כפות|כפית|כפיות|גרם|ק["']?ג|מ["']?ל|ליטר|יחיד|יחידות|→)/i
const ACTION_PATTERN = /(הוסיפ|מוסיפ|חתכ|קלו|מערב|בשל|אפ|טג|מר|פזר|הגיש|רתח|שבר|גרד|ערבב|ייבש|סמכ)/i

export function isConcreteUpgradeText(text) {
  const cleaned = String(text ?? '').trim().replace(/\s+/g, ' ')
  if (cleaned.length < 18) return false
  const hasMarker = QUANTITY_PATTERN.test(cleaned) || cleaned.includes('→')
  const hasAction = ACTION_PATTERN.test(cleaned)
  if (!hasMarker && !(hasAction && cleaned.length >= 35)) return false
  const lowered = cleaned.toLowerCase()
  for (const word of VAGUE_WORDS) {
    if (lowered.includes(word) && !hasMarker) return false
  }
  return true
}

export function ensureConcreteText(text, fallback) {
  const cleaned = String(text ?? '').trim().replace(/\s+/g, ' ')
  return isConcreteUpgradeText(cleaned) ? cleaned : fallback
}

export function ensureConcreteList(items, fallbacks) {
  const source = (items ?? []).map((item) => String(item ?? '').trim()).filter(Boolean)
  return fallbacks.map((fallback, index) => ensureConcreteText(source[index] ?? '', fallback))
}

function detectDishKey(name) {
  const text = String(name ?? '').toLowerCase()
  if (text.includes('שקשוק') || text.includes('shakshuka')) return 'shakshuka'
  if (text.includes('חומוס') || text.includes('hummus')) return 'hummus'
  if (text.includes('פסטה') || text.includes('pasta') || text.includes('ספגטי')) return 'pasta'
  if (text.includes('סלט') || text.includes('salad')) return 'salad'
  if (text.includes('מרק') || text.includes('soup')) return 'soup'
  if (text.includes('עוף') || text.includes('chicken')) return 'chicken'
  if (text.includes('אורז') || text.includes('rice')) return 'rice'
  if (text.includes('עוג') || text.includes('cake') || text.includes('קינוח') || text.includes('מוס')) {
    return 'dessert'
  }
  return 'generic'
}

export function buildConcreteRecipeUpgrade({
  name = 'המתכון',
  category = 'parve',
  recipeType = 'meal',
  isGlutenFree = false,
} = {}) {
  const recipeName = String(name ?? '').trim() || 'המתכון'
  const gf = isGlutenFree ? ' (ללא גלוטן)' : ''
  const dish = detectDishKey(recipeName)

  if (dish === 'shakshuka') {
    const parveNote =
      category === 'parve'
        ? '2 כפות טחינה גולמית מעל ההגשה — אם המתכון פרווה.'
        : '2 כפות שמנת לבישול או 40 גרם גבינת עיזים — רק אם המתכון חלבי.'
    return {
      upgradedTitle: `${recipeName} עם פטה, פלפל קלוי וכמון`,
      changes: [
        "הוסיפו 1 פלפל אדום קלוי חתוך לקוביות, 80 גרם גבינת פטה מפוררת, חצי כפית כמון, רבע כפית צ'ילי גרוס ו-2 כפות פטרוזיליה קצוצה לרוטב לפני הביצים.",
        'בשלו את הרוטב 5 דקות נוספות על אש בינונית עד שהפלפל רך והרוטב סמיך יותר.',
        parveNote,
      ],
      upgradedIngredients: [
        '1 פלפל אדום קלוי, חתוך לקוביות',
        category !== 'meat' ? '80 גרם גבינת פטה מפוררת' : '1 כף שמן זית כתית',
        'חצי כפית כמון',
        "רבע כפית צ'ילי גרוס",
        '2 כפות פטרוזיליה קצוצה',
      ],
      preparationNotes: [
        'לאחר הוספת הפלפל והתבלינים — בישלו 5 דקות ורק אז שברו את הביצים לגומות.',
        'הוסיפו את הפטה רק אחרי כיבוי האש, כדי שלא תימס לגמרי.',
        'הגישו מיד בצלחת חמה — הרוטב ממשיך לבשל את הביצים מהשארית.',
      ],
      servingSuggestion:
        'הגישו ב-4 מחבתות קטנות או בצלחת רדודה עם 2 כפות רוטב סביב כל ביצה, פטרוזיליה ו-1 כפית פלפל שחור טחון.',
      premiumTouch: 'פזרו 1 כף שמן זית כתית ו-1 כף פטרוזיליה על כל מנה ממש לפני ההגשה.',
      nutritionImpact:
        '80 גרם פטה מוסיפים כ-200 קלוריות ו-8 גרם חלבון ל-4 מנות; הפלפל מוסיף ויטמין C ללא שומן.',
    }
  }

  if (dish === 'pasta' && category !== 'meat') {
    return {
      upgradedTitle: `${recipeName} עם שמן, שום ופרמזן`,
      changes: [
        'הוסיפו 3 שיני שום כתושות, 3 כפות שמן זית כתית, 40 גרם פרמזן מגורד ו-2 כפות אורגנו טרי.',
        'שמרו 120 מ"ל מי בישול הפסטה — ערבבו עם הרוטב 2 דקות על אש נמוכה.',
      ],
      upgradedIngredients: [
        '3 שיני שום כתושות',
        '3 כפות שמן זית כתית',
        '40 גרם פרמזן מגורד',
        '2 כפות אורגנו טרי קצוץ',
        '120 מ"ל מי בישול פסטה',
      ],
      preparationNotes: [
        'טגנו את השום 30 שניות בשמן — אל תשרפו.',
        'ערבבו את הפסטה עם הרוטב ומי הבישול עד ציפוי אחיד.',
      ],
      servingSuggestion: 'הגישו בצלחת עמוקה עם 1 כף פרמזן נוסף וענף בזיליקום.',
      premiumTouch: 'גרדו 1 כף קליפת לימון מעל כל מנה לפני ההגשה.',
      nutritionImpact: '40 גרם פרמזן מוסיפים כ-160 קלוריות ו-12 גרם חלבון ל-2 מנות.',
    }
  }

  if (recipeType === 'dessert') {
    return {
      upgradedTitle: `${recipeName} עם מלח ים ווניל`,
      changes: [
        'הוסיפו רבע כפית מלח ים, חצי כפית תמצית וניל ו-2 כפות חמאה מומסת לבלילה.',
        'אפו 3 דקות פחות מהרגיל — הגרעין יישאר לח יותר.',
      ],
      upgradedIngredients: [
        'רבע כפית מלח ים',
        'חצי כפית תמצית וניל',
        category !== 'parve' ? '2 כפות חמאה מומסת' : '2 כפות שמן קוקוס',
      ],
      preparationNotes: [
        'ערבבו מלח ווניל לתערובת היבשה לפני הוספת נוזלים.',
        'הוציאו מהתנור כשהמרכז עדיין רך — השארית תמשיך להתמצק.',
      ],
      servingSuggestion: 'הגישו פרוסה בטמפרטורת החדר עם 1 כף קצפת או יוגורט לצד.',
      premiumTouch: 'פזרו 1 כפית אבקת קקאו או סוכר דק על כל פרוסה.',
      nutritionImpact: '2 כפות חמאה מוסיפות כ-100 קלוריות ל-8 מנות — שומן וטעם בלבד.',
    }
  }

  if (category === 'meat') {
    return {
      upgradedTitle: `${recipeName} עם מרינדת לימון וטימין`,
      changes: [
        'מרינדה: 3 כפות שמן זית, מיץ מלימון אחד, 2 שיני שום, 1 כפית טימין יבש — 20 דקות.',
        'סמכו את הבשר 3 דקות מכל צד על מחבת חמה לפני המשך הבישול.',
      ],
      upgradedIngredients: [
        '3 כפות שמן זית',
        'מיץ מלימון אחד',
        '2 שיני שום כתושות',
        '1 כפית טימין יבש',
      ],
      preparationNotes: [
        'ייבשו את הבשר עם נייר סופג לפני הטיגון — קרום טוב יותר.',
        'הוסיפו את המרינדה רק ב-5 הדקות האחרונות כדי שלא תישרף.',
      ],
      servingSuggestion: 'חתכו בנתחים אלכסוניים של 1.5 ס"מ והגישו עם 2 כפות מיץ מהמחבת.',
      premiumTouch: 'פזרו 1 כף פטרוזיליה קצוצה על כל מנה.',
      nutritionImpact: '3 כפות שמן מוסיפות כ-360 קלוריות ל-4 מנות — שומן בריא לטיגון.',
    }
  }

  if (category === 'dairy') {
    return {
      upgradedTitle: `${recipeName} עם שמנת, שום ופרמזן${gf}`,
      changes: [
        'הוסיפו 100 מ"ל שמנת מתוקה, 2 שיני שום כתושות ו-30 גרם פרמזן מגורד.',
        'בשלו 4 דקות על אש נמוכה עד שהרוטב מסמיך.',
      ],
      upgradedIngredients: [
        '100 מ"ל שמנת מתוקה',
        '2 שיני שום כתושות',
        '30 גרם פרמזן מגורד',
      ],
      preparationNotes: [
        'הוסיפו שמנת רק אחרי שהמרכיבים העיקריים מבושלים.',
        'ערבבו 1 כף קורנפלור מומס ב-2 כפות מים אם צריך לסמיך.',
      ],
      servingSuggestion: 'הגישו ב-4 קעריות עם 1 כף פרמזן נוסף מעל.',
      premiumTouch: '1 כף חמאה קרה על כל מנה — נמסה על החום.',
      nutritionImpact: '100 מ"ל שמנת ≈ 330 קלוריות ל-4 מנות — עיקר השינוי בשומן.',
    }
  }

  return {
    upgradedTitle: `${recipeName} עם טחינה, לימון ופטרוזיליה${gf}`,
    changes: [
      'הוסיפו 2 כפות טחינה גולמית, מיץ מחצי לימון, 1 שן שום כתושה ו-3 כפות פטרוזיליה.',
      'ערבבו 1 כף שמן זית ו-1 כף מים לרוטב לפני הגשה.',
    ],
    upgradedIngredients: [
      '2 כפות טחינה גולמית',
      'מיץ מחצי לימון',
      '1 שן שום כתושה',
      '3 כפות פטרוזיליה קצוצה',
      '1 כף שמן זית כתית',
    ],
    preparationNotes: [
      'ערבבו את הטחינה עם מיץ הלימון לפני הוספה למנה — פחות גושים.',
      'טעמו ותקנו מלח לפני ההגשה.',
    ],
    servingSuggestion: 'הגישו בצלחת עם 1 כף טחינה נוספת ו-1 כף פטרוזיליה בצד.',
    premiumTouch: 'פזרו 1 כפית סומק על כל מנה.',
    nutritionImpact: '2 כפות טחינה ≈ 180 קלוריות — חלבון ושומן בריא ל-2 מנות.',
  }
}

export function sanitizeRecipeUpgrade(upgrade, payload = {}) {
  const concrete = buildConcreteRecipeUpgrade(payload)
  const language = payload.language ?? 'he'
  return normalizeRecipeUpgradeContent(
    {
      upgradedTitle: ensureConcreteText(upgrade?.upgradedTitle, concrete.upgradedTitle),
      changes: ensureConcreteList(upgrade?.changes, concrete.changes),
      upgradedIngredients: ensureConcreteList(upgrade?.upgradedIngredients, concrete.upgradedIngredients),
      preparationNotes: ensureConcreteList(upgrade?.preparationNotes, concrete.preparationNotes),
      servingSuggestion: ensureConcreteText(upgrade?.servingSuggestion, concrete.servingSuggestion),
      premiumTouch: ensureConcreteText(upgrade?.premiumTouch, concrete.premiumTouch),
      nutritionImpact: ensureConcreteText(upgrade?.nutritionImpact, concrete.nutritionImpact),
    },
    language,
  )
}

function dishUpgradeLine(label, original, upgraded, additions, why) {
  return `${label}: ${original} → ${upgraded}. תוספות מדויקות: ${additions}. למה זה משדרג: ${why}.`
}

export function buildConcreteThemedMealUpgrade(meal, category = 'parve', isGlutenFree = false) {
  const gfNote = isGlutenFree ? ' (ללא גלוטן)' : ''
  const title = String(meal?.mealTitle ?? 'הארוחה')

  let starterAdd
  let starterUp
  let starterWhy

  if (category === 'meat') {
    starterAdd = '80 גרם חומוס, 2 כפות עגבניות קלויות, 1 כף שמן זית, כף דבש'
    starterUp = `${meal.starter} עם עגבניות קלויות וחומוס`
    starterWhy = 'מוסיף מתיקות קלה וקרמיות מול הבשר'
  } else if (category === 'dairy') {
    starterAdd = '100 גרם גבינת פטה, 3 כפות אגוזי מלך קלויים, 2 כפות שמן זית, כף בלסמי, כפית דבש'
    starterUp = `${meal.starter} עם גבינת פטה, אגוזי מלך ורוטב בלסמי`
    starterWhy = "מוסיף מליחות, קראנץ' וחמיצות מאוזנת"
  } else {
    starterAdd = '120 גרם חומוס, 3 כפות אגוזי מלך קלויים, 2 כפות שמן זית, כף בלסמי, כפית דבש'
    starterUp = `${meal.starter} עם חומוס, אגוזי מלך ורוטב בלסמי`
    starterWhy = "מוסיף חלבון, קראנץ' וחמיצות בלי חלב"
  }

  const dishUpgrades = [
    dishUpgradeLine('מנה ראשונה', meal.starter, starterUp, starterAdd, starterWhy),
    dishUpgradeLine(
      'מנה עיקרית',
      meal.main,
      `${meal.main} עם 2 כפות שמן זית ו-1 כף עשבי תיבול`,
      '2 כפות שמן זית כתית, 1 כף בזיליקום או פטרוזיליה, 1 כפית מלח גס, חצי כפית פלפל שחור',
      'מגדיר טעם ומרקם ב-4 מרכיבים מדידים',
    ),
  ]

  ;(meal.sides ?? []).slice(0, 2).forEach((side, index) => {
    dishUpgrades.push(
      dishUpgradeLine(
        `תוספת ${index + 1}`,
        side,
        `${side} עם 1 כף שמן זית ו-1 כף זרעי שמש קלויים`,
        '1 כף שמן זית, 1 כף זרעי שמש/סומסום קלויים',
        "מוסיף שומן וקראנץ' מדיד",
      ),
    )
  })

  dishUpgrades.push(
    dishUpgradeLine(
      'קינוח',
      meal.dessert,
      `${meal.dessert} עם 1 כף אבקת סוכר ו-2 כפות פירות יער`,
      '1 כף אבקת סוכר, 2 כפות פירות יער טריים',
      'מוסיף מתיקות וצבע ב-2 כפות בלבד',
    ),
  )

  return {
    upgradedMealTitle: `${title} — פטה, אגוזים ובלסמי${gfNote}`,
    upgradedMenu: [
      `מנה ראשונה: ${starterUp}`,
      `עיקרית: ${meal.main} + 2 כפות שמן זית ו-1 כף עשבי תיבול`,
      ...(meal.sides ?? []).map((side) => `תוספת: ${side} + 1 כף שמן ו-1 כף זרעים קלויים`),
      `קינוח: ${meal.dessert} + 1 כף אבקת סוכר ו-2 כפות פירות יער`,
      ...(meal.drinks ?? []).map((drink) => `משקה: ${drink}`),
    ],
    dishUpgrades,
    servingIdeas: [
      'הגישו מנה ראשונה ב-6 קעריות קטנות — 80 מ"ל לכל קערית.',
      'העיקרית ב-4 צלחות חמות — 1 כף שמן מעל כל מנה לפני יציאה מהמטבח.',
    ],
    atmosphereIdeas: [
      '2 נרות לבנים בגובה 15 ס"מ במרכז השולחן.',
      'הנמיכו תאורה ל-40% — מספיק לראות את הצלחות.',
    ],
    specialAdditions: [
      'קערית 200 מ"ל עם 150 גרם חמאה בטמפרטורת החדר ו-100 גרם מלח גס.',
      'קערית 150 מ"ל עם 100 גרם זיתים ירוקים.',
    ],
    impressiveTips: [
      'הוציאו את המנה הראשונה 2 דקות לפני הקריאה לשולחן — 6 מנות מוכנות ביחד.',
      'גרדו 1 כף קליפת לימון על העיקרית ב-4 נקודות שונות לפני ההגשה.',
    ],
  }
}

export function sanitizeThemedMealUpgrade(upgrade, meal, category = 'parve', isGlutenFree = false, language = 'he') {
  const concrete = buildConcreteThemedMealUpgrade(meal, category, isGlutenFree)
  return normalizeThemedMealUpgradeContent(
    {
      upgradedMealTitle: ensureConcreteText(upgrade?.upgradedMealTitle, concrete.upgradedMealTitle),
      upgradedMenu: ensureConcreteList(upgrade?.upgradedMenu, concrete.upgradedMenu),
      dishUpgrades: ensureConcreteList(upgrade?.dishUpgrades, concrete.dishUpgrades),
      servingIdeas: ensureConcreteList(upgrade?.servingIdeas, concrete.servingIdeas),
      atmosphereIdeas: ensureConcreteList(upgrade?.atmosphereIdeas, concrete.atmosphereIdeas),
      specialAdditions: ensureConcreteList(upgrade?.specialAdditions, concrete.specialAdditions),
      impressiveTips: ensureConcreteList(upgrade?.impressiveTips, concrete.impressiveTips),
    },
    language,
  )
}

export function isValidRecipeUpgrade(upgrade) {
  if (!upgrade || typeof upgrade !== 'object') return false
  const sanitized = sanitizeRecipeUpgrade(upgrade, {})
  return Boolean(
    sanitized.upgradedTitle &&
      sanitized.changes?.length &&
      sanitized.upgradedIngredients?.length &&
      sanitized.preparationNotes?.length &&
      sanitized.servingSuggestion &&
      sanitized.premiumTouch &&
      sanitized.nutritionImpact,
  )
}

export function buildLocalRecipeUpgrade(payload = {}) {
  return sanitizeRecipeUpgrade(buildConcreteRecipeUpgrade(payload), payload)
}

export function buildLocalThemedMealUpgrade(meal, category = 'parve', isGlutenFree = false, language = 'he') {
  return sanitizeThemedMealUpgrade(
    buildConcreteThemedMealUpgrade(meal, category, isGlutenFree),
    meal,
    category,
    isGlutenFree,
    language,
  )
}
