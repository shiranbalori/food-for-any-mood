import { canonicalIngredient, INGREDIENT_SYNONYMS, normalizeIngredient } from './ingredientKnowledge'

export const INGREDIENT_LABELS_HE = {
    pasta: 'פסטה',
    'pasta shells': 'קונכיות פסטה',
    'gluten-free pasta': 'פסטה ללא גלוטן',
    'gluten-free pasta shells': 'קונכיות פסטה ללא גלוטן',
    cream: 'שמנת מתוקה',
    garlic: 'שום',
    parmesan: 'פרמזן',
    butter: 'חמאה',
    herbs: 'עשבי תיבול טריים',
    spinach: 'תרד',
    mushroom: 'פטריות',
    mushrooms: 'פטריות',
    salt: 'מלח',
    pepper: 'פלפל שחור',
    'black pepper': 'פלפל שחור',
    'olive oil': 'שמן זית',
    olive: 'שמן זית',
    olives: 'זיתים',
    water: 'מים',
    basil: 'בזיליקום',
    paprika: 'פפריקה',
    cinnamon: 'קינמון',
    oregano: 'אורגנו',
    thyme: 'טימין',
    vinegar: 'חומץ',
    wine: 'יין',
    stock: 'ציר',
    vegetable: 'ירק',
    vegetables: 'ירקות',
    eggs: 'ביצים',
    egg: 'ביצה',
    cheese: 'גבינה',
    onion: 'בצל',
    'bell pepper': 'פלפל גמבה',
    'bell peppers': 'פלפלים גמבה',
    milk: 'חלב',
    flour: 'קמח',
    'almond flour': 'קמח שקדים',
    'rice flour': 'קמח אורז',
    ricotta: 'ריקוטה',
    blueberries: 'אוכמניות',
    sugar: 'סוכר',
    honey: 'דבש',
    lemon: 'לימון',
    feta: 'גבינה בולגרית',
    tomato: 'עגבניות',
    tomatoes: 'עגבניות',
    rice: 'אורז',
    broth: 'ציר',
    chicken: 'עוף',
    beef: 'בשר בקר',
    steak: 'סטייק',
    lamb: 'בשר כבש',
    tortilla: 'טורטיות',
    tortillas: 'טורטיות',
    'corn tortillas': 'טורטיות תירס',
    lime: 'ליים',
    cilantro: 'כוסברה',
    chili: 'פלפל חריף',
    avocado: 'אבוקדו',
    yogurt: 'יוגורט',
    parsley: 'פטרוזיליה',
    cumin: 'כמון',
    cucumber: 'מלפפון',
    'soy sauce': 'רוטב סויה',
    'tamari (gluten-free)': 'רוטב סויה ללא גלוטן',
    ginger: 'ג׳ינג׳ר',
    tofu: 'טופו',
    broccoli: 'ברוקולי',
    chickpeas: 'גרגרי חומוס',
    lentils: 'עדשים',
    quinoa: 'קינואה',
    tahini: 'טחינה',
    kale: 'קייל',
    'sweet potato': 'תפוח אדמה מתוק',
    potato: 'תפוחי אדמה',
    potatoes: 'תפוחי אדמה',
    carrot: 'גזר',
    carrots: 'גזר',
    'coconut milk': 'חלב קוקוס',
    'curry powder': 'אבקת קארי',
    curry: 'קארי',
    peas: 'אפונה',
    corn: 'תירס',
    zucchini: 'קישוא',
    bread: 'לחם',
    'gluten-free bread': 'לחם ללא גלוטן',
    'crusty bread': 'לחם פריך',
    toast: 'טוסט',
    'tomato paste': 'רסק עגבניות',
    sesame: 'גרגירי שומשום',
    'sesame seeds': 'גרגירי שומשום',
    spices: 'תבלינים חמים',
    rosemary: 'רוזמרין',
    breadcrumbs: 'פרורי לחם',
    'gluten-free breadcrumbs': 'פרורי לחם ללא גלוטן',
    'gluten-free croutons': 'קרוטונים ללא גלוטן',
    'gluten-free spaghetti': 'ספגטי ללא גלוטן',
    'gluten-free fettuccine': 'פטוצ׳יני ללא גלוטן',
    'gluten-free penne': 'פנה ללא גלוטן',
    'rice noodles': 'אטריות אורז',
    pita: 'פיתה',
    noodles: 'אטריות',
    spaghetti: 'ספגטי',
    fettuccine: 'פטוצ׳יני',
    penne: 'פנה',
    couscous: 'קוסקוס',
    bulgur: 'בורגול',
    seitan: 'חלבון חייטני',
    wheat: 'חיטה',
    'fresh herbs': 'עשבי תיבול טריים',
    'warm spices': 'תבלינים חמים',
    'jumbo pasta shells': 'קונכיות פסטה גדולות',
    'a gluten-free alternative (rice, quinoa, or potatoes)': 'תחליף ללא גלוטן (אורז, קינואה או תפוחי אדמה)',
    oil: 'שמן',
    beans: 'שעועית',
    salmon: 'סלמון',
    tuna: 'טונה',
    hummus: 'חומוס',
    coffee: 'קפה',
    marshmallow: 'מרשמלו',
    marshmallows: 'מרשמלו',
    strawberry: 'תות',
    strawberries: 'תותים',
}

const LABELS = {
  he: INGREDIENT_LABELS_HE,
  en: {},
}

function findHebrewSynonym(name) {
  const normalized = normalizeIngredient(name)
  if (!normalized) return null

  for (const [canonical, aliases] of Object.entries(INGREDIENT_SYNONYMS)) {
    const terms = [canonical, ...aliases].map(normalizeIngredient)
    const hit = terms.some(
      (term) =>
        term &&
        (normalized === term ||
          normalized.includes(term) ||
          term.includes(normalized)),
    )
    if (!hit) continue

    const label = INGREDIENT_LABELS_HE[canonical]
    if (label) return label

    const hebrewAlias = aliases.find((alias) => /[\u0590-\u05FF]/.test(alias))
    if (hebrewAlias) return hebrewAlias.trim()
  }

  return null
}

function capitalizeEn(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function getIngredientLabel(name, language = 'he') {
  if (!name) return ''
  const lang = language === 'en' ? 'en' : 'he'
  const normalized = name.toLowerCase().trim()
  const canonical = canonicalIngredient(name) ?? normalized

  if (lang === 'he') {
    const direct = LABELS.he[normalized] ?? LABELS.he[canonical]
    if (direct) return direct
    if (/[\u0590-\u05FF]/.test(name) && !/[a-z]/i.test(name)) return name.trim()
    const fromSynonym = findHebrewSynonym(name)
    if (fromSynonym) return fromSynonym
    return findHebrewSynonym(canonical) ?? name.trim()
  }

  return capitalizeEn((canonical || normalized).replace(/_/g, ' '))
}

export function getStepStaticLabel(key, language = 'he') {
  return getIngredientLabel(key, language)
}
