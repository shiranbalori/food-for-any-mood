/**
 * Real-world dessert recipe construction — dessert generation only.
 * User ingredients stay primary; common pantry staples are added with a clear label.
 */

import { canonicalIngredient, ingredientsMatch } from '../data/ingredientKnowledge'
import { getIngredientLabel } from '../data/ingredientLabels'
import { applyRecipeQuantities } from './recipeQuantities'
import { parseUserIngredients } from './ingredientRelevance'

export const BASIC_PANTRY_LABEL_HE = '(מרכיב מזווה בסיסי)'
export const BASIC_PANTRY_LABEL_EN = '(Basic pantry ingredient)'

/** Allowed when an ingredient line is marked as basic pantry (dessert only). */
export const DESSERT_BASIC_PANTRY_CANONICAL = new Set([
  'egg',
  'eggs',
  'sugar',
  'vanilla',
  'baking powder',
  'butter',
  'oil',
  'olive',
  'olive oil',
  'salt',
  'black pepper',
  'pepper',
  'cinnamon',
  'nutmeg',
  'water',
])

const BASIC_PANTRY_SUFFIX = /\((?:Basic pantry ingredient|מרכיב מזווה בסיסי)\)/i

export function getBasicPantryLabel(language = 'he') {
  return language === 'en' ? BASIC_PANTRY_LABEL_EN : BASIC_PANTRY_LABEL_HE
}

export function isBasicPantryMarkedLine(line) {
  return BASIC_PANTRY_SUFFIX.test(String(line ?? '').trim())
}

export function stripBasicPantryLabel(line) {
  return String(line ?? '')
    .replace(BASIC_PANTRY_SUFFIX, '')
    .trim()
}

function matchesPatternRequirements(pattern, userCanons) {
  for (const req of pattern.required ?? []) {
    if (!userHasCanon(userCanons, req)) return false
  }
  if (pattern.requiredAny?.length) {
    if (!pattern.requiredAny.some((canon) => userHasCanon(userCanons, canon))) return false
  }
  return true
}

function getPatternKnownCanons(pattern) {
  const canons = new Set([...(pattern.required ?? []), ...(pattern.requiredAny ?? [])])
  for (const key of Object.keys(pattern.userQuantities ?? {})) canons.add(key)
  for (const staple of pattern.pantryStaples ?? []) canons.add(staple.canon)
  for (const key of [
    ...(pattern.preferred ?? []),
    ...(pattern.supportive ?? []),
    ...(pattern.signature ?? []),
  ]) {
    canons.add(key)
  }
  return canons
}

/**
 * Score how well a dessert pattern matches the user's ingredients.
 * Higher score = more realistic fit. Returns null when required ingredients are missing.
 */
export function scoreDessertPattern(pattern, userCanons) {
  if (!matchesPatternRequirements(pattern, userCanons)) return null

  let score = (pattern.required?.size ?? 0) * 100
  if (pattern.requiredAny?.length) score += 40

  for (const canon of pattern.signature ?? []) {
    if (pattern.required?.has(canon)) continue
    if (userHasCanon(userCanons, canon)) score += 32
  }
  for (const canon of pattern.preferred ?? []) {
    if (pattern.required?.has(canon)) continue
    if (userHasCanon(userCanons, canon)) score += 24
  }
  for (const canon of pattern.supportive ?? []) {
    if (pattern.required?.has(canon)) continue
    if (userHasCanon(userCanons, canon)) score += 12
  }

  const known = getPatternKnownCanons(pattern)
  for (const canon of userCanons) {
    const inRequired =
      pattern.required?.has(canon) ||
      (canon === 'eggs' && pattern.required?.has('egg')) ||
      (canon === 'egg' && pattern.required?.has('eggs'))
    if (inRequired) continue
    const inRequiredAny = (pattern.requiredAny ?? []).some((req) => req === canon)
    if (inRequiredAny) continue
    const covered = [...known].some(
      (knownCanon) =>
        knownCanon === canon ||
        (knownCanon === 'egg' && canon === 'eggs') ||
        (knownCanon === 'eggs' && canon === 'egg'),
    )
    if (!covered) score -= 10
  }

  score += pattern.selectionPriority ?? 0
  return score
}

function isExcludedDessertTitle(pattern, language, excludeTitles = []) {
  if (!excludeTitles.length) return false
  const name = language === 'en' ? pattern.nameEn : pattern.nameHe
  const normalized = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  return excludeTitles.some(
    (title) =>
      String(title ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ') === normalized,
  )
}

export function rankDessertPatterns(userCanons, { category = 'dairy', language = 'he', excludeTitles = [], excludeTemplateKeys = [] } = {}) {
  const ranked = []
  for (const pattern of REALISTIC_DESSERT_PATTERNS) {
    if (pattern.category && pattern.category !== category) continue
    if (excludeTemplateKeys.includes(pattern.id)) continue
    if (isExcludedDessertTitle(pattern, language, excludeTitles)) continue
    const score = scoreDessertPattern(pattern, userCanons)
    if (score == null) continue
    ranked.push({ pattern, score })
  }
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (b.pattern.selectionPriority ?? 0) - (a.pattern.selectionPriority ?? 0)
  })
  return ranked
}

export function getBestDessertPattern(
  userIngredientsRaw,
  { category = 'dairy', language = 'he', excludeTitles = [], excludeTemplateKeys = [] } = {},
) {
  const userIngredients = Array.isArray(userIngredientsRaw)
    ? userIngredientsRaw
    : parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) return null

  const canons = canonizeList(userIngredients)
  const ranked = rankDessertPatterns(canons, { category, language, excludeTitles, excludeTemplateKeys })
  return ranked[0]?.pattern ?? null
}

function userHasCanon(userCanons, canon) {
  if (userCanons.has(canon)) return true
  if (canon === 'egg' && userCanons.has('eggs')) return true
  if (canon === 'eggs' && userCanons.has('egg')) return true
  return false
}

function canonizeList(ingredients) {
  const canons = new Set()
  for (const item of ingredients) {
    const canon = canonicalIngredient(item)
    if (canon) canons.add(canon)
  }
  return canons
}

function labelForCanon(canon, displayNames, filteredUserIngredients, language) {
  const index = filteredUserIngredients.findIndex(
    (item) => canonicalIngredient(item) === canon || ingredientsMatch(item, canon),
  )
  if (index >= 0 && displayNames[index]) return displayNames[index]
  return getIngredientLabel(canon, language)
}

/**
 * @typedef {Object} DessertPantryStaple
 * @property {string} canon
 * @property {string} he
 * @property {string} en
 */

/**
 * @typedef {Object} RealisticDessertPattern
 * @property {string} id
 * @property {Set<string>} required
 * @property {string} [category]
 * @property {string} nameHe
 * @property {string} nameEn
 * @property {Record<string, { he: string, en: string }>} userQuantities
 * @property {DessertPantryStaple[]} pantryStaples
 * @property {(bake: number) => string[]} stepsHe
 * @property {(bake: number) => string[]} stepsEn
 */

/** @type {RealisticDessertPattern[]} */
export const REALISTIC_DESSERT_PATTERNS = [
  {
    id: 'dairy_cheese_cake',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    preferred: ['cheese'],
    supportive: ['egg', 'sugar'],
    selectionPriority: 25,
    nameHe: 'עוגת גבינה',
    nameEn: 'Cheesecake',
    userQuantities: {
      flour: { he: '150 גרם קמח', en: '150 g flour' },
      cheese: { he: '250 גרם גבינה', en: '250 g cheese' },
      milk: { he: '100 מ"ל חלב', en: '100 ml milk' },
    },
    pantryStaples: [
      { canon: 'butter', he: '80 גרם חמאה', en: '80 g butter' },
      { canon: 'sugar', he: '1/2 כוס סוכר', en: '1/2 cup sugar' },
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-170 מעלות ומרפדים תבנית עם נייר אפייה.',
      'מערבבים קמח, חמאה ומלח לבצק פריך, דוחסים בתחתית התבנית ואופים 10 דקות.',
      'מעבדים גבינה עם סוכר במיקסר עד לקרם חלק.',
      'מוסיפים ביצים אחת-אחת, חלב ותמצית וניל ומערבבים עד לבלילה אחידה.',
      `יוצקים על בסיס הבצק ואופים ${bake} דקות עד שהעוגה יציבה במרכז.`,
      'מקררים לפחות 4 שעות, חותכים לפרוסות ומגישים.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 170°C and line a pan with parchment.',
      'Mix flour, butter, and salt into a crisp dough, press into the pan base, and bake 10 minutes.',
      'Beat cheese with sugar until smooth.',
      'Add eggs one at a time, then milk and vanilla, and mix until evenly combined.',
      `Pour over the crust and bake about ${bake} minutes until set in the center.`,
      'Chill for at least 4 hours, slice, and serve.',
    ],
  },
  {
    id: 'dairy_cheese_cookies',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    selectionPriority: 10,
    nameHe: 'עוגיות גבינה',
    nameEn: 'Cheese Cookies',
    userQuantities: {
      flour: { he: '200 גרם קמח', en: '200 g flour' },
      cheese: { he: '150 גרם גבינה', en: '150 g cheese' },
      milk: { he: '3 כפות חלב', en: '3 tbsp milk' },
    },
    pantryStaples: [
      { canon: 'butter', he: '100 גרם חמאה', en: '100 g butter' },
      { canon: 'sugar', he: '1/2 כוס סוכר', en: '1/2 cup sugar' },
      { canon: 'egg', he: '1 ביצה', en: '1 egg' },
      { canon: 'baking powder', he: '1 כפית אבקת אפייה', en: '1 tsp baking powder' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-180 מעלות ומרפדים תבנית.',
      'מערבבים חמאה, גבינה וסוכר עד לתערובת אחידה.',
      'מוסיפים ביצה, חלב, קמח, אבקת אפייה ומלח ולשים עד לבצק רך.',
      `יוצרים עוגיות, מסדרים על התבנית ואופים ${bake} דקות עד פריך וזהוב.`,
      'מקררים על רשת כמה דקות לפני ההגשה.',
      'מגישים עם תה או קפה.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 180°C and line a tray.',
      'Cream butter, cheese, and sugar until smooth.',
      'Add egg, milk, flour, baking powder, and salt; knead into a soft dough.',
      `Shape cookies, arrange on the tray, and bake about ${bake} minutes until crisp and golden.`,
      'Cool on a rack for a few minutes.',
      'Serve with tea or coffee.',
    ],
  },
  {
    id: 'dairy_cheese_muffins',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    preferred: ['egg', 'cheese'],
    supportive: ['sugar', 'baking powder'],
    selectionPriority: 20,
    nameHe: 'מאפינס גבינה',
    nameEn: 'Cheese Muffins',
    userQuantities: {
      flour: { he: '200 גרם קמח', en: '200 g flour' },
      cheese: { he: '150 גרם גבינה', en: '150 g cheese' },
      milk: { he: '120 מ"ל חלב', en: '120 ml milk' },
    },
    pantryStaples: [
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'sugar', he: '80 גרם סוכר', en: '80 g sugar' },
      { canon: 'butter', he: '60 גרם חמאה', en: '60 g butter' },
      { canon: 'baking powder', he: '2 כפיות אבקת אפייה', en: '2 tsp baking powder' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-180 מעלות ומכינים תבנית מאפינס.',
      'מערבבים קמח, סוכר, אבקת אפייה ומלח.',
      'מגרדים גבינה, ממיסים חמאה ומערבבים עם חלב וביצים.',
      'מחברים תערובות עד לבלילה אחידה.',
      `ממלאים כ-2/3 מכל גביע ואופים ${bake} דקות עד שקיסם יוצא יבש.`,
      'מקררים מעט ומגישים.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 180°C and prepare a muffin tin.',
      'Whisk flour, sugar, baking powder, and salt.',
      'Grate cheese, melt butter, and mix with milk and eggs.',
      'Combine wet and dry ingredients until just blended.',
      `Fill cups about two-thirds full and bake about ${bake} minutes until a toothpick comes out clean.`,
      'Cool briefly and serve.',
    ],
  },
  {
    id: 'dairy_cheese_pancakes',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    preferred: ['egg'],
    supportive: ['milk'],
    selectionPriority: 16,
    nameHe: 'פנקייק גבינה',
    nameEn: 'Cheese Pancakes',
    userQuantities: {
      flour: { he: '150 גרם קמח', en: '150 g flour' },
      cheese: { he: '100 גרם גבינה', en: '100 g cheese' },
      milk: { he: '200 מ"ל חלב', en: '200 ml milk' },
    },
    pantryStaples: [
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'sugar', he: '2 כפות סוכר', en: '2 tbsp sugar' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'baking powder', he: '1 כפית אבקת אפייה', en: '1 tsp baking powder' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מערבבים קמח, אבקת אפייה, סוכר ומלח בקערה.',
      'מגרדים גבינה, מוסיפים חלב וביצים ומערבבים.',
      'מחברים תערובות יבשות ורטובות עד לבלילה חלקה.',
      `מחממים מחבת עם חמאה ומטגנים פנקייקים ${Math.max(12, Math.round(bake / 3))} דקות מכל צד עד הזהבה.`,
      'מגישים חם.',
    ],
    stepsEn: (bake) => [
      'Whisk flour, baking powder, sugar, and salt in a bowl.',
      'Grate cheese, add milk and eggs, and mix.',
      'Combine wet and dry ingredients until smooth.',
      `Warm a pan with butter and fry pancakes about ${Math.max(12, Math.round(bake / 3))} minutes per side until golden.`,
      'Serve warm.',
    ],
  },
  {
    id: 'butter_cinnamon_cookies',
    required: new Set(['flour', 'sugar', 'cinnamon', 'butter']),
    signature: ['cinnamon'],
    selectionPriority: 15,
    nameHe: 'עוגיות חמאה וקינמון',
    nameEn: 'Butter Cinnamon Cookies',
    userQuantities: {
      flour: { he: '250 גרם קמח', en: '250 g flour' },
      sugar: { he: '150 גרם סוכר', en: '150 g sugar' },
      cinnamon: { he: '2 כפיות קינמון', en: '2 tsp cinnamon' },
      butter: { he: '200 גרם חמאה', en: '200 g butter' },
    },
    pantryStaples: [
      { canon: 'egg', he: '1 ביצה', en: '1 egg' },
      { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-180 מעלות.',
      'מרככים חמאה ומערבבים עם סוכר, קינמון, מלח ווניל.',
      'מוסיפים ביצה, קמח ולשים עד לבצק אחיד.',
      `יוצרים עוגיות, מסדרים על תבנית ואופים ${bake} דקות עד פריך וזהוב.`,
      'מקררים על רשת לפני ההגשה.',
      'מגישים עם תה או קפה.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 180°C.',
      'Soften butter and mix with sugar, cinnamon, salt, and vanilla.',
      'Add egg and flour; mix until a uniform dough forms.',
      `Shape cookies, arrange on a tray, and bake about ${bake} minutes until crisp and golden.`,
      'Cool on a rack before serving.',
      'Serve with tea or coffee.',
    ],
  },
  {
    id: 'flour_sugar_brownies',
    required: new Set(['flour', 'sugar', 'butter']),
    category: 'dairy',
    signature: ['butter'],
    selectionPriority: 12,
    nameHe: 'בראוניז שוקולד',
    nameEn: 'Chocolate Brownies',
    userQuantities: {
      flour: { he: '120 גרם קמח', en: '120 g flour' },
      sugar: { he: '200 גרם סוכר', en: '200 g sugar' },
      butter: { he: '150 גרם חמאה', en: '150 g butter' },
    },
    pantryStaples: [
      { canon: 'egg', he: '3 ביצים', en: '3 eggs' },
      { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-175 מעלות ומרפדים תבנית.',
      'ממיסים חמאה, מערבבים עם סוכר, ביצים, וניל ומלח.',
      'מקפלים קמח עד לבלילה אחידה — לא לערבב יתר.',
      `יוצקים לתבנית ואופים ${bake} דקות עד שהקצוות יציבים והמרכז עדיין לח.`,
      'מקררים לגמרי לפני חיתוך לריבועים.',
      'מגישים.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 175°C and line a pan.',
      'Melt butter; whisk with sugar, eggs, vanilla, and salt.',
      'Fold in flour until just combined — do not overmix.',
      `Pour into the pan and bake about ${bake} minutes until the edges set and the center is fudgy.`,
      'Cool completely before cutting into squares.',
      'Serve.',
    ],
  },
  {
    id: 'flour_egg_muffins',
    required: new Set(['flour', 'egg', 'milk']),
    category: 'dairy',
    preferred: ['egg'],
    selectionPriority: 11,
    nameHe: 'מאפינס ביתיים',
    nameEn: 'Homemade Muffins',
    userQuantities: {
      flour: { he: '200 גרם קמח', en: '200 g flour' },
      egg: { he: '2 ביצים', en: '2 eggs' },
      milk: { he: '120 מ"ל חלב', en: '120 ml milk' },
    },
    pantryStaples: [
      { canon: 'sugar', he: '100 גרם סוכר', en: '100 g sugar' },
      { canon: 'butter', he: '80 גרם חמאה', en: '80 g butter' },
      { canon: 'baking powder', he: '2 כפיות אבקת אפייה', en: '2 tsp baking powder' },
      { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-180 מעלות ומכינים תבנית מאפינס.',
      'מערבבים קמח, סוכר, אבקת אפייה ומלח.',
      'ממיסים חמאה, מוסיפים חלב, ביצים ווניל ומערבבים.',
      'מחברים תערובות עד שהבלילה אחידה.',
      `ממלאים כ-2/3 מכל גביע ואופים ${bake} דקות עד שקיסם יוצא יבש.`,
      'מקררים מעט ומגישים.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 180°C and prepare a muffin tin.',
      'Whisk flour, sugar, baking powder, and salt.',
      'Melt butter; add milk, eggs, and vanilla and mix.',
      'Combine wet and dry ingredients until just blended.',
      `Fill cups about two-thirds full and bake about ${bake} minutes until a toothpick comes out clean.`,
      'Cool briefly and serve.',
    ],
  },
  {
    id: 'cocoa_brownies',
    required: new Set(['flour', 'sugar']),
    requiredAny: ['cocoa', 'chocolate'],
    category: 'dairy',
    signature: ['cocoa', 'chocolate'],
    supportive: ['butter', 'egg'],
    selectionPriority: 22,
    nameHe: 'בראוניז שוקולד',
    nameEn: 'Chocolate Brownies',
    userQuantities: {
      flour: { he: '120 גרם קמח', en: '120 g flour' },
      sugar: { he: '200 גרם סוכר', en: '200 g sugar' },
      cocoa: { he: '50 גרם אבקת קקאו', en: '50 g cocoa powder' },
      chocolate: { he: '100 גרם שוקולד', en: '100 g chocolate' },
    },
    pantryStaples: [
      { canon: 'butter', he: '150 גרם חמאה', en: '150 g butter' },
      { canon: 'egg', he: '3 ביצים', en: '3 eggs' },
      { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-175 מעלות ומרפדים תבנית.',
      'ממיסים חמאה עם שוקולד, מערבבים עם סוכר, קקאו, ביצים, וניל ומלח.',
      'מקפלים קמח עד לבלילה אחידה — לא לערבב יתר.',
      `יוצקים לתבנית ואופים ${bake} דקות עד שהקצוות יציבים והמרכז לח.`,
      'מקררים לגמרי לפני חיתוך לריבועים.',
      'מגישים.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 175°C and line a pan.',
      'Melt butter with chocolate; whisk in sugar, cocoa, eggs, vanilla, and salt.',
      'Fold in flour until just combined — do not overmix.',
      `Pour into the pan and bake about ${bake} minutes until the edges set and the center is fudgy.`,
      'Cool completely before cutting into squares.',
      'Serve.',
    ],
  },
  {
    id: 'cocoa_chocolate_cake',
    required: new Set(['flour', 'sugar']),
    requiredAny: ['cocoa', 'chocolate'],
    category: 'dairy',
    signature: ['cocoa', 'chocolate'],
    preferred: ['egg'],
    supportive: ['milk', 'butter'],
    selectionPriority: 18,
    nameHe: 'עוגת שוקולד',
    nameEn: 'Chocolate Cake',
    userQuantities: {
      flour: { he: '200 גרם קמח', en: '200 g flour' },
      sugar: { he: '180 גרם סוכר', en: '180 g sugar' },
      cocoa: { he: '60 גרם אבקת קקאו', en: '60 g cocoa powder' },
      chocolate: { he: '80 גרם שוקולד', en: '80 g chocolate' },
    },
    pantryStaples: [
      { canon: 'egg', he: '3 ביצים', en: '3 eggs' },
      { canon: 'milk', he: '120 מ"ל חלב', en: '120 ml milk' },
      { canon: 'butter', he: '100 גרם חמאה', en: '100 g butter' },
      { canon: 'baking powder', he: '2 כפיות אבקת אפייה', en: '2 tsp baking powder' },
      { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-175 מעלות ומרפדים תבנית.',
      'מערבבים קמח, קקאו, אבקת אפייה, סוכר ומלח.',
      'ממיסים חמאה עם שוקולד, מוסיפים חלב, ביצים ווניל.',
      'מחברים תערובות יבשות ורטובות עד לבלילה חלקה.',
      `יוצקים לתבנית ואופים ${bake} דקות עד שקיסם יוצא יבש.`,
      'מקררים מעט, חותכים ומגישים.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 175°C and line a pan.',
      'Whisk flour, cocoa, baking powder, sugar, and salt.',
      'Melt butter with chocolate; add milk, eggs, and vanilla.',
      'Combine wet and dry ingredients until smooth.',
      `Pour into the pan and bake about ${bake} minutes until a toothpick comes out clean.`,
      'Cool slightly, slice, and serve.',
    ],
  },
  {
    id: 'cocoa_chocolate_muffins',
    required: new Set(['flour', 'sugar']),
    requiredAny: ['cocoa', 'chocolate'],
    category: 'dairy',
    signature: ['cocoa', 'chocolate'],
    preferred: ['egg'],
    supportive: ['milk'],
    selectionPriority: 21,
    nameHe: 'מאפינס שוקולד',
    nameEn: 'Chocolate Muffins',
    userQuantities: {
      flour: { he: '200 גרם קמח', en: '200 g flour' },
      sugar: { he: '120 גרם סוכר', en: '120 g sugar' },
      cocoa: { he: '40 גרם אבקת קקאו', en: '40 g cocoa powder' },
      chocolate: { he: '80 גרם שוקולד', en: '80 g chocolate' },
    },
    pantryStaples: [
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'milk', he: '120 מ"ל חלב', en: '120 ml milk' },
      { canon: 'butter', he: '80 גרם חמאה', en: '80 g butter' },
      { canon: 'baking powder', he: '2 כפיות אבקת אפייה', en: '2 tsp baking powder' },
      { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-180 מעלות ומכינים תבנית מאפינס.',
      'מערבבים קמח, קקאו, סוכר, אבקת אפייה ומלח.',
      'ממיסים חמאה עם שוקולד, מוסיפים חלב, ביצים ווניל.',
      'מחברים עד לבלילה אחידה.',
      `ממלאים כ-2/3 מכל גביע ואופים ${bake} דקות עד שקיסם יוצא יבש.`,
      'מקררים מעט ומגישים.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 180°C and prepare a muffin tin.',
      'Whisk flour, cocoa, sugar, baking powder, and salt.',
      'Melt butter with chocolate; add milk, eggs, and vanilla.',
      'Mix until just combined.',
      `Fill cups about two-thirds full and bake about ${bake} minutes until a toothpick comes out clean.`,
      'Cool briefly and serve.',
    ],
  },
  {
    id: 'banana_cake',
    required: new Set(['flour', 'banana']),
    category: 'dairy',
    signature: ['banana'],
    preferred: ['sugar'],
    supportive: ['egg', 'milk', 'butter'],
    selectionPriority: 24,
    nameHe: 'עוגת בננה',
    nameEn: 'Banana Cake',
    userQuantities: {
      flour: { he: '200 גרם קמח', en: '200 g flour' },
      banana: { he: '3 בננות', en: '3 bananas' },
    },
    pantryStaples: [
      { canon: 'sugar', he: '120 גרם סוכר', en: '120 g sugar' },
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'butter', he: '80 גרם חמאה', en: '80 g butter' },
      { canon: 'milk', he: '80 מ"ל חלב', en: '80 ml milk' },
      { canon: 'baking powder', he: '2 כפיות אבקת אפייה', en: '2 tsp baking powder' },
      { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-175 מעלות ומרפדים תבנית.',
      'מועכים בננות, מערבבים עם סוכר, ביצים, חמאה, חלב ווניל.',
      'מוסיפים קמח, אבקת אפייה ומלח ומערבבים עד לבלילה חלקה.',
      `יוצקים לתבנית ואופים ${bake} דקות עד שקיסם יוצא יבש.`,
      'מקררים מעט, חותכים ומגישים.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 175°C and line a pan.',
      'Mash bananas; mix with sugar, eggs, butter, milk, and vanilla.',
      'Add flour, baking powder, and salt; mix until smooth.',
      `Pour into the pan and bake about ${bake} minutes until a toothpick comes out clean.`,
      'Cool slightly, slice, and serve.',
    ],
  },
  {
    id: 'banana_muffins',
    required: new Set(['flour', 'banana']),
    category: 'dairy',
    signature: ['banana'],
    preferred: ['egg'],
    supportive: ['sugar'],
    selectionPriority: 22,
    nameHe: 'מאפינס בננה',
    nameEn: 'Banana Muffins',
    userQuantities: {
      flour: { he: '200 גרם קמח', en: '200 g flour' },
      banana: { he: '2 בננות', en: '2 bananas' },
    },
    pantryStaples: [
      { canon: 'sugar', he: '100 גרם סוכר', en: '100 g sugar' },
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'butter', he: '80 גרם חמאה', en: '80 g butter' },
      { canon: 'baking powder', he: '2 כפיות אבקת אפייה', en: '2 tsp baking powder' },
      { canon: 'vanilla', he: '1 כפית תמצית וניל', en: '1 tsp vanilla extract' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-180 מעלות ומכינים תבנית מאפינס.',
      'מועכים בננות ומערבבים עם סוכר, ביצים, חמאה ווניל.',
      'מוסיפים קמח, אבקת אפייה ומלח ומערבבים עד לבלילה אחידה.',
      `ממלאים כ-2/3 מכל גביע ואופים ${bake} דקות עד שקיסם יוצא יבש.`,
      'מקררים מעט ומגישים.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 180°C and prepare a muffin tin.',
      'Mash bananas; mix with sugar, eggs, butter, and vanilla.',
      'Add flour, baking powder, and salt; mix until combined.',
      `Fill cups about two-thirds full and bake about ${bake} minutes until a toothpick comes out clean.`,
      'Cool briefly and serve.',
    ],
  },
  {
    id: 'banana_pancakes',
    required: new Set(['flour', 'banana']),
    category: 'dairy',
    signature: ['banana'],
    preferred: ['egg', 'milk'],
    supportive: ['sugar'],
    selectionPriority: 18,
    nameHe: 'פנקייק בננה',
    nameEn: 'Banana Pancakes',
    userQuantities: {
      flour: { he: '150 גרם קמח', en: '150 g flour' },
      banana: { he: '2 בננות', en: '2 bananas' },
    },
    pantryStaples: [
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'milk', he: '150 מ"ל חלב', en: '150 ml milk' },
      { canon: 'sugar', he: '2 כפות סוכר', en: '2 tbsp sugar' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'baking powder', he: '1 כפית אבקת אפייה', en: '1 tsp baking powder' },
      { canon: 'salt', he: '1/4 כפית מלח', en: '1/4 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מועכים בננות, מוסיפים חלב, ביצים וסוכר ומערבבים.',
      'מערבבים קמח, אבקת אפייה ומלח ומחברים לבלילה חלקה.',
      `מחממים מחבת עם חמאה ומטגנים פנקייקים ${Math.max(12, Math.round(bake / 3))} דקות מכל צד עד הזהבה.`,
      'מגישים חם.',
    ],
    stepsEn: (bake) => [
      'Mash bananas; add milk, eggs, and sugar and mix.',
      'Whisk flour, baking powder, and salt; combine until smooth.',
      `Warm a pan with butter and fry pancakes about ${Math.max(12, Math.round(bake / 3))} minutes per side until golden.`,
      'Serve warm.',
    ],
  },
]

export function buildDessertIngredientList(
  pattern,
  filteredUserIngredients,
  displayNames,
  { language = 'he', pantryLabel = getBasicPantryLabel(language) } = {},
) {
  if (!pattern) return []

  const userCanons = canonizeList(filteredUserIngredients)
  const lines = []
  const addedCanons = new Set()

  const userOrder = [...(pattern.required ?? new Set())]
  for (const extra of filteredUserIngredients) {
    const canon = canonicalIngredient(extra)
    if (canon && !userOrder.includes(canon)) userOrder.push(canon)
  }

  for (const canon of userOrder) {
    if (!userCanons.has(canon) && !(canon === 'egg' && userCanons.has('eggs'))) continue
    const preset = pattern.userQuantities?.[canon]
    if (preset) {
      lines.push(language === 'en' ? preset.en : preset.he)
    } else {
      const label = labelForCanon(canon, displayNames, filteredUserIngredients, language)
      lines.push(language === 'he' ? `1 ${label}` : `1 ${label}`)
    }
    addedCanons.add(canon)
    if (canon === 'egg') addedCanons.add('eggs')
    if (canon === 'eggs') addedCanons.add('egg')
  }

  for (const staple of pattern.pantryStaples ?? []) {
    if (userHasCanon(userCanons, staple.canon)) continue
    const line = language === 'en' ? staple.en : staple.he
    lines.push(`${line} ${pantryLabel}`.trim())
  }

  return lines
}

export function buildRealisticDessertFromPattern(
  pattern,
  {
    filteredUserIngredients = [],
    displayNames = [],
    language = 'he',
    cookingTime = 30,
    pantryLabel = getBasicPantryLabel(language),
    servings = 4,
  } = {},
) {
  const bake = Math.min(cookingTime, Math.max(20, Math.round(cookingTime * 0.85)))
  const name = language === 'en' ? pattern.nameEn : pattern.nameHe
  const ingredients = buildDessertIngredientList(pattern, filteredUserIngredients, displayNames, {
    language,
    pantryLabel,
  })
  const steps = language === 'en' ? pattern.stepsEn(bake) : pattern.stepsHe(bake)

  const base = {
    name,
    description: '',
    ingredients,
    steps,
    matchPercentage: 90,
    spiceLevel: 0,
    nutrition: { servings },
    tags: ['comfortFood'],
  }

  const quantified = applyRecipeQuantities(base, {
    language,
    recipeType: 'dessert',
    servings,
    preserveOriginalSteps: true,
  })

  return {
    name: quantified.name ?? name,
    ingredients: quantified.ingredients ?? ingredients,
    steps: quantified.steps ?? steps,
    nutrition: quantified.nutrition,
    healthScore: quantified.healthScore,
  }
}
