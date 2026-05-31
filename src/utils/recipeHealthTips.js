/**
 * Recipe-specific nutrition tips — mirrors backend/recipe_health_tips.py.
 */

import { canonicalIngredient } from '../data/ingredientKnowledge'

const DESSERT_SIGNALS = [
  'sugar', 'honey', 'chocolate', 'marshmallow', 'cookie', 'candy', 'vanilla', 'coconut',
  'cream', 'butter', 'סוכר', 'דבש', 'שוקולד', 'מרשמלו', 'עוג', 'קינוח', 'dessert', 'מתוק',
]

const PASTA_SIGNALS = ['pasta', 'spaghetti', 'penne', 'noodle', 'noodles', 'פסטה', 'אטרי']
const SALAD_SIGNALS = ['salad', 'סלט', 'lettuce', 'חסה']
const DRESSING_SIGNALS = [
  'oil', 'olive', 'tahini', 'mayonnaise', 'mayo', 'vinegar', 'lemon juice', 'dressing',
  'שמן', 'טחינה', 'מיונז', 'חומץ', 'לימון', 'רוטב',
]

function textBlob(name, ingredients) {
  return `${name ?? ''} ${(ingredients ?? []).join(' ')}`.toLowerCase()
}

function hasPattern(text, patterns) {
  return patterns.some((token) => {
    if (token.length <= 4) return new RegExp(token, 'i').test(text)
    return text.includes(token)
  })
}

function hasRegex(text, pattern) {
  return new RegExp(pattern, 'i').test(text)
}

function collectCanons(ingredients) {
  const canons = new Set()
  for (const item of ingredients ?? []) {
    const canon = canonicalIngredient(String(item))
    if (canon) canons.add(canon)
  }
  return canons
}

function pickTip(candidates, limit = 3) {
  const tips = []
  const seen = new Set()
  for (const tip of candidates) {
    if (!tip || seen.has(tip)) continue
    tips.push(tip)
    seen.add(tip)
    if (tips.length >= limit) break
  }
  return tips
}

function analyzeRecipeProfile(name, ingredients) {
  const text = textBlob(name, ingredients)
  const canons = collectCanons(ingredients)
  const dessertHits = DESSERT_SIGNALS.filter((signal) => text.includes(signal)).length
  const isDessert = dessertHits >= 2 || hasRegex(text, 'קינוח|dessert|עוג(?:ה|יות)|cookie')
  const isPasta = canons.has('pasta') || hasPattern(text, PASTA_SIGNALS)
  const isSalad = hasPattern(text, SALAD_SIGNALS) || (
    (['cucumber', 'tomato', 'avocado', 'lettuce'].some((c) => canons.has(c)) && !canons.has('pasta'))
  )

  return {
    isDessert: isDessert && !isPasta,
    isPasta: isPasta && !isDessert,
    isSalad: isSalad && !isPasta && !isDessert,
    hasSugar: canons.has('sugar') || hasRegex(text, 'סוכר|sugar'),
    hasHoney: canons.has('honey') || hasRegex(text, 'דבש|honey'),
    hasMarshmallow: canons.has('marshmallow') || canons.has('marshmallows') || text.includes('מרשמלו'),
    hasChocolate: canons.has('chocolate') || hasRegex(text, 'שוקולד|chocolate'),
    hasCream: canons.has('cream') || hasRegex(text, 'שמנת|heavy cream|cream'),
    hasButter: canons.has('butter') || hasRegex(text, 'חמאה|butter'),
    hasPasta: isPasta,
    hasOil: canons.has('oil') || hasRegex(text, 'שמן|olive oil|oil'),
    hasDressing: hasPattern(text, DRESSING_SIGNALS),
    hasCheese: canons.has('cheese') || canons.has('parmesan') || hasRegex(text, 'גבינ|cheese|parmesan'),
    hasYogurt: canons.has('yogurt') || hasRegex(text, 'יוגורט|yogurt'),
    hasChicken: canons.has('chicken') || hasRegex(text, 'עוף|chicken'),
    hasTuna: canons.has('tuna') || hasRegex(text, 'tuna'),
    hasEgg: canons.has('egg') || canons.has('eggs') || hasRegex(text, 'ביצ|egg'),
    hasVegetables: ['tomato', 'broccoli', 'pepper', 'spinach', 'zucchini', 'carrot', 'mushroom', 'onion']
      .some((c) => canons.has(c)),
    hasCoconut: canons.has('coconut') || hasRegex(text, 'קוקוס|coconut'),
  }
}

export function buildRecipeSpecificTips({
  name = '',
  ingredients = [],
  proteinLevel = 'medium',
  fatLevel = 'medium',
  fiberLevel = 'medium',
  language = 'he',
}) {
  const profile = analyzeRecipeProfile(name, ingredients)
  const isHe = language === 'he'
  const tips = []

  if (profile.isDessert) {
    if (profile.hasSugar) {
      tips.push(
        isHe
          ? 'אפשר להקטין את כמות הסוכר בכ-25% — בדרך כלל המתוקות נשארת טובה.'
          : 'Try cutting the sugar by about 25% — the dessert usually stays sweet enough.',
      )
    }
    if (profile.hasMarshmallow) {
      tips.push(
        isHe
          ? 'נסו להקטין את כמות המרשמלו או להחליף חלק ממנו בפירות טריים.'
          : 'Reduce the marshmallows or swap some for fresh fruit.',
      )
    }
    if (profile.hasChocolate) {
      tips.push(
        isHe
          ? 'החליפו שוקולד מלבין בשוקולד מריר (70%+) — פחות סוכר, יותר טעם.'
          : 'Swap milk chocolate for dark chocolate (70%+) — less sugar, richer flavor.',
      )
    }
    if (profile.hasHoney && !profile.hasSugar) {
      tips.push(
        isHe
          ? 'הקטינו מעט את כמות הדבש, או החליפו חלק ממנו במחית תמרים.'
          : 'Use a little less honey, or replace part of it with date paste.',
      )
    }
    if (profile.hasCream || profile.hasButter) {
      tips.push(
        isHe
          ? 'יוגורט יווני יכול להחליף חלק מהשמנת/חמאה — פחות שומן, עדיין קרמי.'
          : 'Greek yogurt can replace part of the cream or butter — less fat, still creamy.',
      )
    }
    if (profile.hasCoconut) {
      tips.push(
        isHe
          ? 'הקטינו מעט את כמות הקוקוס אם רוצים מנה קלה יותר — הטעם יישאר בולט.'
          : 'Use a little less coconut for a lighter version — the flavor will still come through.',
      )
    }
  } else if (profile.isPasta) {
    if (profile.hasPasta) {
      tips.push(
        isHe
          ? 'החליפו חלק מהפסטה בפסטה מקמח מלא — יותר סיבים, אותו רוטב.'
          : 'Swap some of the pasta for whole wheat pasta — more fiber, same sauce.',
      )
    }
    if (profile.hasCream) {
      tips.push(
        isHe
          ? 'הקטינו את כמות השמנת ודללו במעט מי בישול — הרוטב יישאר קרמי אך קל יותר.'
          : 'Use less cream and thin the sauce with a splash of pasta water — still creamy, lighter.',
      )
    } else if (profile.hasButter) {
      tips.push(
        isHe
          ? 'הקטינו את כמות החמאה בחצי — הרוטב יישאר עשיר, עם פחות שומן רווי.'
          : 'Halve the butter — the sauce stays rich with less saturated fat.',
      )
    }
    if (!profile.hasVegetables && fiberLevel !== 'high') {
      tips.push(
        isHe
          ? 'הוסיפו לרוטב ירק קצוץ (ברוקולי, פלפל או קישוא) — מתאים טבעית לפסטה.'
          : 'Fold in chopped vegetables (broccoli, pepper, or zucchini) — a natural fit for pasta.',
      )
    }
  } else if (profile.isSalad) {
    if (proteinLevel === 'low') {
      if (profile.hasCheese) {
        tips.push(
          isHe
            ? 'הוסיפו עוד מעט גבינה או חתיכות עוף/טונה — יתאים לסלט הזה.'
            : 'Add a bit more cheese or some chicken/tuna — it fits this salad well.',
        )
      } else if (profile.hasEgg) {
        tips.push(
          isHe
            ? 'הוסיפו עוד ביצה או חלבון קל כמו טונה — ישדרג את הסלט למנה מלאה.'
            : 'Add another egg or light protein like tuna — turns this salad into a full meal.',
        )
      } else {
        tips.push(
          isHe
            ? 'לסלט הזה כדאי להוסיף מקור חלבון — גבינה בולגרית, עוף או טונה.'
            : 'This salad would benefit from a protein source — feta, chicken, or tuna.',
        )
      }
    }
    if (profile.hasDressing || profile.hasOil) {
      tips.push(
        isHe
          ? 'הקטינו את כמות הרוטב או השמן — מספיק כף-שתיים לתיבול טוב.'
          : 'Use less dressing or oil — a tablespoon or two is often enough.',
      )
    }
  } else {
    if (profile.hasCream && fatLevel === 'high') {
      tips.push(
        isHe
          ? 'הקטינו את כמות השמנת במתכון — אפשר לדלל במעט חלב או מי בישול.'
          : 'Reduce the cream in this recipe — thin with a little milk or cooking liquid.',
      )
    }
    if (profile.hasButter && fatLevel === 'high') {
      tips.push(
        isHe
          ? 'הקטינו את כמות החמאה בחצי — הטעם יישאר, עם פחות קלוריות.'
          : 'Halve the butter in this recipe — same flavor, fewer calories.',
      )
    }
    if (profile.hasOil && (fatLevel === 'high' || fatLevel === 'medium')) {
      tips.push(
        isHe
          ? 'הקטינו את כמות השמן — במתכון הזה מספיק כף-שתיים במקום יותר.'
          : 'Use less oil in this recipe — one or two tablespoons is often enough.',
      )
    }
    if (profile.hasSugar && !profile.isDessert) {
      tips.push(
        isHe
          ? 'הקטינו מעט את כמות הסוכר — הטעם המלוח-מתוק יישאר מאוזן.'
          : 'Reduce the sugar slightly — the sweet-savory balance will still work.',
      )
    }
  }

  if (pickTip(tips).length < 2) {
    if (profile.hasChicken && proteinLevel === 'low') {
      tips.push(
        isHe
          ? 'הגדילו מעט את מנת העוף — המתכון כבר מבוסס עליו.'
          : 'Increase the chicken portion slightly — the recipe is already built around it.',
      )
    }
    if (profile.hasVegetables && fiberLevel === 'high') {
      tips.push(
        isHe
          ? 'המנה כבר עשירה בירקות — שמרו על המרכיבים האלה, הם נותנים סיבים ושובע.'
          : 'This dish is already vegetable-rich — keep those ingredients for fiber and fullness.',
      )
    }
  }

  let picked = pickTip(tips)
  if (picked.length === 0) {
    const notable = (ingredients ?? []).slice(0, 3).join(', ') || name
    picked = [
      isHe
        ? `הקפידו על מנות בינוניות — במתכון עם ${notable} כדאי לא לאכול יותר מדי בבת אחת.`
        : `Stick to moderate portions — with ${notable}, one serving at a time is enough.`,
    ]
  }

  return picked.slice(0, 3)
}
