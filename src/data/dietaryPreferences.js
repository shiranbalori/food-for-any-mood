import { ingredientsMatch, normalizeIngredient } from './ingredientKnowledge'

export const GLUTEN_INGREDIENTS = [
  'pasta',
  'pasta shells',
  'flour',
  'wheat flour',
  'bread',
  'breadcrumbs',
  'couscous',
  'bulgur',
  'semolina',
  'barley',
  'pita',
  'croutons',
  'noodles',
  'spaghetti',
  'fettuccine',
  'penne',
  'seitan',
  'wheat',
  'soy sauce',
  'tortilla',
  'tortillas',
  'toast',
]

const GLUTEN_SUBSTITUTION_MAP = {
  pasta: { he: 'פסטה ללא גלוטן', en: 'gluten-free pasta' },
  'pasta shells': { he: 'קונכיות פסטה ללא גלוטן', en: 'gluten-free pasta shells' },
  flour: { he: 'קמח שקדים', en: 'almond flour' },
  'wheat flour': { he: 'קמח שקדים', en: 'almond flour' },
  bread: { he: 'לחם ללא גלוטן', en: 'gluten-free bread' },
  breadcrumbs: { he: 'פרורי לחם ללא גלוטן', en: 'gluten-free breadcrumbs' },
  couscous: { he: 'קינואה', en: 'quinoa' },
  bulgur: { he: 'קינואה', en: 'quinoa' },
  tortilla: { he: 'טורטיות תירס', en: 'corn tortillas' },
  tortillas: { he: 'טורטיות תירס', en: 'corn tortillas' },
  noodles: { he: 'אטריות אורז', en: 'rice noodles' },
  spaghetti: { he: 'ספגטי ללא גלוטן', en: 'gluten-free spaghetti' },
  fettuccine: { he: 'פטוצ׳יני ללא גלוטן', en: 'gluten-free fettuccine' },
  penne: { he: 'פנה ללא גלוטן', en: 'gluten-free penne' },
  pita: { he: 'טורטיות תירס', en: 'corn tortillas' },
  'soy sauce': { he: 'רוטב סויה ללא גלוטן', en: 'tamari (gluten-free)' },
  toast: { he: 'לחם ללא גלוטן', en: 'gluten-free bread' },
  semolina: { he: 'קמח אורז', en: 'rice flour' },
  barley: { he: 'קינואה', en: 'quinoa' },
  croutons: { he: 'קרוטונים ללא גלוטן', en: 'gluten-free croutons' },
  seitan: { he: 'טופו', en: 'tofu' },
  wheat: { he: 'קמח אורז', en: 'rice flour' },
}

function langKey(language) {
  return language === 'en' ? 'en' : 'he'
}

function matchesGlutenTerm(ingredient) {
  const normalized = normalizeIngredient(ingredient)
  return GLUTEN_INGREDIENTS.some((term) => ingredientsMatch(normalized, term))
}

export function isGlutenIngredient(ingredient) {
  return matchesGlutenTerm(ingredient)
}

export function getGlutenFreeSubstitute(ingredient, language = 'he') {
  const normalized = normalizeIngredient(ingredient)
  const lang = langKey(language)

  for (const [source, labels] of Object.entries(GLUTEN_SUBSTITUTION_MAP)) {
    if (ingredientsMatch(normalized, source)) return labels[lang]
  }

  if (matchesGlutenTerm(normalized)) {
    return lang === 'he'
      ? 'תחליף ללא גלוטן (אורז, קינואה או תפוחי אדמה)'
      : 'a gluten-free alternative (rice, quinoa, or potatoes)'
  }

  return null
}

export function substituteIngredient(ingredient, glutenFree, language = 'he') {
  if (!glutenFree) return ingredient
  return getGlutenFreeSubstitute(ingredient, language) ?? ingredient
}

export function getTemplateGlutenStatus(template) {
  const all = [...template.baseIngredients, ...(template.optionalIngredients ?? [])]
  const glutenItems = all.filter(isGlutenIngredient)

  if (glutenItems.length === 0) return 'natural'

  const allSubstitutable = glutenItems.every((item) => getGlutenFreeSubstitute(item))
  return allSubstitutable ? 'adaptable' : 'incompatible'
}

export function isTemplateGlutenFreeCompatible(template) {
  const status = getTemplateGlutenStatus(template)
  return status === 'natural' || status === 'adaptable'
}

export function adaptTemplateForGlutenFree(template) {
  const mapList = (list) => list.map((ing) => substituteIngredient(ing, true, 'en'))

  return {
    ...template,
    baseIngredients: mapList(template.baseIngredients),
    optionalIngredients: mapList(template.optionalIngredients ?? []),
  }
}

export function sanitizeUserIngredientsForGlutenFree(userIngredients) {
  return userIngredients.filter((ing) => !isGlutenIngredient(ing))
}

export function scoreGlutenFreeFit(template, userIngredients, glutenFree) {
  if (!glutenFree) return 1

  const status = getTemplateGlutenStatus(template)
  if (status === 'incompatible') return 0
  if (status === 'natural') return 1

  const userGluten = userIngredients.filter(isGlutenIngredient)
  if (userGluten.length > 0) return Math.max(0.35, 0.7 - userGluten.length * 0.15)

  return 0.88
}

export function applyGlutenFreeToText(text, language = 'he') {
  let result = text
  const lang = langKey(language)
  const extraReplacements =
    lang === 'he'
      ? [
          ['פרורי לחם', 'פרורי לחם ללא גלוטן'],
          ['לחם פריך', 'אורז מאודה'],
          ['לחם חם', 'אורז'],
          ['פיתה', 'טורטיות תירס'],
          ['טוסט', 'לחם ללא גלוטן'],
        ]
      : [
          ['breadcrumbs', 'gluten-free breadcrumbs'],
          ['crusty bread', 'steamed rice'],
          ['warm bread', 'rice'],
          ['pita', 'corn tortillas'],
          ['toast', 'gluten-free bread'],
        ]

  const replacements = [
    ...Object.entries(GLUTEN_SUBSTITUTION_MAP).map(([source, labels]) => [source, labels[lang]]),
    ...extraReplacements,
  ].sort((a, b) => b[0].length - a[0].length)

  for (const [source, substitute] of replacements) {
    const regex = new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    result = result.replace(regex, substitute)
  }

  return result
}

export function applyGlutenFreeToIngredientList(list, language = 'he') {
  return list
    .filter((item) => !isGlutenIngredient(item.split('(')[0]))
    .map((item) => {
      const base = item.split('(')[0].trim()
      const suffix = item.includes('(') ? item.slice(item.indexOf('(')) : ''
      const sub = getGlutenFreeSubstitute(base, language)
      if (sub && sub !== base) {
        return suffix ? `${sub} ${suffix}` : sub
      }
      return item
    })
}
