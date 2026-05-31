import {
  formatEnglishStepIngredientList,
  formatHebrewStepIngredientList,
  toStepIngredientReference,
} from './recipeStepWording'

const MELT_KEYWORDS = ['marshmallow', 'מרשמלו', 'chocolate', 'שוקולד', 'שמנת', 'cream']
const SUGAR_KEYWORDS = ['sugar', 'סוכר', 'דבש', 'honey']
const DRY_KEYWORDS = ['coconut', 'קוקוס', 'קמח', 'flour', 'אבקת', 'cocoa', 'קקאו', 'oats', 'שיבולת']

function bareName(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^[\d\s/]+(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ"?ל|כוס(?:ות)?|יח(?:ידה|ידות)?|tsp|tbsp|cup|g|ml)\.?\s*/i, '')
}

function matchesAny(name, keywords) {
  const lower = bareName(name).toLowerCase()
  return keywords.some((keyword) => lower.includes(keyword))
}

function pickByKeywords(names, keywords) {
  return names.find((name) => matchesAny(name, keywords)) ?? null
}

/**
 * @param {string[]} displayIngredients
 * @param {{ recipeType?: string, language?: string, cookingTime?: number }} [options]
 */
export function buildStepsFromUserIngredients(
  displayIngredients,
  { recipeType = 'meal', language = 'he', cookingTime = 30 } = {},
) {
  const names = (displayIngredients ?? []).map((item) => String(item ?? '').trim()).filter(Boolean)
  if (names.length === 0) return []

  const cookMinutes = Math.min(cookingTime, Math.max(10, Math.round(cookingTime / 2)))
  const chillMinutes = Math.min(cookingTime, Math.max(20, Math.round(cookingTime * 0.7)))
  const refs = names.map((name) => toStepIngredientReference(name, language))
  const listPhrase =
    language === 'he'
      ? formatHebrewStepIngredientList(refs)
      : formatEnglishStepIngredientList(refs)

  if (recipeType === 'dessert') {
    const meltName = pickByKeywords(names, MELT_KEYWORDS)
    const dryNames = names.filter(
      (n) => n !== meltName && matchesAny(n, [...DRY_KEYWORDS, ...SUGAR_KEYWORDS]),
    )
    const otherNames = names.filter((n) => n !== meltName && !dryNames.includes(n))

    if (language === 'en') {
      if (meltName && names.length >= 2) {
        const meltRef = toStepIngredientReference(meltName, language)
        const dryRefs = [...dryNames, ...otherNames].map((n) => toStepIngredientReference(n, language))
        const dryPhrase = dryRefs.length
          ? formatEnglishStepIngredientList(dryRefs)
          : listPhrase
        return [
          'Line a tray with parchment paper and set aside.',
          `Melt ${meltRef} in a saucepan over low heat, stirring until smooth.`,
          `Remove from heat, add ${dryPhrase} and stir well until evenly mixed.`,
          'Pour the mixture into the tray and spread evenly with a spoon.',
          `Refrigerate for about ${chillMinutes} minutes until firm enough to cut.`,
          'Cut into portions and serve.',
        ]
      }
      if (names.length === 1) {
        return [
          `Place ${refs[0]} in a mixing bowl.`,
          `Mix or heat gently over low heat for about ${cookMinutes} minutes until smooth.`,
          'Shape or spread into portions and let set before serving.',
          'Serve when the texture holds together.',
        ]
      }
      return [
        `Combine ${listPhrase} in a bowl and mix until evenly blended.`,
        'Pour into a lined tray and spread evenly with a spoon.',
        `Chill for about ${chillMinutes} minutes until firm enough to shape.`,
        'Cut into bite-sized pieces.',
        'Serve when ready.',
      ]
    }

    if (meltName && names.length >= 2) {
      const meltRef = toStepIngredientReference(meltName, language)
      const dryRefs = [...dryNames, ...otherNames].map((n) => toStepIngredientReference(n, language))
      const dryPhrase = dryRefs.length ? formatHebrewStepIngredientList(dryRefs) : listPhrase
      return [
        'מרפדים תבנית בנייר אפייה ומניחים בצד.',
        `ממיסים את ${meltRef} בסיר על אש נמוכה תוך ערבוב עד לקבלת תערובת חלקה.`,
        `מסירים מהאש, מוסיפים את ${dryPhrase} ומערבבים היטב עד לקבלת תערובת אחידה.`,
        'שופכים את התערובת לתבנית ומשטחים בעזרת כף.',
        `מקררים כ-${chillMinutes} דקות עד שהמענה מתקשה מספיק לחיתוך.`,
        'חותכים ליחידות ומגישים.',
      ]
    }
    if (names.length === 1) {
      return [
        `מניחים את ${refs[0]} בקערת ערבוב.`,
        `מערבבים או מחממים בעדינות על אש נמוכה כ-${cookMinutes} דקות עד למרקם חלק.`,
        'יוצרים צורה או שכבה אחידה וממתינים שהמענה יתייצב.',
        'מגישים כשהמרקם מחזיק יחד.',
      ]
    }
    return [
      `מערבבים את ${listPhrase} בקערה עד לקבלת תערובת אחידה.`,
      'שופכים לתבנית מרופדת ומשטחים בעזרת כף.',
      `מקררים כ-${chillMinutes} דקות עד שהמענה מתייצב.`,
      'חותכים לקוביות קטנות.',
      'מגישים.',
    ]
  }

  if (language === 'en') {
    if (names.length === 1) {
      return [
        `Heat a pan over medium heat and add ${refs[0]}.`,
        `Cook gently for about ${cookMinutes} minutes, stirring occasionally, until tender and fragrant.`,
        'Taste and adjust seasoning if needed.',
        'Serve hot while fresh.',
      ]
    }
    return [
      'Heat a pan or pot over medium heat.',
      `Add ${listPhrase} and cook together, stirring occasionally.`,
      `Continue cooking for about ${cookMinutes} minutes until the ingredients are tender and well combined.`,
      'Taste and adjust seasoning to your preference.',
      'Serve hot.',
    ]
  }

  if (names.length === 1) {
    return [
      `מחממים מחבת על אש בינונית ומוסיפים את ${refs[0]}.`,
      `מבשלים בעדינות כ-${cookMinutes} דקות תוך ערבוב, עד שהמרכיב רך וארоматי.`,
      'טועמים ומתבלים לפי הצורך.',
      'מגישים חם.',
    ]
  }
  return [
    'מחממים מחבת או סיר על אש בינונית.',
    `מוסיפים את ${listPhrase} ומבשלים יחד תוך ערבוב מדי פעם.`,
    `ממשיכים לבשל כ-${cookMinutes} דקות עד שהמרכיבים רכים ומשתלבים היטב.`,
    'טועמים ומתבלים לפי הטעם.',
    'מגישים חם.',
  ]
}
