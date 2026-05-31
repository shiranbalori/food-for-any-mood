const HE_REPLACEMENTS = [
  [/מורידים מהאש ומקפלים פנימה את/g, 'מסירים מהאש, מוסיפים את'],
  [/מורידים מהאש ומקפלים את/g, 'מסירים מהאש, מוסיפים את'],
  [/מקפלים פנימה את/g, 'מוסיפים את'],
  [/מקפלים פנימה/g, 'מוסיפים ומערבבים'],
  [/מקפלים את/g, 'מוסיפים את'],
  [/מעבירים לכלי הגשה ומבצעים פיזור אחיד/g, 'שופכים לתבנית ומשטחים בעזרת כף'],
  [/מעבירים לתבנית ולוחצים לשכבה שטוחה/g, 'שופכים לתבנית ומשטחים בעזרת כף'],
  [/מעבירים לתבנית מרופדת ומפזרים בשכבה שטוחה/g, 'שופכים לתבנית מרופדת ומשטחים בעזרת כף'],
  [/מבצעים אמולסיה/g, 'מערבבים היטב'],
  [/טמפרור/g, 'המסה'],
  [/הומוגניזציה/g, 'ערבוב אחיד'],
  [/רדוקציה/g, 'בישול והסמכה'],
  [/תוך ערבוב רציף/g, 'תוך ערבוב'],
  [/קרמית/g, 'חלקה'],
  [/קרמי/g, 'חלק'],
]

const EN_REPLACEMENTS = [
  [/\bfold in\b/gi, 'add and stir in'],
  [/\bfold the\b/gi, 'add and mix'],
  [/\bincorporate\b/gi, 'mix in'],
  [/\bemulsify\b/gi, 'mix well'],
  [/\btemper\b/gi, 'warm and add slowly'],
  [/\bhomogenize\b/gi, 'mix until smooth'],
  [/\bperform even distribution\b/gi, 'spread evenly with a spoon'],
  [/\bperform uniform dispersion\b/gi, 'spread evenly with a spoon'],
  [/\bcontinuously\b/gi, ''],
]

export function sanitizeHomeCookingStep(text, language = 'he') {
  let line = String(text ?? '').trim().replace(/\s{2,}/g, ' ')
  if (!line) return line

  const replacements = language === 'he' ? HE_REPLACEMENTS : EN_REPLACEMENTS
  for (const [pattern, replacement] of replacements) {
    line = line.replace(pattern, replacement)
  }

  return line.replace(/\s{2,}/g, ' ').trim()
}

export function sanitizeHomeCookingSteps(steps, language = 'he') {
  return (steps ?? []).map((step) => sanitizeHomeCookingStep(step, language)).filter(Boolean)
}
