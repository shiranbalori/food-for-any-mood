/** Validate themed meal menus and provide concrete fallback templates. */

const QUANTITY_PATTERN = /(\d+|חצי|רבע|שליש|כף|כפות|כפית|כפיות|גרם|ק["']?ג|מ["']?ל|ליטר|יחיד|יחידות|כוס|כוסות)/i
const PREP_PATTERN = /(מרכיבים|הכנה|אופ|מבשל|מקפ|מערב|חתכ|קל|טג|מר|מג|מקר|מייבש|מצ|מעב|מנ|בלנ|מחמ|מייצ)/i

const PLACEHOLDER_PATTERNS = [
  /מנה\s+פרווה\s+מרכזית/i,
  /מנה\s+עיקרית\s+בשרית/i,
  /מנה\s+חלבית\s+עשירה/i,
  /מנה\s+בשרית\s*\(/i,
  /מנה\s+עיקרית\b(?!\s*[:—])/i,
  /תוספת\s+ירקות\/?פחמימה/i,
  /תוספת\s+מתאימה/i,
  /תוספת\s+ירקות\s+מתאימה/i,
  /קינוח\s+פרווה\s+מתוק/i,
  /קינוח\s+פרווה\b(?!\s*[:—])/i,
  /קינוח\s+חלבי\s+מפנק/i,
  /קינוח\s+מתוק\b(?!\s*[:—])/i,
  /פרי\s+עונה\s+או/i,
  /לפי\s+הנושא/i,
  /משקה\s+קל\s+או/i,
  /לחם\s+או\s+מנה/i,
  /פסטה\s*\/\s*מנה/i,
  /קוסקוס\s+או\s+אורז/i,
  /עוף\/בקר/i,
  /מארז\s+גבינות/i,
  /סלט\s+ירקות\s+טרי\s+עם\s+עשבי\s+תיבול$/i,
  /סלט\s+ירקות\s+צבעוני$/i,
  /מנה\s+ראשונה\b(?!\s*[:—])/i,
]

export function isPlaceholderDish(text) {
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (cleaned.length < 22) return true
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(cleaned))) return true
  if (cleaned.includes('/') && !QUANTITY_PATTERN.test(cleaned)) return true
  return false
}

export function isConcreteDish(text) {
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (isPlaceholderDish(cleaned)) return false
  const hasQuantity = QUANTITY_PATTERN.test(cleaned)
  const hasPrep = PREP_PATTERN.test(cleaned)
  const hasIngredientsMarker = cleaned.includes('מרכיבים')
  const hasPrepMarker = cleaned.includes('הכנה')
  if (hasIngredientsMarker && hasPrepMarker && hasQuantity) return true
  return hasQuantity && hasPrep && cleaned.length >= 35
}

export function isValidThemedMeal(meal) {
  if (!meal || typeof meal !== 'object') return false

  for (const key of ['mealTitle', 'description', 'starter', 'main', 'dessert']) {
    if (!String(meal[key] ?? '').trim()) return false
  }

  for (const key of ['starter', 'main', 'dessert']) {
    if (!isConcreteDish(meal[key])) return false
  }

  if (!Array.isArray(meal.sides) || meal.sides.length < 2) return false
  if (!meal.sides.every((item) => isConcreteDish(item))) return false

  if (!Array.isArray(meal.drinks) || !meal.drinks.length) return false
  if (!meal.drinks.every((item) => isConcreteDish(item))) return false

  for (const key of ['servingIdeas', 'hostingTips']) {
    if (!Array.isArray(meal[key]) || !meal[key].some((item) => String(item ?? '').trim())) return false
  }

  return true
}

function gfSuffix(isGlutenFree) {
  return isGlutenFree ? ' (ללא גלוטן)' : ''
}

function buildParveMenu(themeLabel, gf) {
  return {
    starter:
      `חומוס ביתי עם טחינה ופפריקה — מרכיבים: 400 גרם חומוס, 3 כפות טחינה, 2 שיני שום, מיץ מלימון אחד, חצי כפית כמון. הכנה: מעבדים בבלנדר עד קרמי, מגישים עם 2 כפות שמן זית ופפריקה.${gf}`,
    main:
      `פילה סלמון בתנור עם לימון ועשבי תיבול — מרכיבים: 4 פילי סלמון (600 גרם), 2 לימונים, 3 כפות שמן זית, 1 כף שמיר, 1 כפית מלח. הכנה: מניחים על תבנית, אופים 180 מעלות 18 דקות עד שהדג מתפורר.${gf}`,
    sides: [
      `תפוחי אדמה צלויים ברוזמרין — מרכיבים: 800 גרם תפוחי אדמה, 3 כפות שמן זית, 1 כפית רוזמרין יבש, 1 כפית מלח. הכנה: חותכים לקוביות, אופים 200 מעלות 35 דקות עד זהוב.${gf}`,
      `סלט ירקות ישראלי — מרכיבים: 3 עגבניות, 2 מלפפונים, 1 בצל סגול, 2 כפות שמן זית, 1 כף מיץ לימון. הכנה: חותכים קוביות, מתבלים ומערבבים לפני ההגשה.${gf}`,
    ],
    dessert:
      `מוס שוקולד מריר עם פירות יער — מרכיבים: 200 גרם שוקולד מריר, 400 מ"ל קצפת צמחית, 2 כפות אבקת סוכר, 150 גרם פירות יער. הכנה: ממיסים שוקולד, מקפלים לקצפת, מקררים 4 שעות ומגישים עם פירות.${gf}`,
    drinks: [
      'לימונדה ביתית — מרכיבים: 1 ליטר מים, מיץ מ-4 לימונים, 4 כפות סוכר, עלי נענע. הכנה: מערבבים עד שהסוכר נמס, מקררים 30 דקות.',
      'תה קר עם לימון ודבש — מרכיבים: 1 ליטר מים, 4 שקיקי תה, 2 כפות דבש, 3 פרוסות לימון. הכנה: חוממים 5 דקות, מצננים ומגישים עם לימון.',
    ],
    description: `תפריט פרווה מלא ל${themeLabel}: חומוס ביתי, סלמון בתנור, תפוחי אדמה צלויים, סלט ירקות, מוס שוקולד ומשקאות מרעננים.`,
  }
}

function buildMeatMenu(themeLabel, gf) {
  return {
    starter:
      `חצילים בטחינה — מרכיבים: 2 חצילים, 3 כפות טחינה, 2 שיני שום, מיץ מלימון, 2 כפות שמן זית. הכנה: קולים על להבה, מורחים טחינה ושום, מגישים חם.${gf}`,
    main:
      `צלי כתף בקר בתנור — מרכיבים: 1.2 ק"ג כתף בקר, 3 בצלים, 6 שיני שום, 3 כפות שמן זית, 1 כף פפריקה, 1 כפית כמון. הכנה: מניחים בתבנית, אופים 160 מעלות 3 שעות עד רך.${gf}`,
    sides: [
      `אורז עם שקדים — מרכיבים: 2 כוסות אורז, 3 כפות שמן, 50 גרם שקדים קלויים, 1 כפית מלח. הכנה: מטגנים אורז 2 דקות, מוסיפים מים, מבשלים 18 דקות.${gf}`,
      `סלט ירקות קיצי — מרכיבים: 2 עגבניות, 2 מלפפונים, 1 גמבה, 2 כפות שמן, מיץ לימון. הכנה: חותכים, מתבלים ומגישים קר.${gf}`,
    ],
    dessert:
      `עוגת תפוחים בדבש — מרכיבים: 3 תפוחים, 2 ביצים, 100 גרם קמח, 80 גרם סוכר, 3 כפות דבש. הכנה: מערבבים, אופים 170 מעלות 35 דקות.${gf}`,
    drinks: [
      'מיץ רימונים — מרכיבים: 4 רימונים, 1 ליטר מים, 3 כפות סוכר. הכנה: סוחטים, מסננים ומקררים.',
      'מים מינרליים עם לימון — מרכיבים: 1.5 ליטר מים, 2 לימונים, עלי נענע. הכנה: מקררים עם פרוסות לימון.',
    ],
    description: `תפריט בשרי ל${themeLabel}: חצילים בטחינה, צלי כתף, אורז עם שקדים, סלט ירקות ועוגת תפוחים.`,
  }
}

function buildDairyMenu(themeLabel, gf) {
  return {
    starter:
      `לחם קלוי עם עגבניות וגבינת עיזים — מרכיבים: 8 פרוסות לחם, 3 עגבניות, 100 גרם גבינת עיזים, 2 כפות שמן זית, 2 שיני שום. הכנה: קולים לחם, מעלים עגבניות וגבינה.${gf}`,
    main:
      `פסטה ברוטב שמנת ופטריות — מרכיבים: 400 גרם פסטה, 300 מ"ל שמנת, 250 גרם פטריות, 3 שיני שום, 80 גרם פרמזן. הכנה: מבשלים פסטה, מקפיצים פטריות, מערבבים עם שמנת ופרמזן.${gf}`,
    sides: [
      `סלט ירוק עם אגוזי מלך — מרכיבים: 200 גרם עלי חסה, 3 כפות אגוזי מלך, 2 כפות שמן זית, 1 כף חומץ בלסמי. הכנה: מערבבים ומגישים מיד.${gf}`,
      `לחם פוקאצ'ה — מרכיבים: 1 יחיד לחם פוקאצ'ה, 3 כפות שמן זית, 1 כפית מלח גס, 1 כף רוזמרין. הכנה: מחממים בתנור 180 מעלות 8 דקות.${gf}`,
    ],
    dessert:
      `טירמיסו קלאסי — מרכיבים: 250 גרם מסקרפונה, 3 ביצים, 3 כפות סוכר, 200 מ"ל קפה קר, 150 גרם ביסקוויטים. הכנה: מקפלים, שכבות ביסקוויטים ומסקרפונה, מקררים 6 שעות.${gf}`,
    drinks: [
      'שייק מנגו — מרכיבים: 2 מנגו, 400 מ"ל חלב, 2 כפות דבש, 8 קוביות קרח. הכנה: בלנדר עד חלק.',
      'משקה יוגורט עם פירות — מרכיבים: 500 מ"ל יוגורט, 200 גרם תותים, 2 כפות דבש. הכנה: מעורבבים בבלנדר.',
    ],
    description: `תפריט חלבי ל${themeLabel}: לחם קלוי עם עגבניות, פסטה בשמנת, סלט ירוק, פוקאצ'ה, טירמיסו ומשקאות.`,
  }
}

export function buildFallbackThemedMeal(themeLabel, category = 'parve', isGlutenFree = false) {
  const gf = gfSuffix(isGlutenFree)
  const menu =
    category === 'meat'
      ? buildMeatMenu(themeLabel, gf)
      : category === 'dairy'
        ? buildDairyMenu(themeLabel, gf)
        : buildParveMenu(themeLabel, gf)

  return {
    mealTitle: `ארוחת ${themeLabel}`,
    description: menu.description,
    starter: menu.starter,
    main: menu.main,
    sides: menu.sides,
    dessert: menu.dessert,
    drinks: menu.drinks,
    servingIdeas: [
      'הגישו מנה ראשונה ב-6 קעריות — 120 מ"ל בכל קערית.',
      'העיקרית ב-4 צלחות חמות — 1 כף שמן מעל כל מנה לפני יציאה מהמטבח.',
    ],
    hostingTips: [
      'הכינו תוספות 40 דקות לפני האורחים — חימום 5 דקות בלבד.',
      'הציבו קערית 200 מ"ל עם 150 גרם חמאה ו-100 גרם מלח גס ליד הלחם.',
    ],
  }
}
