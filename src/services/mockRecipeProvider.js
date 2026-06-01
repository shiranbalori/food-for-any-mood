import { recipeTemplates } from '../data/recipeTemplates'
import { TEMPLATE_LOCALE_HE } from '../data/recipeTemplateLocale'
import {
  applyGlutenFreeToIngredientList,
  applyGlutenFreeToText,
  adaptTemplateForGlutenFree,
  getTemplateGlutenStatus,
  isGlutenIngredient,
  isTemplateGlutenFreeCompatible,
  sanitizeUserIngredientsForGlutenFree,
  scoreGlutenFreeFit,
  substituteIngredient,
} from '../data/dietaryPreferences'
import { getIngredientLabel } from '../data/ingredientLabels'
import { getRecipeCopy } from '../i18n/recipeCopy'
import { inferPreferredStyles, RECIPE_TAGS } from '../data/recipeStyles'
import { recommendPlaylist } from '../utils/playlistEngine'
import {
  parseUserIngredients,
  validateRecipeRelevance,
} from '../utils/ingredientRelevance'
import { applyRecipeIngredientParser } from '../utils/recipeIngredientParser'
import { buildDescriptiveDishTitle } from '../utils/recipeTitle'
import { buildDessertDishTitle } from '../utils/dessertDishTitle'
import { buildChefIntro } from '../utils/chefIntro'
import { buildStepsFromUserIngredients } from '../utils/userIngredientSteps'
import { buildOptionalUpgrades } from '../utils/optionalUpgrades'
import { pickAlternateDessertVariant, pickAlternateMealVariant } from '../utils/recipeDiversity'
import { calculateHealthScoreFromRecipe } from '../utils/nutritionScore'
import { getEffectiveRecipeType, isInvalidRecipeSelection } from '../utils/recipeCategoryGuard'
import {
  canonicalIngredient,
  getIngredientNutrition,
  ingredientsMatch,
  normalizeIngredient,
} from '../data/ingredientKnowledge'

const DESSERT_MOCK_BY_CATEGORY = {
  dairy: {
    name: 'קינוח גבינה',
    ingredients: ['גבינת שמנת', 'סוכר', 'ביצים', 'וניל', 'חמאה', 'עוגיות', 'סוכר', 'וניל'],
    steps: [
      'טוחנים עוגיות לפירורים ומערבבים עם חמאה מומסת. לוחצים לתחתית תבנית.',
      'מערבבים גבינת שמנת, סוכר, ביצים ווניל עד תערובת חלקה.',
      'יוצקים על בסיס העוגיות ומעבירים למקרר לקירור של לפחות 4 שעות.',
      'מקשטים בפירות יער או רוטב פירות לפני ההגשה.',
      'מגישים קר ומתוק.',
    ],
    calories: 420,
    protein: 9,
    carbs: 38,
    fat: 26,
    spiceLevel: 0,
    healthScore: 58,
    tags: ['comfortFood'],
  },
  meat: {
    name: 'תפוחים אפויים בדבש',
    ingredients: ['תפוחים', 'דבש', 'קינמון', 'לימון', 'שמן זית', 'סוכר', 'וניל'],
    steps: [
      'חותכים תפוחים לחצאים ומסירים גרעינים.',
      'מערבבים דבש, קינמון, מיץ לימון ושמן זית.',
      'מסדרים את התפוחים בתבנית ומוזקים את התערובת המתוקה.',
      'אופים בתנור ב-180°C כ-25 דקות עד רכות וקרמל.',
      'מגישים חמים עם כף יוגורט או גלידה פרווה.',
    ],
    calories: 280,
    protein: 2,
    carbs: 52,
    fat: 8,
    spiceLevel: 0,
    healthScore: 70,
    tags: ['healthy'],
  },
  parve: {
    name: 'עוגיות מהירות',
    ingredients: ['קמח', 'סוכר', 'אבקת קקאו', 'שמן', 'וניל', 'אבקת אפייה', 'סוכר', 'וניל'],
    steps: [
      'מערבבים קמח, סוכר, קקאו ואבקת אפייה בקערה.',
      'מוסיפים שמן, וניל ומעט מים — עד לבצק דביק.',
      'יוצרים כדורים קטנים ומגלגלים בקמח נוסף.',
      'אופים בתנור ב-175°C כ-12 דקות.',
      'מקררים מעט ומגישים כקינוח פרווה.',
    ],
    calories: 190,
    protein: 3,
    carbs: 28,
    fat: 8,
    spiceLevel: 0,
    healthScore: 55,
    tags: ['comfortFood', 'vegetarian'],
  },
}

const DESSERT_MOCK_BY_CATEGORY_EN = {
  dairy: {
    name: 'Cheesecake Dessert',
    ingredients: ['cream cheese', 'sugar', 'eggs', 'vanilla', 'butter', 'cookies', 'sugar', 'vanilla'],
    steps: [
      'Crush cookies and mix with melted butter; press into a pan.',
      'Beat cream cheese, sugar, eggs, and vanilla until smooth.',
      'Pour over the crust and chill for at least 4 hours.',
      'Top with berries or fruit sauce before serving.',
      'Serve cold and sweet.',
    ],
    calories: 420,
    protein: 9,
    carbs: 38,
    fat: 26,
    spiceLevel: 0,
    healthScore: 58,
    tags: ['comfortFood'],
  },
  meat: {
    name: 'Honey Baked Apples',
    ingredients: ['apples', 'honey', 'cinnamon', 'lemon', 'sugar', 'vanilla'],
    steps: [
      'Halve apples and remove cores.',
      'Mix honey, cinnamon, lemon juice, and sugar.',
      'Arrange apples in a baking dish and pour the mixture over.',
      'Bake at 350°F (180°C) for about 25 minutes until tender.',
      'Serve warm as a parve dessert after a meat meal.',
    ],
    calories: 280,
    protein: 2,
    carbs: 52,
    fat: 8,
    spiceLevel: 0,
    healthScore: 70,
    tags: ['healthy'],
  },
  parve: {
    name: 'Quick Chocolate Cookies',
    ingredients: ['flour', 'sugar', 'cocoa powder', 'oil', 'vanilla', 'baking powder', 'sugar', 'vanilla'],
    steps: [
      'Whisk flour, sugar, cocoa, and baking powder in a bowl.',
      'Add oil, vanilla, and a little water until a sticky dough forms.',
      'Roll small balls and coat lightly in extra flour.',
      'Bake at 350°F (175°C) for about 12 minutes.',
      'Cool slightly and serve as a parve dessert.',
    ],
    calories: 190,
    protein: 3,
    carbs: 28,
    fat: 8,
    spiceLevel: 0,
    healthScore: 55,
    tags: ['comfortFood', 'vegetarian'],
  },
}

function getDessertMockTemplate(category, language = 'he') {
  const source = language === 'en' ? DESSERT_MOCK_BY_CATEGORY_EN : DESSERT_MOCK_BY_CATEGORY
  return source[category] ?? source.parve
}

function parseIngredients(input) {
  return input
    .split(/[,;\n]+/)
    .map((item) => normalizeIngredient(item))
    .filter(Boolean)
}

function localizeTemplate(template, language = 'he') {
  if (language === 'en') return template
  const locale = TEMPLATE_LOCALE_HE[template.id]
  if (!locale) return template
  return {
    ...template,
    name: locale.name,
    description: locale.description,
    stepTemplates: locale.stepTemplates,
  }
}

function getTemplateIngredients(template) {
  return [...template.baseIngredients, ...(template.optionalIngredients ?? [])]
}

function countIngredientMatches(userIngredients, template) {
  const recipeIngredients = getTemplateIngredients(template)
  if (userIngredients.length === 0) {
    return { matched: [], missing: recipeIngredients, ratio: 0.35, userRatio: 0.35 }
  }

  const matched = []
  const matchedUser = new Set()

  for (const recipeIng of template.baseIngredients) {
    const hit = userIngredients.find(
      (userIng) => !matchedUser.has(userIng) && ingredientsMatch(userIng, recipeIng),
    )
    if (hit) {
      matched.push(recipeIng)
      matchedUser.add(hit)
    }
  }

  for (const recipeIng of template.optionalIngredients ?? []) {
    const hit = userIngredients.find(
      (userIng) => !matchedUser.has(userIng) && ingredientsMatch(userIng, recipeIng),
    )
    if (hit) {
      matched.push(recipeIng)
      matchedUser.add(hit)
    }
  }

  const baseRatio = matched.length / Math.max(template.baseIngredients.length, 1)
  const userRatio = matchedUser.size / userIngredients.length
  const missing = template.baseIngredients.filter(
    (ing) => !matched.some((m) => ingredientsMatch(m, ing)),
  )

  return { matched, missing, ratio: baseRatio, userRatio }
}

function scoreTimeFit(template, availableTime) {
  if (availableTime >= template.minTime && availableTime <= template.maxTime) {
    const distance = Math.abs(availableTime - template.idealTime)
    const range = template.maxTime - template.minTime || 1
    return 1 - (distance / range) * 0.35
  }

  if (availableTime < template.minTime) {
    return Math.max(0.15, (availableTime / template.minTime) * 0.55)
  }

  return Math.max(0.25, (template.maxTime / availableTime) * 0.65)
}

function scoreStyleFit(template, preferredStyles) {
  if (!preferredStyles.length) return 0.5
  const overlap = template.styles.filter((style) => preferredStyles.includes(style)).length
  return overlap / preferredStyles.length
}

function scoreMoodFit(template, mood) {
  return template.moods.includes(mood) ? 1 : 0.35
}

function scoreTemplate(template, userIngredients, time, mood, preferredStyles, glutenFree) {
  const workingTemplate = glutenFree ? adaptTemplateForGlutenFree(template) : template
  const { ratio, userRatio } = countIngredientMatches(userIngredients, workingTemplate)

  const ingredientScore = userIngredients.length
    ? userRatio * 0.65 + ratio * 0.25
    : 0.45

  const timeScore = scoreTimeFit(template, time)
  const moodScore = scoreMoodFit(template, mood)
  const styleScore = scoreStyleFit(template, preferredStyles)
  const glutenScore = scoreGlutenFreeFit(template, userIngredients, glutenFree)

  const base = userIngredients.length
    ? ingredientScore * 0.55 +
      timeScore * 0.15 +
      moodScore * 0.12 +
      styleScore * 0.1
    : ingredientScore * 0.36 +
      timeScore * 0.22 +
      moodScore * 0.16 +
      styleScore * 0.14

  return glutenFree ? base * 0.72 + glutenScore * 0.28 : base
}

function weightedRandomPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total

  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item
  }

  return items[items.length - 1]
}

function pickTemplate(category, userIngredients, time, mood, excludeKeys, glutenFree) {
  const templates = recipeTemplates[category] ?? recipeTemplates.parve
  const preferredStyles = inferPreferredStyles(mood, time)
  const eligible = glutenFree
    ? templates.filter(isTemplateGlutenFreeCompatible)
    : templates

  const scored = eligible
    .map((template, index) => ({
      template,
      index,
      templateKey: `${category}-${template.id}`,
      score: scoreTemplate(template, userIngredients, time, mood, preferredStyles, glutenFree),
      preferredStyles,
    }))
    .filter(({ templateKey }) => !excludeKeys.includes(templateKey))
    .sort((a, b) => b.score - a.score)

  let poolSource = scored

  if (userIngredients.length > 0) {
    const ingredientFocused = scored.filter(({ template }) => {
      const workingTemplate = glutenFree ? adaptTemplateForGlutenFree(template) : template
      return countIngredientMatches(userIngredients, workingTemplate).userRatio >= 0.35
    })
    if (ingredientFocused.length > 0) {
      poolSource = ingredientFocused
    }
  }

  const fallbackSource = eligible
    .map((template, index) => ({
      template,
      index,
      templateKey: `${category}-${template.id}`,
      score: 0.4,
      preferredStyles,
    }))
    .filter(({ templateKey }) => !excludeKeys.includes(templateKey))

  const pool = (
    poolSource.length
      ? poolSource
      : fallbackSource.length
        ? fallbackSource
        : eligible.map((template, index) => ({
            template,
            index,
            templateKey: `${category}-${template.id}`,
            score: 0.4,
            preferredStyles,
          }))
  ).slice(0, 5)

  const picked = weightedRandomPick(
    pool.map((item) => ({
      ...item,
      weight: item.score ** 2 + 0.08 + Math.random() * 0.12,
    })),
  )

  const primaryStyle =
    picked.template.styles.find((style) => picked.preferredStyles.includes(style)) ??
    picked.template.styles[0]

  return { ...picked, primaryStyle, preferredStyles }
}

function formatIngredient(name, language = 'he', glutenFree = false) {
  if (/[\u0590-\u05FF]/.test(name)) return name.trim()
  const canonical = canonicalIngredient(name) ?? name
  const resolved = glutenFree ? substituteIngredient(canonical, true, 'en') : canonical
  return getIngredientLabel(resolved, language)
}

function buildIngredientList(
  template,
  userIngredients,
  pantrySuffix,
  matchData,
  glutenFree,
  language = 'he',
) {
  if (userIngredients.length === 0) {
    const sourceTemplate = glutenFree ? adaptTemplateForGlutenFree(template) : template
    const list = [
      ...sourceTemplate.baseIngredients.map((ing) => formatIngredient(ing, language, glutenFree)),
    ]
    return glutenFree ? applyGlutenFreeToIngredientList(list, language) : list
  }

  const list = []
  const used = new Set()

  for (const ui of userIngredients) {
    if (glutenFree && isGlutenIngredient(ui)) continue
    used.add(ui)
    list.push(formatIngredient(ui, language, false))
  }

  const pantryStaples = ['water', 'salt', 'black pepper', 'olive oil', 'baking powder']
  for (const staple of pantryStaples) {
    if (!list.some((entry) => ingredientsMatch(entry, staple))) {
      list.push(formatIngredient(staple, language, false))
    }
  }

  const userHasVanilla = userIngredients.some(
    (ui) => ingredientsMatch(ui, 'vanilla') || canonicalIngredient(ui) === 'vanilla',
  )
  if (userHasVanilla && !list.some((entry) => ingredientsMatch(entry, 'vanilla'))) {
    list.push(formatIngredient('vanilla extract', language, false))
  }

  void template
  void pantrySuffix
  void matchData

  return glutenFree ? applyGlutenFreeToIngredientList(list, language) : list
}

function computeTimeVars(template, availableTime) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)))
  const scale = availableTime / template.idealTime

  return {
    pastaTime: clamp(8 * scale, 7, 12),
    pastaWater: scale < 0.85 ? '1/2' : '1/3',
    simmerTime: clamp(8 * scale, 5, 18),
    sauteTime: clamp(5 * scale, 3, 8),
    searTime: clamp(6 * scale, 4, 10),
    roastTime: clamp(18 * scale, 14, 28),
    bakeTime: clamp(20 * scale, 15, 30),
    braiseTime: clamp(45 * scale, 35, 75),
    vegTime: clamp(25 * scale, 18, 35),
    meatballTime: clamp(18 * scale, 12, 25),
    eggTime: clamp(6 * scale, 4, 8),
    glazeTime: clamp(4 * scale, 3, 6),
    flipTime: clamp(3 * scale, 2, 4),
  }
}

function pickStepIngredient(name, matchData, glutenFree, language) {
  const hit = matchData.matched.find((m) => ingredientsMatch(m, name))
  const base = hit ?? name
  return formatIngredient(base, language, glutenFree)
}

function fillStepTemplate(text, template, matchData, timeVars, glutenFree = false, language = 'he') {
  let step = text
  const staticLabel = (key) => getIngredientLabel(key, language)
  const replacements = {
    ...timeVars,
    pasta: pickStepIngredient('pasta', matchData, glutenFree, language),
    rice: pickStepIngredient('rice', matchData, glutenFree, language),
    chicken: pickStepIngredient('chicken', matchData, glutenFree, language),
    beef: pickStepIngredient('beef', matchData, glutenFree, language),
    steak: pickStepIngredient('steak', matchData, glutenFree, language),
    eggs: pickStepIngredient('eggs', matchData, glutenFree, language),
    garlic: pickStepIngredient('garlic', matchData, glutenFree, language),
    onion: pickStepIngredient('onion', matchData, glutenFree, language),
    tomato: pickStepIngredient('tomato', matchData, glutenFree, language),
    herbs: pickStepIngredient('herbs', matchData, glutenFree, language),
    butter: pickStepIngredient('butter', matchData, glutenFree, language),
    cream: pickStepIngredient('cream', matchData, glutenFree, language),
    parmesan: pickStepIngredient('parmesan', matchData, glutenFree, language),
    cheese: pickStepIngredient('cheese', matchData, glutenFree, language),
    lamb: pickStepIngredient('lamb', matchData, glutenFree, language),
    tofu: pickStepIngredient('tofu', matchData, glutenFree, language),
    broccoli: pickStepIngredient('broccoli', matchData, glutenFree, language),
    mushroom: pickStepIngredient('mushroom', matchData, glutenFree, language),
    spinach: pickStepIngredient('spinach', matchData, glutenFree, language),
    chickpeas: pickStepIngredient('chickpeas', matchData, glutenFree, language),
    lentils: pickStepIngredient('lentils', matchData, glutenFree, language),
    quinoa: pickStepIngredient('quinoa', matchData, glutenFree, language),
    tahini: pickStepIngredient('tahini', matchData, glutenFree, language),
    lemon: pickStepIngredient('lemon', matchData, glutenFree, language),
    lime: pickStepIngredient('lime', matchData, glutenFree, language),
    cilantro: pickStepIngredient('cilantro', matchData, glutenFree, language),
    parsley: pickStepIngredient('parsley', matchData, glutenFree, language),
    yogurt: pickStepIngredient('yogurt', matchData, glutenFree, language),
    honey: pickStepIngredient('honey', matchData, glutenFree, language),
    'soy sauce': pickStepIngredient('soy sauce', matchData, glutenFree, language),
    ginger: pickStepIngredient('ginger', matchData, glutenFree, language),
    chili: pickStepIngredient('chili', matchData, glutenFree, language),
    avocado: pickStepIngredient('avocado', matchData, glutenFree, language),
    tortilla: pickStepIngredient('tortilla', matchData, glutenFree, language),
    broth: pickStepIngredient('broth', matchData, glutenFree, language),
    ricotta: pickStepIngredient('ricotta', matchData, glutenFree, language),
    flour: pickStepIngredient('flour', matchData, glutenFree, language),
    milk: pickStepIngredient('milk', matchData, glutenFree, language),
    blueberries: pickStepIngredient('blueberries', matchData, glutenFree, language),
    feta: pickStepIngredient('feta', matchData, glutenFree, language),
    kale: pickStepIngredient('kale', matchData, glutenFree, language),
    'sweet potato': pickStepIngredient('sweet potato', matchData, glutenFree, language),
    'bell pepper': pickStepIngredient('bell pepper', matchData, glutenFree, language),
    'coconut milk': pickStepIngredient('coconut milk', matchData, glutenFree, language),
    'curry powder': pickStepIngredient('curry', matchData, glutenFree, language),
    cucumber: pickStepIngredient('cucumber', matchData, glutenFree, language),
    carrot: pickStepIngredient('carrot', matchData, glutenFree, language),
    potato: pickStepIngredient('potato', matchData, glutenFree, language),
    bread: pickStepIngredient('bread', matchData, glutenFree, language),
    'tomato paste': staticLabel('tomato paste'),
    cumin: staticLabel('cumin'),
    sesame: staticLabel('sesame seeds'),
    peas: staticLabel('peas'),
    corn: staticLabel('corn'),
    zucchini: staticLabel('zucchini'),
    spices: staticLabel('warm spices'),
    'pasta shells': pickStepIngredient('pasta shells', matchData, glutenFree, language),
    'olive oil': staticLabel('olive oil'),
  }

  for (const [key, value] of Object.entries(replacements)) {
    step = step.replaceAll(`{{${key}}}`, value)
  }

  return step.replace(/\{\{[^}]+\}\}/g, (token) => {
    const key = token.slice(2, -2)
    return formatIngredient(key, language, glutenFree)
  })
}

function buildSteps(template, matchData, availableTime, glutenFree, language = 'he') {
  const workingTemplate = glutenFree ? adaptTemplateForGlutenFree(template) : template
  const timeVars = computeTimeVars(template, availableTime)
  let steps = workingTemplate.stepTemplates.map((step) =>
    fillStepTemplate(step, workingTemplate, matchData, timeVars, glutenFree, language),
  )

  const copy = getRecipeCopy(language)

  if (glutenFree) {
    steps = steps.map((step) => applyGlutenFreeToText(step, language))
    if (getTemplateGlutenStatus(template) === 'adaptable') {
      steps.unshift(copy.gfStepNote)
    }
  }

  if (availableTime < template.minTime) {
    steps.unshift(`${copy.timeShortPrefix}${availableTime}${copy.timeShortSuffix}`)
  } else if (availableTime > template.idealTime + 15) {
    steps.push(copy.timeLongNote)
  }

  return steps
}

function buildDescription(
  template,
  { mood, primaryStyle, matchData, time, glutenFree, language = 'he' },
) {
  const copy = getRecipeCopy(language)
  const opener = copy.styleOpeners[primaryStyle] ?? copy.defaultOpener
  const moodPhrase = copy.moodFlavor[mood] ?? copy.defaultMood
  const matchedNames = matchData.matched
    .slice(0, 3)
    .map((name) => formatIngredient(name, language, glutenFree))
  const glutenStatus = getTemplateGlutenStatus(template)

  let tail = template.description
  if (matchedNames.length > 0) {
    tail += `${copy.highlightsPrefix}${matchedNames.join(copy.highlightsJoin)}${copy.highlightsSuffix}`
  }
  if (glutenFree && glutenStatus === 'adaptable') {
    tail += copy.gfAdapted
  } else if (glutenFree && glutenStatus === 'natural') {
    tail += copy.gfNatural
  }

  return `${opener}${copy.descriptionJoiner}${moodPhrase}${copy.descriptionMiddle}${time}${copy.descriptionMinutes}${tail}`
}

function deriveTags(template, category, nutrition, cookTime, primaryStyle) {
  const tags = new Set(template.tags ?? [])

  if (nutrition.protein >= RECIPE_TAGS.highProtein.minProtein) tags.add('highProtein')
  if (nutrition.healthScore >= RECIPE_TAGS.healthy.minHealthScore) tags.add('healthy')
  if (cookTime <= RECIPE_TAGS.quick.maxTime) tags.add('quick')
  if (RECIPE_TAGS.vegetarian.categories.includes(category)) tags.add('vegetarian')
  if (template.styles.includes('comfort') || primaryStyle === 'comfort') tags.add('comfortFood')

  return [...tags]
}

function computeNutrition(template, matchData, servings) {
  const base = {
    calories: template.calories,
    protein: template.protein,
    carbs: template.carbs,
    fat: template.fat,
    healthScore: template.healthScore,
  }

  const matchBoost = matchData.matched.length * 0.03
  const variance = 0.97 + Math.random() * 0.06

  for (const ing of matchData.matched) {
    const macros = getIngredientNutrition(ing)
    base.calories += macros.calories * 0.35
    base.protein += macros.protein * 0.35
    base.carbs += macros.carbs * 0.35
    base.fat += macros.fat * 0.35
  }

  const calories = Math.round(base.calories * variance)
  const protein = Math.round(base.protein * (1 + matchBoost) * variance)
  const carbs = Math.round(base.carbs * variance)
  const fat = Math.round(base.fat * variance)

  const macroBalance = protein * 4 + carbs * 4 + fat * 9
  const normalizedCalories = macroBalance > 0 ? Math.round(macroBalance) : calories

  let healthScore = base.healthScore
  if (protein >= 25) healthScore += 2
  if (fat > 30) healthScore -= 3
  if (template.styles.includes('healthy')) healthScore += 4
  if (template.spiceLevel >= 2) healthScore += 1
  healthScore = Math.min(98, Math.max(45, Math.round(healthScore + (Math.random() * 4 - 2))))

  return {
    calories: normalizedCalories,
    protein,
    carbs,
    fat,
    healthScore,
    servings,
  }
}

function computeMatchPercent(score, matchData, userIngredients, glutenFree, template) {
  const glutenBoost = glutenFree ? scoreGlutenFreeFit(template, userIngredients, true) * 12 : 0
  const glutenPenalty =
    glutenFree && userIngredients.some(isGlutenIngredient) ? -8 : 0

  if (userIngredients.length === 0) {
    return Math.min(
      88,
      Math.round(62 + score * 28 + glutenBoost + Math.random() * 6),
    )
  }

  const raw =
    score * 58 +
    matchData.ratio * 24 +
    matchData.userRatio * 12 +
    glutenBoost +
    glutenPenalty +
    Math.random() * 6

  return Math.min(99, Math.max(55, Math.round(raw)))
}

function finalizeRecipe(recipe, ingredientsRaw, language, meta = {}) {
  const { recipe: parsed } = applyRecipeIngredientParser(recipe, ingredientsRaw, language, {
    cookingTime: meta.cookingTime,
    style: meta.style,
    servings: meta.servings,
    recipeType: meta.recipeType ?? 'meal',
    category: meta.category ?? 'dairy',
  })
  return parsed
}

function hasUnusualIngredientCombo(userIngredients) {
  const canon = userIngredients.map((item) => canonicalIngredient(item)).filter(Boolean)
  const sweet = new Set(['honey', 'sugar', 'blueberries'])
  const protein = new Set(['chicken', 'beef', 'lamb', 'steak', 'salmon', 'tuna'])
  const hasSweet = canon.some((item) => sweet.has(item))
  const hasProtein = canon.some((item) => protein.has(item))
  return (hasSweet && hasProtein) || userIngredients.length >= 4
}

/**
 * Ingredient-first fallback when template/Gemini output fails relevance checks.
 */
export function buildIngredientFirstFallbackRecipe(
  {
    category,
    ingredients,
    cookingTime,
    mood,
    isGlutenFree = false,
    musicPlatform = 'spotify',
    servings = 4,
    recipeType = 'meal',
  },
  {
    language = 'he',
    pantrySuffix = '(from your pantry)',
    validation = null,
    excludeTitles = [],
    excludeCookingMethods = [],
    excludeDessertCategories = [],
  } = {},
) {
  const rawUserList = parseUserIngredients(ingredients)
  const filteredUserIngredients = isGlutenFree
    ? rawUserList.filter((item) => !isGlutenIngredient(normalizeIngredient(item)))
    : rawUserList

  const displayNames = filteredUserIngredients.map((item) =>
    formatIngredient(item, language, isGlutenFree),
  )

  const copy = getRecipeCopy(language)
  const moodPhrase = copy.moodFlavor[mood] ?? copy.defaultMood

  let mismatchNote = ''
  if (language === 'en') {
    if (validation?.unmatched?.length) {
      mismatchNote =
        ' The ingredient combo is not fully classic — the dish uses most of what you listed.'
    } else if (hasUnusualIngredientCombo(filteredUserIngredients)) {
      mismatchNote = ' A varied ingredient combo — built around what you have on hand.'
    } else if (filteredUserIngredients.length > 1) {
      mismatchNote = ' Built around the ingredients you listed.'
    }
  } else if (validation?.unmatched?.length) {
    mismatchNote =
      ' שילוב המרכיבים לא לגמרי קלאסי — המנה משתמשת ברוב מה שציינתם ומתאימה את השאר בצורה פשוטה.'
  } else if (hasUnusualIngredientCombo(filteredUserIngredients)) {
    mismatchNote =
      ' שילוב המרכיבים מגוון — המנה נבנתה סביב מה שיש לכם במטבח.'
  } else if (filteredUserIngredients.length > 1) {
    mismatchNote = ' המנה נבנתה סביב המרכיבים שציינתם.'
  }

  const ingredientList = [...displayNames]
  const finalIngredients = isGlutenFree
    ? applyGlutenFreeToIngredientList(ingredientList, language)
    : ingredientList

  const steps = buildStepsFromUserIngredients(finalIngredients, {
    recipeType,
    language,
    cookingTime,
  })

  const effectiveRecipeType = getEffectiveRecipeType(recipeType, category)
  const hasRegenerationConstraints =
    excludeTitles.length > 0 ||
    excludeCookingMethods.length > 0 ||
    excludeDessertCategories.length > 0

  let name
  let recipeSteps = steps
  if (effectiveRecipeType === 'dessert' && hasRegenerationConstraints) {
    const variant = pickAlternateDessertVariant({
      ingredients: finalIngredients,
      language,
      cookingTime,
      excludeTitles,
      excludeCookingMethods,
      excludeDessertCategories,
    })
    name = variant.name
    recipeSteps = variant.steps
  } else if (effectiveRecipeType === 'dessert') {
    name = buildDessertDishTitle(finalIngredients, { language }).name
  } else if (hasRegenerationConstraints) {
    const variant = pickAlternateMealVariant({
      ingredients: finalIngredients,
      language,
      cookingTime,
      excludeTitles,
      excludeCookingMethods,
    })
    name = variant.name
    recipeSteps = variant.steps
  } else if (category === 'meat') {
    name = buildTitleFromIngredients(finalIngredients, { language, recipeType: 'meal' })
  } else {
    name = buildDescriptiveDishTitle(finalIngredients, {
      cookingTime,
      steps: recipeSteps,
      style: 'quick',
      tags: cookingTime <= 25 ? ['quick'] : [],
      language,
    })
  }

  let description = buildChefIntro(finalIngredients, {
    chosenName: name,
    language,
    recipeType: effectiveRecipeType,
    cookingTime,
  })
  if (mismatchNote) {
    description += mismatchNote
  }

  const matchRatio =
    validation?.matchRatio ??
    (filteredUserIngredients.length ? 1 : 0.75)
  const matchPercentage = Math.min(99, Math.max(72, Math.round(matchRatio * 100)))

  const playlist = recommendPlaylist(
    { mood, category, style: 'quick', cookTime: cookingTime, spiceLevel: 1, recipeName: name },
    musicPlatform,
    language,
  )

  const recipe = {
    name,
    description,
    ingredients: finalIngredients,
    steps: recipeSteps,
    matchPercentage,
    spiceLevel: recipeType === 'dessert' ? 0 : category === 'parve' ? 1 : 0,
    optionalUpgrades: buildOptionalUpgrades(filteredUserIngredients, { language, recipeType }),
    nutrition: {
      calories: 360 + displayNames.length * 25,
      protein: 14 + displayNames.length * 2,
      carbs: 30 + displayNames.length * 3,
      fat: 16 + displayNames.length,
      servings,
    },
    healthScore: calculateHealthScoreFromRecipe({
      ingredients: finalIngredients,
      calories: 360 + displayNames.length * 25,
      protein: 14 + displayNames.length * 2,
      carbs: 30 + displayNames.length * 3,
      servings,
    }),
    tags: cookingTime <= 25 ? ['quick'] : ['comfortFood'],
    playlist,
  }

  const meta = {
    id: `ingredient-fallback-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    templateKey: 'ingredient-fallback',
    category,
    mood,
    cookingTime,
    isGlutenFree,
    musicPlatform,
    language,
    style: 'quick',
    cookTime: cookingTime,
  }

  return {
    recipe: finalizeRecipe(recipe, ingredients, language, {
      cookingTime,
      style: 'quick',
      servings,
      recipeType: effectiveRecipeType,
      category,
    }),
    meta,
  }
}

function buildDessertMockRecipe(
  {
    category,
    ingredients,
    cookingTime,
    mood,
    isGlutenFree = false,
    musicPlatform = 'spotify',
    servings = 4,
  },
  { language = 'he', pantrySuffix = '(from your pantry)', validation = null, excludeTitles = [], excludeCookingMethods = [], excludeDessertCategories = [] } = {},
) {
  if (isInvalidRecipeSelection('dessert', category)) {
    return buildMockRecipe(
      {
        category,
        ingredients,
        cookingTime,
        mood,
        isGlutenFree,
        musicPlatform,
        servings,
        recipeType: 'meal',
      },
      { language, pantrySuffix, validation, excludeTitles, excludeCookingMethods, excludeDessertCategories },
    )
  }

  const rawUserList = parseUserIngredients(ingredients)
  if (rawUserList.length > 0) {
    return buildIngredientFirstFallbackRecipe(
      {
        category,
        ingredients,
        cookingTime,
        mood,
        isGlutenFree,
        musicPlatform,
        servings,
        recipeType: 'dessert',
      },
      {
        language,
        pantrySuffix,
        validation,
        excludeTitles,
        excludeCookingMethods,
        excludeDessertCategories,
      },
    )
  }

  const template = getDessertMockTemplate(category, language)
  const cookTime = Math.min(cookingTime, 45)
  const copy = getRecipeCopy(language)
  const moodPhrase = copy.moodFlavor[mood] ?? copy.defaultMood
  const description =
    language === 'en'
      ? `A dessert tailored with${copy.descriptionJoiner}${moodPhrase}${copy.descriptionMiddle}${cookTime}${copy.descriptionMinutes}`
      : `קינוח מותאם${copy.descriptionJoiner}${moodPhrase}${copy.descriptionMiddle}${cookTime}${copy.descriptionMinutes}`

  const playlist = recommendPlaylist(
    { mood, category, style: 'comfort', cookTime, spiceLevel: 0, recipeName: template.name },
    musicPlatform,
    language,
  )

  const recipe = {
    name: template.name,
    description,
    ingredients: template.ingredients,
    steps: template.steps,
    matchPercentage: Math.min(94, Math.max(72, Math.round(72 + Math.random() * 22))),
    spiceLevel: 0,
    nutrition: {
      calories: template.calories,
      protein: template.protein,
      carbs: template.carbs,
      fat: template.fat,
      servings,
    },
    healthScore: template.healthScore,
    tags: template.tags,
    playlist,
  }

  const meta = {
    id: `dessert-mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    templateKey: `dessert-mock-${category}`,
    category,
    mood,
    cookingTime,
    isGlutenFree,
    musicPlatform,
    language,
    style: 'comfort',
    cookTime,
  }

  return {
    recipe: finalizeRecipe(recipe, ingredients, language, {
      cookingTime,
      style: 'comfort',
      servings,
      recipeType: 'dessert',
      category,
    }),
    meta,
  }
}

/**
 * Mock recipe provider — template-based generation for local MVP.
 * Replace the caller in recipeService when wiring a real AI backend.
 */
export function buildMockRecipe(
  {
    category,
    ingredients,
    cookingTime,
    mood,
    isGlutenFree = false,
    musicPlatform = 'spotify',
    servings = 4,
    recipeType = 'meal',
  },
  {
    language = 'he',
    pantrySuffix = '(from your pantry)',
    excludeTemplateKeys = [],
    excludeTitles = [],
    excludeCookingMethods = [],
    excludeDessertCategories = [],
  } = {},
) {
  const effectiveRecipeType = getEffectiveRecipeType(recipeType, category)

  if (effectiveRecipeType === 'dessert') {
    return buildDessertMockRecipe(
      { category, ingredients, cookingTime, mood, isGlutenFree, musicPlatform, servings },
      {
        language,
        pantrySuffix,
        excludeTitles,
        excludeCookingMethods,
        excludeDessertCategories,
      },
    )
  }

  const time = cookingTime
  const glutenFree = isGlutenFree
  const excludeKeys = excludeTemplateKeys

  const rawUserListEarly = parseUserIngredients(ingredients)
  const hasRegenerationConstraints =
    excludeTitles.length > 0 ||
    excludeCookingMethods.length > 0 ||
    excludeDessertCategories.length > 0
  if (rawUserListEarly.length > 0 && hasRegenerationConstraints) {
    return buildIngredientFirstFallbackRecipe(
      {
        category,
        ingredients,
        cookingTime: time,
        mood,
        isGlutenFree: glutenFree,
        musicPlatform,
        servings,
        recipeType,
      },
      {
        language,
        pantrySuffix,
        excludeTitles,
        excludeCookingMethods,
        excludeDessertCategories,
      },
    )
  }

  const userIngredients = parseIngredients(ingredients)
  const filteredUserIngredients = glutenFree
    ? sanitizeUserIngredientsForGlutenFree(userIngredients)
    : userIngredients

  const { template, templateKey, primaryStyle, score } = pickTemplate(
    category,
    filteredUserIngredients,
    time,
    mood,
    excludeKeys,
    glutenFree,
  )

  const localizedTemplate = localizeTemplate(template, language)
  const workingTemplate = glutenFree ? adaptTemplateForGlutenFree(template) : template
  const matchData = countIngredientMatches(filteredUserIngredients, workingTemplate)
  const cookTime = Math.min(time, Math.max(template.minTime, template.idealTime))
  const nutrition = computeNutrition(workingTemplate, matchData, servings)
  const tags = deriveTags(template, category, nutrition, cookTime, primaryStyle)
  const matchPercentage = computeMatchPercent(
    score,
    matchData,
    userIngredients,
    glutenFree,
    template,
  )

  const playlist = recommendPlaylist(
    {
      mood,
      category,
      style: primaryStyle,
      cookTime,
      spiceLevel: template.spiceLevel,
      recipeName: localizedTemplate.name,
    },
    musicPlatform,
    language,
  )

  const recipe = {
    name: localizedTemplate.name,
    description: buildDescription(localizedTemplate, {
      mood,
      primaryStyle,
      matchData,
      time: cookTime,
      glutenFree,
      language,
    }),
    ingredients: buildIngredientList(
      template,
      filteredUserIngredients,
      pantrySuffix,
      matchData,
      glutenFree,
      language,
    ),
    steps: buildSteps(localizedTemplate, matchData, time, glutenFree, language),
    matchPercentage,
    spiceLevel: template.spiceLevel,
    nutrition: {
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      servings,
    },
    healthScore: nutrition.healthScore,
    tags,
    playlist,
  }

  const rawUserList = parseUserIngredients(ingredients)
  if (rawUserList.length > 0) {
    let relevance = validateRecipeRelevance(rawUserList, recipe)
    if (!relevance.ok) {
      return buildIngredientFirstFallbackRecipe(
        {
          category,
          ingredients,
          cookingTime: time,
          mood,
          isGlutenFree: glutenFree,
          musicPlatform,
          servings,
          recipeType,
        },
        {
          language,
          pantrySuffix,
          validation: relevance,
          excludeTitles,
          excludeCookingMethods,
          excludeDessertCategories,
        },
      )
    }
  }

  const meta = {
    id: `${templateKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    templateKey,
    category,
    mood,
    cookingTime: time,
    isGlutenFree: glutenFree,
    musicPlatform,
    language,
    style: primaryStyle,
    cookTime,
  }

  return {
    recipe: finalizeRecipe(recipe, ingredients, language, {
      cookingTime: time,
      style: primaryStyle,
      servings,
      recipeType: 'meal',
      category,
    }),
    meta,
  }
}
