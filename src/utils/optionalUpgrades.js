import { canonicalIngredient, ingredientsMatch } from '../data/ingredientKnowledge'

/**
 * Savory finishing upgrades. `match` lists user-ingredient canons this pairs
 * especially well with, so suggestions stay relevant to the actual dish.
 */
const SAVORY_UPGRADES = [
  { canon: 'parsley', he: 'פטרוזיליה קצוצה', en: 'chopped parsley', reasonHe: 'מוסיפה רעננות וצבע למנה', reasonEn: 'Adds freshness and color', match: [] },
  { canon: 'chili flakes', he: 'פתיתי צ׳ילי', en: 'chili flakes', reasonHe: 'מוסיפים חריפות עדינה', reasonEn: 'Add a gentle kick of heat', match: [] },
  { canon: 'lemon', he: 'מיץ לימון', en: 'a squeeze of lemon', reasonHe: 'מאזן ומבהיר את הטעמים', reasonEn: 'Brightens and balances the flavors', match: [] },
  { canon: 'parmesan', he: 'פרמזן מגורר', en: 'grated parmesan', reasonHe: 'מוסיף מליחות ועומק לרוטב ולפסטה', reasonEn: 'Adds salty depth to pasta and sauce', match: ['pasta', 'cream', 'cheese'] },
  { canon: 'nutmeg', he: 'אגוז מוסקט', en: 'nutmeg', reasonHe: 'מעדן ומעשיר רטבי שמנת', reasonEn: 'Rounds out and enriches cream sauces', match: ['cream'] },
  { canon: 'oregano', he: 'אורגנו', en: 'oregano', reasonHe: 'מדגיש את טעם העגבניות והגבינה', reasonEn: 'Highlights the tomato and cheese', match: ['tomato', 'cheese'] },
  { canon: 'basil', he: 'בזיליקום טרי', en: 'fresh basil', reasonHe: 'משתלב מצוין עם עגבניות וגבינה', reasonEn: 'Pairs beautifully with tomato and cheese', match: ['tomato', 'cheese'] },
  { canon: 'olives', he: 'זיתים', en: 'olives', reasonHe: 'מוסיפים מליחות ים-תיכונית', reasonEn: 'Add briny Mediterranean flavor', match: ['tomato', 'cheese'] },
  { canon: 'green onion', he: 'בצל ירוק', en: 'green onion', reasonHe: 'מוסיף רעננות וטעם עדין', reasonEn: 'Adds a fresh, mild onion note', match: ['egg', 'cheese'] },
  { canon: 'feta', he: 'גבינת פטה', en: 'feta cheese', reasonHe: 'מוסיפה מליחות וטעם עשיר', reasonEn: 'Adds a salty, tangy bite', match: ['tomato', 'cheese', 'egg'] },
  { canon: 'mushrooms', he: 'פטריות', en: 'mushrooms', reasonHe: 'מוסיפות מרקם ועומק אומאמי', reasonEn: 'Add texture and umami depth', match: ['egg'] },
]

/** Sweet finishing upgrades for desserts. */
const DESSERT_UPGRADES = [
  { canon: 'vanilla', he: 'תמצית וניל', en: 'vanilla extract', reasonHe: 'מעצימה ניחוח ומתיקות', reasonEn: 'Enhances aroma and sweetness', match: [] },
  { canon: 'cinnamon', he: 'קינמון', en: 'cinnamon', reasonHe: 'מוסיף חמימות וניחוח', reasonEn: 'Adds warmth and aroma', match: [] },
  { canon: 'chocolate', he: 'שבבי שוקולד', en: 'chocolate chips', reasonHe: 'מוסיפים עושר ומתיקות', reasonEn: 'Add richness and sweetness', match: [] },
  { canon: 'honey', he: 'דבש', en: 'honey', reasonHe: 'ממתיק בעדינות טבעית', reasonEn: 'Sweetens with a natural touch', match: [] },
  { canon: 'coconut', he: 'קוקוס', en: 'shredded coconut', reasonHe: 'מוסיף מרקם וטעם', reasonEn: 'Adds texture and flavor', match: [] },
]

const DAIRY_UPGRADE_CANONS = new Set(['feta', 'parmesan', 'cheese', 'mozzarella', 'ricotta'])

function userAllowsDairy(userIngredients, selectedCategory = 'any') {
  if (selectedCategory === 'dairy') return true
  return (userIngredients ?? []).some((user) => {
    const canon = canonicalIngredient(user)
    return canon && ['cheese', 'milk', 'cream', 'butter', 'yogurt', 'feta', 'parmesan'].includes(canon)
  })
}

function userHas(userIngredients, canon) {
  return (userIngredients ?? []).some(
    (user) => ingredientsMatch(user, canon) || canonicalIngredient(user) === canon,
  )
}

/**
 * Context-aware optional upgrades for fallback/mock recipes. Suggestions are
 * chosen from a savory or dessert catalog (by recipe type) and ranked by how
 * well they match the actual ingredients, so a savory egg/tomato/cheese dish
 * gets herbs and toppings — never vanilla or random oil.
 *
 * @param {string[]} userIngredients
 * @param {{ language?: string, recipeType?: string, limit?: number }} [options]
 */
export function buildOptionalUpgrades(
  userIngredients,
  { language = 'he', recipeType = 'meal', selectedCategory = 'any', limit = 3 } = {},
) {
  const catalog = recipeType === 'dessert' ? DESSERT_UPGRADES : SAVORY_UPGRADES
  const userCanons = new Set((userIngredients ?? []).map((user) => canonicalIngredient(user)).filter(Boolean))
  const allowDairy = userAllowsDairy(userIngredients, selectedCategory)

  return catalog
    .filter((item) => !userHas(userIngredients, item.canon))
    .filter((item) => allowDairy || !DAIRY_UPGRADE_CANONS.has(item.canon))
    .map((item) => ({
      item,
      score: (item.match ?? []).filter((canon) => userCanons.has(canon)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => ({
      ingredient: language === 'he' ? item.he : item.en,
      reason: language === 'he' ? item.reasonHe : item.reasonEn,
    }))
}
