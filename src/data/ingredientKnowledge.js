export const INGREDIENT_SYNONYMS = {
  chicken: ['עוף', 'chicken breast', 'chicken thigh', 'פilet עוף', 'חזה עוף'],
  beef: ['בקר', 'steak', 'ground beef', 'בשר בקר', 'אנטריקוט'],
  lamb: ['כבש', 'lamb mince', 'ground lamb'],
  steak: ['סטייק', 'beef steak', 'אנטריקוט'],
  pasta: ['פסטה', 'spaghetti', 'fettuccine', 'penne', 'noodles'],
  rice: ['אורז', 'basmati', 'jasmine rice'],
  egg: ['eggs', 'ביצה', 'ביצים'],
  eggs: ['egg', 'ביצה', 'ביצים'],
  cheese: ['גבינה', 'cheddar', 'mozzarella', 'gouda'],
  cream: ['שמנת', 'heavy cream', 'whipping cream', 'שמנת מתוקה'],
  milk: ['חלב'],
  butter: ['חמאה'],
  garlic: ['שום', 'שום טרי'],
  onion: ['בצל', 'red onion', 'בצל סגול'],
  tomato: ['עגבניה', 'tomatoes', 'עגבניות', 'cherry tomatoes'],
  potato: ['תפוח אדמה', 'potatoes', 'תפוחי אדמה'],
  carrot: ['גזר', 'carrots'],
  pepper: ['bell pepper', 'פלפל גמבה', 'פלפלים', 'capsicum'],
  'black pepper': ['pepper', 'פלפל שחור'],
  spinach: ['תרד'],
  broccoli: ['ברוקולי'],
  mushroom: ['פטריות', 'mushrooms', 'שמפיניון'],
  lemon: ['לימון', 'lemons', 'lime'],
  lime: ['ליים', 'לימון ירוק'],
  olive: ['olive oil', 'שמן זית', 'zait'],
  oil: ['שמן', 'vegetable oil', 'canola oil'],
  herbs: ['עשבי תיבול', 'parsley', 'basil', 'cilantro', 'שמיר', 'בזיליקום'],
  parsley: ['פטרוזיליה', 'שמיר'],
  cilantro: ['כוסברה'],
  tofu: ['טofu', 'טופו'],
  chickpea: ['chickpeas', 'גרגרי חומוס', 'humus grains'],
  chickpeas: ['chickpea', 'גרגרי חומוס'],
  lentil: ['עדשים', 'lentils', 'red lentils'],
  lentils: ['lentil', 'עדשים'],
  quinoa: ['קינואה'],
  yogurt: ['יוגורט', 'greek yogurt'],
  ricotta: ['ricotta', 'ricotta cheese', 'גבינת ריקotta'],
  feta: ['feta', 'feta cheese', 'גבינה בולגרית'],
  parmesan: ['parmesan', 'פרמזן', 'גבינה קשה'],
  flour: ['קמח'],
  sugar: ['סוכר'],
  honey: ['דבש'],
  blueberry: ['blueberries', 'אוכמניות'],
  blueberries: ['blueberry', 'אוכמניות'],
  avocado: ['אבוקדו'],
  cucumber: ['מלפפון', 'cucumbers'],
  'sweet potato': ['בטata', 'בטata מתוקה', 'batata', 'sweet potato'],
  kale: ['קייל'],
  tahini: ['טחina', 'טחינה'],
  coconut: ['coconut milk', 'חלב קוקוס'],
  'coconut milk': ['coconut', 'חלב קוקוס'],
  curry: ['curry powder', 'אבקת קari'],
  chili: ['chilli', 'צili', 'pepper flakes', 'פלפל חריף'],
  ginger: ['ginger', 'ginger root', 'גינג\'ר'],
  soy: ['soy sauce', 'רוטב סויה'],
  'soy sauce': ['soy', 'רוטב סויה'],
  tortilla: ['tortillas', 'tortilla', 'לחמיניות'],
  broth: ['stock', 'merk', 'ציר', 'ציר ירקות', 'ציר עוף'],
  zucchini: ['קישוא', 'courgette'],
  salmon: ['סalmon', 'סלמון'],
  tuna: ['טuna', 'טונה'],
  bread: ['לחם', 'פיתה', 'bread'],
  hummus: ['חומוס'],
  corn: ['תירס', 'sweetcorn'],
  bean: ['beans', 'שעועית'],
  beans: ['bean', 'שעועית'],
}

export const INGREDIENT_NUTRITION = {
  chicken: { calories: 45, protein: 9, carbs: 0, fat: 1 },
  beef: { calories: 65, protein: 8, carbs: 0, fat: 4 },
  lamb: { calories: 70, protein: 7, carbs: 0, fat: 5 },
  steak: { calories: 75, protein: 8, carbs: 0, fat: 5 },
  pasta: { calories: 35, protein: 1, carbs: 7, fat: 0.5 },
  rice: { calories: 40, protein: 1, carbs: 8, fat: 0.3 },
  eggs: { calories: 35, protein: 3, carbs: 0, fat: 2.5 },
  cheese: { calories: 55, protein: 4, carbs: 0, fat: 4.5 },
  cream: { calories: 50, protein: 0.5, carbs: 1, fat: 5 },
  tofu: { calories: 30, protein: 3, carbs: 1, fat: 2 },
  chickpeas: { calories: 35, protein: 2, carbs: 6, fat: 0.5 },
  lentils: { calories: 30, protein: 2.5, carbs: 5, fat: 0.2 },
  quinoa: { calories: 35, protein: 1.5, carbs: 6, fat: 0.6 },
  avocado: { calories: 40, protein: 0.5, carbs: 2, fat: 4 },
  potato: { calories: 25, protein: 0.5, carbs: 6, fat: 0 },
  broccoli: { calories: 10, protein: 1, carbs: 2, fat: 0 },
  default: { calories: 15, protein: 0.5, carbs: 2, fat: 0.5 },
}

export function canonicalIngredient(raw) {
  const normalized = normalizeIngredient(raw)
  if (!normalized) return null

  for (const [canonical, aliases] of Object.entries(INGREDIENT_SYNONYMS)) {
    const all = [canonical, ...aliases].map(normalizeIngredient)
    if (all.some((term) => normalized === term || normalized.includes(term) || term.includes(normalized))) {
      return canonical
    }
  }

  return normalized.split(/\s+/)[0]
}

export function normalizeIngredient(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
}

export function ingredientsMatch(userIng, recipeIng) {
  const user = normalizeIngredient(userIng)
  const recipe = normalizeIngredient(recipeIng)
  if (!user || !recipe) return false

  if (user === recipe || user.includes(recipe) || recipe.includes(user)) return true

  const userCanon = canonicalIngredient(user)
  const recipeCanon = canonicalIngredient(recipe)
  if (userCanon && recipeCanon && userCanon === recipeCanon) return true

  const userWords = user.split(/\s+/)
  const recipeWords = recipe.split(/\s+/)
  return userWords.some((uw) =>
    recipeWords.some((rw) => uw.length > 2 && rw.length > 2 && (uw.includes(rw) || rw.includes(uw))),
  )
}

export function getIngredientNutrition(name) {
  const canonical = canonicalIngredient(name) ?? name
  return INGREDIENT_NUTRITION[canonical] ?? INGREDIENT_NUTRITION.default
}
