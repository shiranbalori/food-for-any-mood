/**
 * Real-world meal recipe construction for ingredient-based fallback.
 * User ingredients stay primary; basic pantry staples are marked clearly.
 */

import { canonicalIngredient, ingredientsMatch } from '../data/ingredientKnowledge'
import { getIngredientLabel } from '../data/ingredientLabels'
import { applyRecipeQuantities } from './recipeQuantities'
import { ensureRecipeCookingEssentials } from './recipeCookingEssentials'
import { parseUserIngredients } from './ingredientRelevance'
import {
  scoreDessertPattern as scoreMealPattern,
} from './dessertRecipeBuilder'
import {
  getBestRankedPattern,
  rankRealisticPatterns,
} from './recipePatternEngine'

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

function isExcludedMealTitle(pattern, language, excludeTitles = []) {
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

/** @type {import('./dessertRecipeBuilder').RealisticDessertPattern[]} */
export const REALISTIC_MEAL_PATTERNS = [
  {
    id: 'dairy_savory_cheese_pancakes',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    preferred: ['cheese'],
    supportive: ['egg'],
    selectionPriority: 24,
    nameHe: 'לביבות גבינה',
    nameEn: 'Savory Cheese Pancakes',
    userQuantities: {
      flour: { he: '150 גרם קמח', en: '150 g flour' },
      cheese: { he: '200 גרם גבינה', en: '200 g cheese' },
      milk: { he: '120 מ"ל חלב', en: '120 ml milk' },
    },
    pantryStaples: [
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'baking powder', he: '1 כפית אבקת אפייה', en: '1 tsp baking powder' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'מגרדים גבינה לקערה גדולה.',
      'מערבבים קמח, אבקת אפייה, מלח ופלפל.',
      'מוסיפים חלב וביצים לגבינה ומערבבים עד לבלילה אחידה.',
      'מחברים תערובות יבשות ורטובות עד לבלילה סמיכה.',
      `מחממים מחבת עם חמאה על אש בינונית ומטגנים לביבות ${Math.max(10, Math.round(cook / 2))} דקות מכל צד עד הזהבה והיציבות.`,
      'מגישים חם.',
    ],
    stepsEn: (cook) => [
      'Grate cheese into a large bowl.',
      'Whisk flour, baking powder, salt, and pepper.',
      'Add milk and eggs to the cheese and mix until smooth.',
      'Combine wet and dry mixtures into a thick batter.',
      `Warm a pan with butter over medium heat and fry pancakes about ${Math.max(10, Math.round(cook / 2))} minutes per side until golden and set.`,
      'Serve hot.',
    ],
  },
  {
    id: 'dairy_cheese_fritters',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    preferred: ['cheese'],
    selectionPriority: 20,
    nameHe: 'כדורי גבינה מטוגנים',
    nameEn: 'Fried Cheese Balls',
    userQuantities: {
      flour: { he: '120 גרם קמח', en: '120 g flour' },
      cheese: { he: '250 גרם גבינה', en: '250 g cheese' },
      milk: { he: '80 מ"ל חלב', en: '80 ml milk' },
    },
    pantryStaples: [
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'butter', he: '3 כפות חמאה', en: '3 tbsp butter' },
      { canon: 'baking powder', he: '1 כפית אבקת אפייה', en: '1 tsp baking powder' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'מגרדים גבינה ומערבבים עם קמח, אבקת אפייה, מלח ופלפל.',
      'מוסיפים חלב וביצים ומערבבים עד לתערובת סמיכה.',
      'מחממים שמן וחמאה במחבת על אש בינונית-גבוהה.',
      `מעצבים כדורי גבינה קטנים, מטגנים ${Math.max(8, Math.round(cook / 2))} דקות מכל צד עד פריך וזהוב.`,
      'מניחים על נייר ספיגה לרגע, מגישים חם.',
    ],
    stepsEn: (cook) => [
      'Grate cheese and mix with flour, baking powder, salt, and pepper.',
      'Add milk and eggs; stir until a thick batter forms.',
      'Heat oil and butter in a pan over medium-high heat.',
      `Shape fritters and fry about ${Math.max(8, Math.round(cook / 2))} minutes per side until crisp and golden.`,
      'Drain briefly on paper towels and serve hot.',
    ],
  },
  {
    id: 'dairy_cheese_skillet_crepes',
    required: new Set(['flour', 'cheese', 'milk']),
    category: 'dairy',
    preferred: ['milk'],
    selectionPriority: 16,
    nameHe: 'חביתת גבינה במחבת',
    nameEn: 'Cheese Skillet Crepes',
    userQuantities: {
      flour: { he: '180 גרם קמח', en: '180 g flour' },
      cheese: { he: '180 גרם גבינה', en: '180 g cheese' },
      milk: { he: '250 מ"ל חלב', en: '250 ml milk' },
    },
    pantryStaples: [
      { canon: 'egg', he: '3 ביצים', en: '3 eggs' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'מערבבים קמח, מלח ופלפל בקערה.',
      'מוסיפים חלב וביצים ומקציפים עד לבלילה חלקה.',
      'מחממים מחבת עם חמאה על אש בינונית.',
      `יוצקים בלילה דקה, מפזרים גבינה מגורדת ומטגנים ${Math.max(10, Math.round(cook / 2))} דקות עד שהחביתה יציבה וזהובה.`,
      'קופפים בזהירות, מגישים חם.',
    ],
    stepsEn: (cook) => [
      'Whisk flour, salt, and pepper in a bowl.',
      'Add milk and eggs; whisk until smooth.',
      'Warm a pan with butter over medium heat.',
      `Pour a thin layer of batter, scatter grated cheese, and cook about ${Math.max(10, Math.round(cook / 2))} minutes until set and golden.`,
      'Fold carefully and serve hot.',
    ],
  },
  {
    id: 'dairy_tomato_egg_skillet',
    required: new Set(['tomato', 'egg']),
    category: 'dairy',
    variationGroup: 'egg_tomato',
    cookingMethod: 'poached',
    selectionPriority: 26,
    nameHe: 'שקשוקה עם גבינה',
    nameEn: 'Cheese Shakshuka',
    userQuantities: {
      tomato: { he: '3 עגבניות', en: '3 tomatoes' },
      egg: { he: '4 ביצים', en: '4 eggs' },
    },
    pantryStaples: [
      { canon: 'cheese', he: '150 גרם גבינה', en: '150 g cheese' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'קוצצים בצל ועגבניות.',
      'מחממים מחבת עם שמן וחמאה ומטגנים בצל עד שקוף.',
      'מוסיפים עגבניות, מלח ופלפל ומבשלים על אש בינונית עד רוטב סמיך.',
      `שוברים ביצים לתוך הרוטב, מפזרים גבינה, מכסים ומבשלים ${Math.max(8, Math.round(cook / 2))} דקות עד שהביצים מתייצבות.`,
      'מגישים חם ישר מהמחבת.',
    ],
    stepsEn: (cook) => [
      'Chop the onion and tomatoes.',
      'Warm a skillet with oil and butter; sauté the onion until translucent.',
      'Add tomatoes, salt, and pepper; simmer until saucy.',
      `Crack eggs into the sauce, scatter cheese, cover, and cook about ${Math.max(8, Math.round(cook / 2))} minutes until set.`,
      'Serve hot straight from the skillet.',
    ],
  },
  {
    id: 'dairy_tomato_egg_omelette',
    required: new Set(['tomato', 'egg']),
    category: 'dairy',
    variationGroup: 'egg_tomato',
    cookingMethod: 'fried',
    selectionPriority: 24,
    nameHe: 'חביתת עגבניות וגבינה',
    nameEn: 'Tomato and Cheese Omelette',
    userQuantities: {
      tomato: { he: '2 עגבניות', en: '2 tomatoes' },
      egg: { he: '4 ביצים', en: '4 eggs' },
    },
    pantryStaples: [
      { canon: 'cheese', he: '100 גרם גבינה', en: '100 g cheese' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'onion', he: '1/2 בצל', en: '1/2 onion' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'קוצצים עגבניות ובצל.',
      'מקציפים ביצים עם מלח ופלפל.',
      'מחממים מחבת עם חמאה, מטגנים בצל ועגבניות דקות ספורות.',
      `יוצקים את הביצים, מפזרים גבינה ומכסים ${Math.max(6, Math.round(cook / 3))} דקות עד שהחביתה מתייצבת.`,
      'קופפים בזהירות ומגישים חם.',
    ],
    stepsEn: (cook) => [
      'Chop tomatoes and onion.',
      'Whisk eggs with salt and pepper.',
      'Melt butter in a pan; briefly sauté onion and tomatoes.',
      `Pour in eggs, scatter cheese, cover, and cook about ${Math.max(6, Math.round(cook / 3))} minutes until set.`,
      'Fold carefully and serve hot.',
    ],
  },
  {
    id: 'dairy_baked_eggs_tomato',
    required: new Set(['tomato', 'egg']),
    category: 'dairy',
    variationGroup: 'egg_tomato',
    cookingMethod: 'baked',
    selectionPriority: 22,
    nameHe: 'ביצים אפויות עם עגבניות וגבינה',
    nameEn: 'Baked Eggs with Tomatoes and Cheese',
    userQuantities: {
      tomato: { he: '3 עגבניות', en: '3 tomatoes' },
      egg: { he: '4 ביצים', en: '4 eggs' },
    },
    pantryStaples: [
      { canon: 'cheese', he: '150 גרם גבינה', en: '150 g cheese' },
      { canon: 'cream', he: '3 כפות שמנת', en: '3 tbsp cream' },
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-190 מעלות.',
      'קוצצים בצל ועגבניות ומסדרים בתבנית עם שמן, מלח וגבינה.',
      'שוברים ביצים בין העגבניות ומוסיפים כף שמנת על כל ביצה.',
      `אופים ${Math.max(12, Math.round(bake * 0.6))} דקות עד שהחלבון מתייצב.`,
      'מגישים חם ישר מהתבנית.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 190°C.',
      'Chop onion and tomatoes; arrange in a baking dish with oil, salt, and cheese.',
      'Crack eggs between the tomatoes and add a spoonful of cream to each.',
      `Bake about ${Math.max(12, Math.round(bake * 0.6))} minutes until the whites are set.`,
      'Serve hot from the dish.',
    ],
  },
  {
    id: 'parve_shakshuka',
    required: new Set(['tomato', 'egg']),
    category: 'parve',
    variationGroup: 'egg_tomato',
    cookingMethod: 'poached',
    selectionPriority: 25,
    nameHe: 'שקשוקה',
    nameEn: 'Shakshuka',
    userQuantities: {
      tomato: { he: '4 עגבניות', en: '4 tomatoes' },
      egg: { he: '4 ביצים', en: '4 eggs' },
    },
    pantryStaples: [
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'garlic', he: '2 שיני שום', en: '2 garlic cloves' },
      { canon: 'oil', he: '3 כפות שמן', en: '3 tbsp oil' },
      { canon: 'paprika', he: '1 כפית פפריקה', en: '1 tsp paprika' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'קוצצים בצל, שום ועגבניות.',
      'מחממים שמן במחבת ומטגנים בצל ושום עד רכות.',
      'מוסיפים עגבניות, פפריקה, מלח ופלפל ומבשלים עד רוטב סמיך.',
      `שוברים ביצים לתוך הרוטב, מכסים ומבשלים ${Math.max(8, Math.round(cook / 2))} דקות.`,
      'מגישים חם עם לחם.',
    ],
    stepsEn: (cook) => [
      'Chop onion, garlic, and tomatoes.',
      'Warm oil in a skillet; sauté onion and garlic until soft.',
      'Add tomatoes, paprika, salt, and pepper; simmer until thickened.',
      `Crack eggs into the sauce, cover, and cook about ${Math.max(8, Math.round(cook / 2))} minutes.`,
      'Serve hot with bread.',
    ],
  },
  {
    id: 'parve_tomato_egg_omelette',
    required: new Set(['tomato', 'egg']),
    category: 'parve',
    variationGroup: 'egg_tomato',
    cookingMethod: 'fried',
    selectionPriority: 24,
    nameHe: 'חביתת עגבניות',
    nameEn: 'Tomato Omelette',
    userQuantities: {
      tomato: { he: '3 עגבניות', en: '3 tomatoes' },
      egg: { he: '4 ביצים', en: '4 eggs' },
    },
    pantryStaples: [
      { canon: 'onion', he: '1/2 בצל', en: '1/2 onion' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'קוצצים עגבניות ובצל.',
      'מקציפים ביצים עם מלח ופלפל.',
      'מחממים שמן במחבת, מטגנים בצל ועגבניות דקות ספורות.',
      `יוצקים את הביצים, מכסים ומבשלים ${Math.max(6, Math.round(cook / 3))} דקות עד שהחביתה מתייצבת.`,
      'קופפים בזהירות ומגישים חם.',
    ],
    stepsEn: (cook) => [
      'Chop tomatoes and onion.',
      'Whisk eggs with salt and pepper.',
      'Warm oil in a pan; briefly sauté onion and tomatoes.',
      `Pour in eggs, cover, and cook about ${Math.max(6, Math.round(cook / 3))} minutes until set.`,
      'Fold carefully and serve hot.',
    ],
  },
  {
    id: 'parve_baked_eggs_tomato',
    required: new Set(['tomato', 'egg']),
    category: 'parve',
    variationGroup: 'egg_tomato',
    cookingMethod: 'baked',
    selectionPriority: 23,
    nameHe: 'ביצים אפויות עם עגבניות',
    nameEn: 'Baked Eggs with Tomatoes',
    userQuantities: {
      tomato: { he: '4 עגבניות', en: '4 tomatoes' },
      egg: { he: '4 ביצים', en: '4 eggs' },
    },
    pantryStaples: [
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (bake) => [
      'מחממים תנור ל-190 מעלות.',
      'קוצצים בצל ועגבניות ומסדרים בתבנית עם שמן, מלח ופלפל.',
      `שוברים ביצים בין העגבניות ואופים ${Math.max(12, Math.round(bake * 0.6))} דקות עד שהחלבון מתייצב.`,
      'מניחים 2 דקות, מתבלים לפי הצורך ומגישים חם.',
    ],
    stepsEn: (bake) => [
      'Preheat the oven to 190°C.',
      'Chop onion and tomatoes; arrange in a baking dish with oil, salt, and pepper.',
      `Crack eggs between the tomatoes and bake about ${Math.max(12, Math.round(bake * 0.6))} minutes until the whites are set.`,
      'Rest 2 minutes, adjust seasoning, and serve hot.',
    ],
  },
  {
    id: 'dairy_flour_tomato_crepes',
    required: new Set(['flour', 'tomato']),
    category: 'dairy',
    preferred: ['cheese'],
    selectionPriority: 22,
    nameHe: 'קרפ מלוח בגבינה ועגבניות',
    nameEn: 'Savory Cheese and Tomato Crepes',
    userQuantities: {
      flour: { he: '150 גרם קמח', en: '150 g flour' },
      tomato: { he: '2 עגבניות', en: '2 tomatoes' },
    },
    pantryStaples: [
      { canon: 'cheese', he: '150 גרם גבינה', en: '150 g cheese' },
      { canon: 'milk', he: '200 מ"ל חלב', en: '200 ml milk' },
      { canon: 'egg', he: '2 ביצים', en: '2 eggs' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (cook) => [
      'קוצצים עגבניות ומגרדים גבינה.',
      'מערבבים קמח, מלח, חלב וביצים לבלילה חלקה.',
      'מחממים מחבת עם חמאה ומטגנים קרפים דקים משני הצדדים.',
      `ממלאים כל קרפ בגבינה ועגבניות, מחממים שוב ${Math.max(8, Math.round(cook / 3))} דקות עד שהגבינה נמסה.`,
      'מגישים חם.',
    ],
    stepsEn: (cook) => [
      'Slice tomatoes and grate cheese.',
      'Whisk flour, salt, milk, and eggs into a smooth batter.',
      'Cook thin crepes in a buttered pan on both sides.',
      `Fill each crepe with cheese and tomatoes; warm ${Math.max(8, Math.round(cook / 3))} minutes until cheese melts.`,
      'Serve hot.',
    ],
  },
  {
    id: 'meat_tomato_rice_skillet',
    required: new Set(['tomato', 'rice']),
    category: 'meat',
    variationGroup: 'meat_tomato_rice',
    cookingMethod: 'fried',
    selectionPriority: 23,
    nameHe: 'תבשיל אורז עם עגבניות ועוף',
    nameEn: 'Tomato Rice with Chicken',
    userQuantities: {
      tomato: { he: '3 עגבניות', en: '3 tomatoes' },
      rice: { he: '1 כוס אורז', en: '1 cup rice' },
    },
    pantryStaples: [
      { canon: 'chicken', he: '400 גרם עוף חתוך', en: '400 g diced chicken' },
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (cook) => [
      'מחממים שמן בסיר ומטגנים בצל ועוף עד הזהבה.',
      'מוסיפים עגבניות קצוצות ומבשלים עד רוטב סמיך.',
      'מוסיפים אורז ומים, מרתיחים ומכסים.',
      `מבשלים על אש נמוכה ${Math.max(15, Math.round(cook * 0.7))} דקות עד שהאורז רך, מתבלים ומגישים חם.`,
    ],
    stepsEn: (cook) => [
      'Brown onion and chicken in oiled pot.',
      'Add chopped tomatoes and cook until saucy.',
      'Add rice and water, bring to a boil, and cover.',
      `Simmer about ${Math.max(15, Math.round(cook * 0.7))} minutes until rice is tender.`,
      'Season and serve hot.',
    ],
  },
  {
    id: 'meat_tomato_rice_pilaf',
    required: new Set(['tomato', 'rice']),
    category: 'meat',
    variationGroup: 'meat_tomato_rice',
    cookingMethod: 'boiled',
    selectionPriority: 21,
    nameHe: 'פילאף אורז עם עוף ועגבניות',
    nameEn: 'Chicken Tomato Rice Pilaf',
    userQuantities: {
      tomato: { he: '2 עגבניות', en: '2 tomatoes' },
      rice: { he: '1.5 כוסות אורז', en: '1.5 cups rice' },
    },
    pantryStaples: [
      { canon: 'chicken', he: '350 גרם חזה עוף', en: '350 g chicken breast' },
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'garlic', he: '2 שיני שום', en: '2 garlic cloves' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (cook) => [
      'חותכים עוף, בצל, שום ועגבניות.',
      'מחממים שמן בסיר, מטגנים עוף ובצל עד הזהבה.',
      'מוסיפים אורז, עגבניות, שום, מים ומלח.',
      `מבשלים על אש נמוכה ${Math.max(18, Math.round(cook * 0.75))} דקות עד שהאורז רך.`,
      'מניחים 5 דקות, מפרקים ומגישים.',
    ],
    stepsEn: (cook) => [
      'Dice chicken, onion, garlic, and tomatoes.',
      'Brown chicken and onion in oiled pot.',
      'Add rice, tomatoes, garlic, water, and salt.',
      `Simmer about ${Math.max(18, Math.round(cook * 0.75))} minutes until rice is tender.`,
      'Rest 5 minutes, fluff, and serve.',
    ],
  },
  {
    id: 'parve_tomato_rice',
    required: new Set(['tomato', 'rice']),
    category: 'parve',
    selectionPriority: 21,
    nameHe: 'אורז עם עגבניות',
    nameEn: 'Tomato Rice',
    userQuantities: {
      tomato: { he: '3 עגבניות', en: '3 tomatoes' },
      rice: { he: '1 כוס אורז', en: '1 cup rice' },
    },
    pantryStaples: [
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (cook) => [
      'מחממים שמן בסיר ומטגנים בצל עד שקוף.',
      'מוסיפים עגבניות קצוצות ומבשלים מעט.',
      'מוסיפים אורז, מים ומלח, מרתיחים ומכסים.',
      `מבשלים ${Math.max(15, Math.round(cook * 0.7))} דקות עד שהאורז רך.`,
      'מגישים חם.',
    ],
    stepsEn: (cook) => [
      'Sauté onion in oil until translucent.',
      'Add chopped tomatoes and cook briefly.',
      'Add rice, water, and salt; boil and cover.',
      `Simmer about ${Math.max(15, Math.round(cook * 0.7))} minutes until tender.`,
      'Serve hot.',
    ],
  },
  {
    id: 'parve_roasted_potatoes_caramelized_onion',
    required: new Set(['potato', 'onion']),
    category: 'parve',
    selectionPriority: 27,
    nameHe: 'תפוחי אדמה אפויים עם בצל מקורמל',
    nameEn: 'Roasted Potatoes with Caramelized Onions',
    userQuantities: {
      potato: { he: '4 תפוחי אדמה', en: '4 potatoes' },
      onion: { he: '2 בצלים', en: '2 onions' },
    },
    pantryStaples: [
      { canon: 'oil', he: '3 כפות שמן', en: '3 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
      { canon: 'thyme', he: '1/2 כפית טימין', en: '1/2 tsp thyme' },
    ],
    stepsHe: (cook) => [
      'קוצצים תפוחי אדמה לקוביות ובצל לפרוסות דקות.',
      'מחממים תנור ל-200 מעלות ומסדרים תפוחי אדמה וחצי מהבצל בתבנית עם שמן, מלח ופלפל.',
      `אופים ${Math.max(15, Math.round(cook * 0.6))} דקות, מוסיפים את שאר הבצל וממשיכים ${Math.max(10, Math.round(cook * 0.4))} דקות עד הזהבה.`,
      'מתבלים בטימין, מערבבים ומגישים חם.',
    ],
    stepsEn: (cook) => [
      'Dice potatoes and slice onions thinly.',
      'Preheat the oven to 200°C; toss potatoes and half the onion with oil, salt, and pepper.',
      `Roast about ${Math.max(15, Math.round(cook * 0.6))} minutes, add remaining onion, and roast ${Math.max(10, Math.round(cook * 0.4))} minutes until golden.`,
      'Season with thyme, toss, and serve hot.',
    ],
  },
  {
    id: 'parve_tuna_corn_pasta_salad',
    required: new Set(['tuna', 'corn']),
    category: 'parve',
    selectionPriority: 26,
    nameHe: 'סלט פסטה עם טונה ותירס',
    nameEn: 'Tuna and Corn Pasta Salad',
    userQuantities: {
      tuna: { he: '2 קופסאות טונה', en: '2 cans tuna' },
      corn: { he: '1 קופסת תירס', en: '1 can corn' },
    },
    pantryStaples: [
      { canon: 'pasta', he: '250 גרם פסטה', en: '250 g pasta' },
      { canon: 'onion', he: '1/2 בצל', en: '1/2 onion' },
      { canon: 'lemon', he: 'מיץ מלימון אחד', en: 'juice of 1 lemon' },
      { canon: 'oil', he: '3 כפות שמן', en: '3 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (cook) => [
      'מרתיחים סיר מים מומלחים ומבשלים את הפסטה עד רכות נעימה, מסננים ומקררים.',
      'מסננים את הטונה והתירס, קוצצים בצל דק.',
      'מערבבים פסטה, טונה, תירס ובצל בקערה גדולה.',
      'מוסיפים שמן, מיץ לימון ומלח, מערבבים היטב.',
      'מגישים מיד או מקררים שעה לפני ההגשה.',
    ],
    stepsEn: (cook) => [
      'Boil salted water and cook pasta until tender; drain and cool.',
      'Drain tuna and corn; finely chop the onion.',
      'Toss pasta, tuna, corn, and onion in a large bowl.',
      'Add oil, lemon juice, and salt; mix well.',
      'Serve immediately or chill for an hour before serving.',
    ],
  },
  {
    id: 'dairy_creamy_mushroom_pasta',
    required: new Set(['mushroom', 'cream']),
    category: 'dairy',
    selectionPriority: 28,
    nameHe: 'פסטה בפטריות ושמנת',
    nameEn: 'Creamy Mushroom Pasta',
    userQuantities: {
      mushroom: { he: '300 גרם פטריות', en: '300 g mushrooms' },
      cream: { he: '200 מ"ל שמנת', en: '200 ml cream' },
    },
    pantryStaples: [
      { canon: 'pasta', he: '250 גרם פסטה', en: '250 g pasta' },
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'garlic', he: '2 שיני שום', en: '2 garlic cloves' },
      { canon: 'butter', he: '2 כפות חמאה', en: '2 tbsp butter' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
      { canon: 'black pepper', he: '1/4 כפית פלפל שחור', en: '1/4 tsp black pepper' },
    ],
    stepsHe: (cook) => [
      'מרתיחים סיר מים מומלחים ומבשלים את הפסטה, מסננים.',
      'קוצצים פטריות, בצל ושום.',
      'מחממים חמאה במחבת, מטגנים בצל ושום עד רכות, מוסיפים פטריות עד הזהבה.',
      `מוסיפים שמנת ומבשלים ${Math.max(8, Math.round(cook / 2))} דקות עד רוטב סמיך.`,
      'מערבבים עם הפסטה, מתבלים ומגישים חם.',
    ],
    stepsEn: (cook) => [
      'Boil salted water and cook pasta; drain.',
      'Slice mushrooms, onion, and garlic.',
      'Melt butter in a pan; sauté onion and garlic, then mushrooms until golden.',
      `Add cream and simmer about ${Math.max(8, Math.round(cook / 2))} minutes until thickened.`,
      'Toss with pasta, season, and serve hot.',
    ],
  },
  {
    id: 'vegan_chickpea_tomato_stew',
    requiredAny: ['chickpea', 'chickpeas', 'hummus'],
    category: 'parve',
    selectionPriority: 25,
    nameHe: 'תבשיל חומוס ועגבניות',
    nameEn: 'Chickpea and Tomato Stew',
    userQuantities: {
      chickpea: { he: '2 כוסות חומוס מבושל', en: '2 cups cooked chickpeas' },
      chickpeas: { he: '2 כוסות חומוס מבושל', en: '2 cups cooked chickpeas' },
      hummus: { he: '2 כוסות חומוס מבושל', en: '2 cups cooked chickpeas' },
    },
    pantryStaples: [
      { canon: 'tomato', he: '3 עגבניות', en: '3 tomatoes' },
      { canon: 'onion', he: '1 בצל', en: '1 onion' },
      { canon: 'garlic', he: '2 שיני שום', en: '2 garlic cloves' },
      { canon: 'cumin', he: '1 כפית כמון', en: '1 tsp cumin' },
      { canon: 'oil', he: '2 כפות שמן', en: '2 tbsp oil' },
      { canon: 'salt', he: '1/2 כפית מלח', en: '1/2 tsp salt' },
    ],
    stepsHe: (cook) => [
      'קוצצים בצל, שום ועגבניות.',
      'מחממים שמן בסיר, מטגנים בצל ושום עד רכות.',
      'מוסיפים עגבניות, חומוס, כמון ומים, מרתיחים.',
      `מבשלים ${Math.max(18, Math.round(cook * 0.75))} דקות עד רוטב סמיך.`,
      'מתבלים במלח ומגישים חם עם לחם.',
    ],
    stepsEn: (cook) => [
      'Chop onion, garlic, and tomatoes.',
      'Warm oil in a pot; sauté onion and garlic until soft.',
      'Add tomatoes, chickpeas, cumin, and water; bring to a boil.',
      `Simmer about ${Math.max(18, Math.round(cook * 0.75))} minutes until thickened.`,
      'Season with salt and serve hot with bread.',
    ],
  },
]

export function buildMealIngredientList(
  pattern,
  filteredUserIngredients,
  displayNames,
  { language = 'he', pantryLabel = '' } = {},
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

export function rankMealPatterns(
  userCanons,
  {
    category = 'any',
    selectedCategory = category,
    userIngredientsRaw = '',
    language = 'he',
    excludeTitles = [],
    excludeTemplateKeys = [],
    excludeCookingMethods = [],
  } = {},
) {
  return rankRealisticPatterns(REALISTIC_MEAL_PATTERNS, userCanons, scoreMealPattern, {
    category,
    selectedCategory,
    userIngredientsRaw,
    language,
    excludeTitles,
    excludeTemplateKeys,
    excludeCookingMethods,
    isExcludedTitle: isExcludedMealTitle,
  })
}

export function getBestMealPattern(
  userIngredientsRaw,
  {
    category = 'any',
    selectedCategory = category,
    language = 'he',
    excludeTitles = [],
    excludeTemplateKeys = [],
    excludeCookingMethods = [],
  } = {},
) {
  const userIngredients = Array.isArray(userIngredientsRaw)
    ? userIngredientsRaw
    : parseUserIngredients(userIngredientsRaw)
  if (!userIngredients.length) return null

  const canons = canonizeList(userIngredients)
  const ranked = rankMealPatterns(canons, {
    category,
    selectedCategory,
    userIngredientsRaw: Array.isArray(userIngredientsRaw)
      ? userIngredients.join(', ')
      : String(userIngredientsRaw ?? ''),
    language,
    excludeTitles,
    excludeTemplateKeys,
    excludeCookingMethods,
  })
  return getBestRankedPattern(ranked)
}

export function buildRealisticMealFromPattern(
  pattern,
  {
    filteredUserIngredients = [],
    displayNames = [],
    language = 'he',
    cookingTime = 30,
    pantryLabel = '',
    servings = 4,
  } = {},
) {
  const cook = Math.min(cookingTime, Math.max(12, Math.round(cookingTime / 2)))
  const name = language === 'en' ? pattern.nameEn : pattern.nameHe
  let ingredients = buildMealIngredientList(pattern, filteredUserIngredients, displayNames, {
    language,
    pantryLabel,
  })
  const steps = language === 'en' ? pattern.stepsEn(cook) : pattern.stepsHe(cook)
  ;({ ingredients } = ensureRecipeCookingEssentials(
    { ingredients, steps },
    { language, recipeType: 'meal', pantryLabel },
  ))

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
    recipeType: 'meal',
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
