export const RECIPE_COPY = {
  he: {
    styleOpeners: {
      quick: 'מנה מהירה וללא מאמץ',
      healthy: 'ארוחה מזינה שמרגישה טוב',
      comfort: 'נוחות אמיתית בצלחת',
      family: 'ארוחה משפחתית נדיבה',
      romantic: 'ארוחת ערב אינטימית לשניים',
    },
    moodFlavor: {
      happy: 'שמחים ומרוממים',
      cozy: 'חמים ומנחמים',
      energetic: 'נועזים ומלאי אנרגיה',
      relaxed: 'רגועים ומאוזנים',
      adventurous: 'מלאי אופי וגיוון',
      comfort: 'מספקים ומוכרים',
    },
    defaultOpener: 'מנה שנבנתה בקפידה',
    defaultMood: 'טעימים',
    highlightsPrefix: ' מדגישה את ',
    highlightsJoin: ', ',
    highlightsSuffix: '.',
    gfAdapted: ' מותאמת במלואה לתזונה ללא גלוטן.',
    gfNatural: ' ללא גלוטן באופן טבעי.',
    gfStepNote:
      'גרסה זו מותאמת ללא גלוטן — מרכיבים על בסיס חיטה מוחלפים בתחליפים בטוחים.',
    timeShortPrefix: 'קצר בזמן? עברו מהר על כל שלב — גרסה מותאמת לכ-',
    timeShortSuffix: ' דקות.',
    timeLongNote: 'יש לכם זמן נוסף? תנו לטעמים להתמזג עוד כמה דקות מחוץ ללהבה לפני ההגשה.',
    descriptionJoiner: ' עם ניחוחות ',
    descriptionMiddle: ', מותאמת לכ-',
    descriptionMinutes: ' דקות בישול. ',
  },
  en: {
    styleOpeners: {
      quick: 'A fast, no-fuss dish',
      healthy: 'A nourishing, feel-good meal',
      comfort: 'Pure comfort on a plate',
      family: 'A generous, shareable feast',
      romantic: 'An intimate dinner for two',
    },
    moodFlavor: {
      happy: 'bright and uplifting',
      cozy: 'warm and soul-soothing',
      energetic: 'bold and energizing',
      relaxed: 'calm and balanced',
      adventurous: 'exciting and full of character',
      comfort: 'deeply satisfying and familiar',
    },
    defaultOpener: 'A thoughtfully built dish',
    defaultMood: 'delicious',
    highlightsPrefix: ' Highlights your ',
    highlightsJoin: ', ',
    highlightsSuffix: '.',
    gfAdapted: ' Fully adapted for a gluten-free diet.',
    gfNatural: ' Naturally gluten-free.',
    gfStepNote:
      'This version is adapted to be gluten-free — wheat-based ingredients are swapped for safe alternatives.',
    timeShortPrefix: 'Short on time? Move quickly through each step — this version is adapted for about ',
    timeShortSuffix: ' minutes.',
    timeLongNote:
      'With extra time, let flavors meld for a few more minutes off the heat before serving.',
    descriptionJoiner: ' with ',
    descriptionMiddle: ' flavors, tailored to about ',
    descriptionMinutes: ' minutes of cooking. ',
  },
}

export function getRecipeCopy(language = 'he') {
  return RECIPE_COPY[language === 'en' ? 'en' : 'he']
}
