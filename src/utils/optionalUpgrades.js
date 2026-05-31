import { canonicalIngredient, ingredientsMatch } from '../data/ingredientKnowledge'

const UPGRADE_CATALOG = [
  { canon: 'butter', he: 'חמאה', en: 'butter', reasonHe: 'מוסיפה עשירות ומחברת את התערובת', reasonEn: 'Adds richness and helps bind the mixture' },
  { canon: 'vanilla', he: 'וניל', en: 'vanilla', reasonHe: 'מעצימה את הניחוח והמתיקות', reasonEn: 'Enhances sweetness and aroma' },
  { canon: 'oil', he: 'שמן', en: 'oil', reasonHe: 'מונע הידבקות ומשפר מרקם', reasonEn: 'Helps prevent sticking and improves texture' },
  { canon: 'flour', he: 'קמח', en: 'flour', reasonHe: 'מוסיפה מבנה לאפייה', reasonEn: 'Adds structure for baking' },
  { canon: 'baking powder', he: 'אבקת אפייה', en: 'baking powder', reasonHe: 'מסייעת לקינוחים להתרומם', reasonEn: 'Helps desserts rise and stay light' },
  { canon: 'egg', he: 'ביצה', en: 'egg', reasonHe: 'מחברת מרכיבים ומשפרת מרקם', reasonEn: 'Binds ingredients and improves texture' },
  { canon: 'milk', he: 'חלב', en: 'milk', reasonHe: 'מרככת ומעשירה את התערובת', reasonEn: 'Softens and enriches the mixture' },
]

/**
 * @param {string[]} userIngredients
 * @param {{ language?: string, recipeType?: string, limit?: number }} [options]
 */
export function buildOptionalUpgrades(userIngredients, { language = 'he', recipeType = 'meal', limit = 3 } = {}) {
  const upgrades = []

  for (const item of UPGRADE_CATALOG) {
    const alreadyHas = (userIngredients ?? []).some(
      (user) => ingredientsMatch(user, item.canon) || canonicalIngredient(user) === item.canon,
    )
    if (alreadyHas) continue

    upgrades.push({
      ingredient: language === 'he' ? item.he : item.en,
      reason: language === 'he' ? item.reasonHe : item.reasonEn,
    })
    if (upgrades.length >= limit) break
  }

  return upgrades
}
