import {
  DESSERT_STYLE_VARIANTS,
  buildDessertDishTitle,
  pickPrimaryFlavorLabel,
} from './dessertDishTitle'
import { buildGroundedChefTitle } from './recipeGrounding'
import { canonicalIngredient } from '../data/ingredientKnowledge'
import { getIngredientLabel } from '../data/ingredientLabels'

const QTY_PREFIX =
  /^[\d./]+\s*(?:כפ(?:ית|ות)|כ(?:ף|פות)|גרם|מ"ל|כוס(?:ות)?|tsp|tbsp|gram|grams|g|ml|cup|cups)?\s*/i

function stripQty(raw) {
  return String(raw ?? '')
    .replace(QTY_PREFIX, '')
    .trim()
}

function mainCanon(ingredients = []) {
  return ingredients
    .map((item) => canonicalIngredient(stripQty(item)))
    .filter(Boolean)
}

function uniqueNames(items = []) {
  return [...new Set(items.filter(Boolean))]
}

export function suggestDishOptions(ingredients = [], { language = 'he', recipeType = 'meal' } = {}) {
  if (recipeType === 'dessert') {
    const main = pickPrimaryFlavorLabel(ingredients, language)
    return uniqueNames(
      DESSERT_STYLE_VARIANTS.map((variant) =>
        language === 'he' ? variant.titleHe(main) : variant.titleEn(main),
      ),
    ).slice(0, 4)
  }

  const canon = new Set(mainCanon(ingredients))
  const flavor = pickPrimaryFlavorLabel(ingredients, language)

  if (canon.has('cinnamon') && (canon.has('cream') || canon.has('milk'))) {
    return language === 'he'
      ? ['קרם קינמון חם', 'פודינג קינמון', 'רוטב קינמון מתוק']
      : ['Warm cinnamon cream', 'Cinnamon pudding', 'Sweet cinnamon sauce']
  }
  if (canon.has('chicken')) {
    return language === 'he'
      ? ['עוף במחבת', 'עוף בתנור', 'מרק עוף קל']
      : ['Pan-seared chicken', 'Oven-baked chicken', 'Light chicken soup']
  }
  if (canon.has('pasta')) {
    return uniqueNames([
      buildGroundedChefTitle(ingredients, ingredients, language),
      language === 'he' ? 'פסטה מהירה' : 'Quick pasta',
    ]).slice(0, 3)
  }
  if (canon.has('tomato') && (canon.has('egg') || canon.has('eggs'))) {
    return language === 'he'
      ? ['שקשוקה', 'חביתת עגבניות', 'ביצים ברוטב עגבניות']
      : ['Shakshuka', 'Tomato omelette', 'Eggs in tomato sauce']
  }
  if (canon.has('rice')) {
    return uniqueNames([
      buildGroundedChefTitle(ingredients, ingredients, language),
      language === 'he' ? 'אורז ביתי' : 'Homestyle rice',
    ]).slice(0, 3)
  }

  const label = flavor || getIngredientLabel([...canon][0] ?? 'ingredient', language)
  return language === 'he'
    ? [`${label} במחבת`, `תבשיל ${label}`, `מנה חמה עם ${label}`]
    : [`${label} skillet`, `${label} stew`, `Warm ${label} dish`]
}

function buildChoiceReason(chosenName, options, { language = 'he', cookingTime = 30 } = {}) {
  const chosen = String(chosenName ?? '').trim()
  if (!chosen) {
    return language === 'he'
      ? 'בחרתי מנה שמתאימה למרכיבים שיש לך.'
      : 'I picked a dish that fits what you have on hand.'
  }

  if (language === 'he') {
    if (options.length <= 1) {
      return `${chosen} מתאימה במיוחד למרכיבים שיש לך — פשוטה, טעימה, ובזמן של כ-${cookingTime} דקות.`
    }
    return `האפשרות הכי פשוטה וטעימה היא ${chosen} — מתאימה לזמן של כ-${cookingTime} דקות ולמרכיבים שיש לך.`
  }

  if (options.length <= 1) {
    return `${chosen} is a great fit for your ingredients — simple, tasty, and ready in about ${cookingTime} minutes.`
  }
  return `The simplest and most appealing option is ${chosen} — it fits your ingredients and about ${cookingTime} minutes of cooking time.`
}

/**
 * Friendly chef intro: alternatives + why this recipe was chosen.
 */
export function buildChefIntro(
  ingredients = [],
  {
    chosenName = '',
    language = 'he',
    recipeType = 'meal',
    cookingTime = 30,
  } = {},
) {
  let options = suggestDishOptions(ingredients, { language, recipeType })
  if (chosenName && !options.includes(chosenName)) {
    options = [chosenName, ...options.filter((item) => item !== chosenName)]
  } else if (chosenName) {
    options = [chosenName, ...options.filter((item) => item !== chosenName)]
  }
  options = uniqueNames(options).slice(0, 4)

  if (options.length === 0 && chosenName) {
    options = [chosenName]
  }

  const intro =
    language === 'he'
      ? 'עם המרכיבים שיש לך אפשר להכין:'
      : 'With the ingredients you have, you could make:'
  const bullets = options.map((item) => `• ${item}`).join('\n')
  const reason = buildChoiceReason(chosenName || options[0], options, { language, cookingTime })

  return `${intro}\n${bullets}\n\n${reason}`
}

export function buildChefIntroForRecipe(recipe, { language = 'he', recipeType = 'meal', cookingTime = 30 } = {}) {
  return buildChefIntro(recipe?.ingredients ?? [], {
    chosenName: recipe?.name ?? '',
    language,
    recipeType,
    cookingTime,
  })
}

export function enrichDescriptionWithChefIntro(
  description,
  ingredients = [],
  {
    chosenName = '',
    language = 'he',
    recipeType = 'meal',
    cookingTime = 30,
    hasUserIngredients = true,
  } = {},
) {
  if (!hasUserIngredients || !ingredients.length) {
    return description
  }
  const intro = buildChefIntro(ingredients, { chosenName, language, recipeType, cookingTime })
  return intro
}
