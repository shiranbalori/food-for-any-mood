/**
 * Final Hebrew cleanup for generated recipes before display.
 */

const MALFORMED_FIXES = [
  [/הוניחוח/g, 'מניחים'],
  [/הוניחו/g, 'מניחים'],
  [/מוניח/g, 'מניחים'],
  [/פaprika/gi, 'פפריקה'],
  [/paprika/gi, 'פפריקה'],
  [/al\s+dente/gi, 'רכות נעימה'],
  [/^\s*-\s*/, ''],
]

const HOME_COOKING_ACTIONS = [
  'מחממים',
  'מערבבים',
  'מוסיפים',
  'מטגנים',
  'מבשלים',
  'אופים',
  'מתבלים',
  'מגישים',
  'קוצצים',
  'מרתיחים',
  'שוברים',
  'מניחים',
  'מגרדים',
  'מסננים',
  'מכסים',
  'יוצקים',
  'ממלאים',
  'מקררים',
]

const STEP_OPENERS = [
  { test: /תנור|תבנית|175|180|190|200/, verb: 'מחממים' },
  { test: /קוצצ|חותכ|מפרס|מגרד/, verb: 'קוצצים' },
  { test: /מערבב|מחבר|מעורבב/, verb: 'מערבבים' },
  { test: /מטגנ|מזהיב|צורב/, verb: 'מטגנים' },
  { test: /אופ|תנור/, verb: 'אופים' },
  { test: /מרתיח|סיר\s+מים/, verb: 'מרתיחים' },
  { test: /שובר\s+ביצ/, verb: 'שוברים' },
  { test: /מגיש|הגש/, verb: 'מגישים' },
  { test: /מתבל|טועם/, verb: 'מתבלים' },
  { test: /מוסיפ/, verb: 'מוסיפים' },
  { test: /מבשל|מרתיח|מכס/, verb: 'מבשלים' },
]

function startsWithAction(step) {
  const text = String(step ?? '').trim()
  return HOME_COOKING_ACTIONS.some((verb) => text.startsWith(verb))
}

function inferActionVerb(step) {
  const text = String(step ?? '').trim()
  for (const { test, verb } of STEP_OPENERS) {
    if (test.test(text)) return verb
  }
  return 'מבשלים'
}

function polishHebrewText(text) {
  let result = String(text ?? '').trim()
  if (!result) return result
  for (const [pattern, replacement] of MALFORMED_FIXES) {
    result = result.replace(pattern, replacement)
  }
  return result.replace(/\s{2,}/g, ' ').trim()
}

function polishHebrewStep(step) {
  let text = polishHebrewText(step)
  if (!text) return text

  if (!startsWithAction(text)) {
    const verb = inferActionVerb(text)
    const rest = text.replace(/^(?:קודם\s+|לאחר\s+mכן\s+|אז\s+)/i, '')
    if (!startsWithAction(rest)) {
      text = `${verb} ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`
    }
  }

  return polishHebrewText(text)
}

export function polishHebrewRecipeForDisplay(recipe, language = 'he') {
  if (language !== 'he' || !recipe || typeof recipe !== 'object') return recipe

  const out = { ...recipe }
  if (out.name) out.name = polishHebrewText(out.name)
  if (out.description) out.description = polishHebrewText(out.description)
  if (Array.isArray(out.ingredients)) {
    out.ingredients = out.ingredients.map((line) => polishHebrewText(line)).filter(Boolean)
  }
  if (Array.isArray(out.steps)) {
    out.steps = out.steps.map((step) => polishHebrewStep(step)).filter(Boolean)
  }
  return out
}
