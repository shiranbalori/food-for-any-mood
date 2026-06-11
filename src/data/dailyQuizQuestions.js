/** @typedef {{ id: string, question: Record<string, string>, options: Record<string, string[]>, correctIndex: number, explanation: Record<string, string> }} DailyQuizQuestion */

/** @type {DailyQuizQuestion[]} */
export const DAILY_QUIZ_QUESTIONS = [
  {
    id: 'basil-origin',
    question: {
      he: 'מאיזו מדינה הגיע הבזיליקום במקור?',
      en: 'Which country did basil originally come from?',
    },
    options: {
      he: ['איטליה', 'הודו', 'יוון', 'מקסיקו'],
      en: ['Italy', 'India', 'Greece', 'Mexico'],
    },
    correctIndex: 1,
    explanation: {
      he: 'בזיליקום מזוהה מאוד עם המטבח האיטלקי, אבל מקורו ההיסטורי הוא באזור הודו ודרום־מזרח אסיה.',
      en: 'Basil is strongly associated with Italian cooking, but it historically originated in India and Southeast Asia.',
    },
  },
  {
    id: 'sushi-rice',
    question: {
      he: 'מהו סוג האורז המסורתי לסושי?',
      en: 'What type of rice is traditionally used for sushi?',
    },
    options: {
      he: ['בסמטי', 'ארבוריו', 'אורז קצר גרגר', 'יסמין'],
      en: ['Basmati', 'Arborio', 'Short-grain rice', 'Jasmine'],
    },
    correctIndex: 2,
    explanation: {
      he: 'סושי מוכן עם אורז קצר גרגר דביק, שמאפשר לעצב את הרול בקלות.',
      en: 'Sushi is made with sticky short-grain rice that holds together when shaped.',
    },
  },
  {
    id: 'vitamin-c',
    question: {
      he: 'איזה ויטמין מצוי בכמות גבוהה במלפפון?',
      en: 'Which vitamin is found in notable amounts in cucumbers?',
    },
    options: {
      he: ['ויטמין A', 'ויטמין B12', 'ויטמין C', 'ויטמין D'],
      en: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'],
    },
    correctIndex: 2,
    explanation: {
      he: 'מלפפון עשיר במים ומכיל ויטמין C, שתורם לבריאות העור והמערכת החיסונית.',
      en: 'Cucumbers are mostly water and contain vitamin C, which supports skin and immune health.',
    },
  },
  {
    id: 'hummus-origin',
    question: {
      he: 'חומוס הוא מנה מסורתית שמקושרת במיוחד לאיזה אזור?',
      en: 'Hummus is a traditional dish most associated with which region?',
    },
    options: {
      he: ['סקנדינביה', 'המזרח התיכון', 'יפן', 'פרו'],
      en: ['Scandinavia', 'The Middle East', 'Japan', 'Peru'],
    },
    correctIndex: 1,
    explanation: {
      he: 'חומוס הוא מנה בולטת במטבח המזרח־תיכוני, במיוחד בלבנט.',
      en: 'Hummus is a staple across Middle Eastern cuisine, especially in the Levant.',
    },
  },
  {
    id: 'maillard',
    question: {
      he: 'מה קורה כשמבשלים בצל עד להזהבה עמוקה?',
      en: 'What happens when onions are cooked until deeply golden?',
    },
    options: {
      he: ['התסיסה', 'תגובת מאיה', 'הקפאה מהירה', 'אמולסיה'],
      en: ['Fermentation', 'Maillard reaction', 'Flash freezing', 'Emulsification'],
    },
    correctIndex: 1,
    explanation: {
      he: 'הזהבה נובעת מתגובת מאיה — תגובה בין סוכרים לחלבונים שיוצרת טעמים וארומות עשירים.',
      en: 'Browning comes from the Maillard reaction — sugars and proteins create rich flavors and aromas.',
    },
  },
  {
    id: 'parmesan-pasta',
    question: {
      he: 'איזו פסטה מסורתית מקושרת לרוטב אלפרדו?',
      en: 'Which pasta is traditionally linked to Alfredo sauce?',
    },
    options: {
      he: ['ספגטי', 'פנה', 'פטוציני', 'רביולי'],
      en: ['Spaghetti', 'Penne', 'Fettuccine', 'Ravioli'],
    },
    correctIndex: 2,
    explanation: {
      he: 'רוטב אלפרדו הלך כמעט תמיד עם פטוציני רחבים שתופסים את הרוטב הקרמי.',
      en: 'Alfredo sauce is classically served with wide fettuccine that catches the creamy sauce.',
    },
  },
  {
    id: 'quinoa-origin',
    question: {
      he: 'מאיזו יבשת מקור הקינואה?',
      en: 'Which continent is quinoa originally from?',
    },
    options: {
      he: ['אפריקה', 'אמריקה הדרומית', 'אירופה', 'אוסטרליה'],
      en: ['Africa', 'South America', 'Europe', 'Australia'],
    },
    correctIndex: 1,
    explanation: {
      he: 'קינואה גודלה במשך אלפי שנים באזור האנדים בדרום אמריקה.',
      en: 'Quinoa was cultivated for thousands of years in the Andean region of South America.',
    },
  },
  {
    id: 'wasabi-real',
    question: {
      he: 'מהו מרכיב הוואסבי האמיתי?',
      en: 'What is real wasabi made from?',
    },
    options: {
      he: ['זנגביל', 'שורש כרישה יפני', 'פלפל שחור', 'חרדל צהוב'],
      en: ['Ginger', 'Japanese horseradish root', 'Black pepper', 'Yellow mustard'],
    },
    correctIndex: 1,
    explanation: {
      he: 'וואסבי אמיתי מכין משורש Wasabia japonica, ולא מחזיק מעמד זמן רב מחוץ למטבח.',
      en: 'True wasabi comes from Wasabia japonica root and loses potency quickly once grated.',
    },
  },
  {
    id: 'olive-oil-smoke',
    question: {
      he: 'מה קורה לשמן זית כשמחממים אותו מעבר לנקודת העישון?',
      en: 'What happens when olive oil is heated past its smoke point?',
    },
    options: {
      he: [
        'הוא עלול להתפרק ולהתמרר',
        'הוא נשרף ומעלה עשן חזק',
        'הוא הופך לבהיר ומתאים לטיגון עמוק',
        'חום גבוה מעלה את נקודת העישון שלו',
      ],
      en: [
        'It can break down and turn bitter',
        'It burns and produces heavy smoke',
        'It becomes lighter and ideal for deep frying',
        'High heat raises its smoke point',
      ],
    },
    correctIndex: 0,
    explanation: {
      he: 'חימום יתר עלול לשבור חומצות שומן וליצור טעם מר ועשן לא נעים.',
      en: 'Excessive heat can break down fats and produce bitter, unpleasant flavors.',
    },
  },
  {
    id: 'capers-plant',
    question: {
      he: 'קפריס הם למעשה...',
      en: 'Capers are actually...',
    },
    options: {
      he: ['זרעי עגבניה', 'ניצני פרחים', 'עלי בייבי', 'פירות יבשים'],
      en: ['Tomato seeds', 'Flower buds', 'Baby leaves', 'Dried fruits'],
    },
    correctIndex: 1,
    explanation: {
      he: 'קפריס הם ניצנים של צמח הקפריס לפני שהם נפתחים, ולכן טעמם חמצמץ ומרוכז.',
      en: 'Capers are unopened flower buds of the caper bush, which is why they taste tangy and concentrated.',
    },
  },
  {
    id: 'miso-country',
    question: {
      he: 'מיסו הוא רכיב מרכזי במטבח של איזו מדינה?',
      en: 'Miso is a central ingredient in which country’s cuisine?',
    },
    options: {
      he: ['תאילנד', 'יפן', 'מרוקו', 'ברזיל'],
      en: ['Thailand', 'Japan', 'Morocco', 'Brazil'],
    },
    correctIndex: 1,
    explanation: {
      he: 'מיסו הוא משחה מותססת מפולי סויה שמשמשת במרקים, רטבים ומארינדים יפניים.',
      en: 'Miso is a fermented soybean paste used in Japanese soups, sauces, and marinades.',
    },
  },
  {
    id: 'protein-egg',
    question: {
      he: 'כמה גרם חלבון בערך יש בביצה בינונית?',
      en: 'About how many grams of protein are in a medium egg?',
    },
    options: {
      he: ['2 גרם', '6 גרם', '12 גרם', '20 גרם'],
      en: ['2 g', '6 g', '12 g', '20 g'],
    },
    correctIndex: 1,
    explanation: {
      he: 'ביצה בינונית מספקת בערך 6 גרם חלבון איכותי, בעיקר בחלבון.',
      en: 'A medium egg provides roughly 6 g of high-quality protein, mostly in the white.',
    },
  },
  {
    id: 'saffron-part',
    question: {
      he: 'ממה מופק הזעפרן?',
      en: 'What part of the plant is saffron harvested from?',
    },
    options: {
      he: ['עלים', 'שורש', 'חלקי פרח', 'קליפת זרעים'],
      en: ['Leaves', 'Root', 'Flower parts', 'Seed husks'],
    },
    correctIndex: 2,
    explanation: {
      he: 'זעפרן מורכב מצבעות של פרח הכרכום, ולכן הוא יקר ונדיר.',
      en: 'Saffron consists of crocus flower stigmas, which makes it rare and expensive.',
    },
  },
  {
    id: 'french-onion-soup',
    question: {
      he: 'מה מונחים מעל מרק הבצל הצרפתי המסורתי?',
      en: 'What is traditionally placed on top of French onion soup?',
    },
    options: {
      he: ['אורז', 'פרוסת לחם וגבינה', 'שמנת חמוצה', 'אגוזים'],
      en: ['Rice', 'Bread slice and cheese', 'Sour cream', 'Nuts'],
    },
    correctIndex: 1,
    explanation: {
      he: 'הגרסה הקלאסית נאפית עם פרוסת לחם ושכבת גבינה מותכת מעל המרק העשיר.',
      en: 'The classic version is gratinated with bread and melted cheese over rich onion broth.',
    },
  },
  {
    id: 'umami-taste',
    question: {
      he: 'אומאמי מתאר בעיקר איזה סוג טעם?',
      en: 'Umami mainly describes which kind of taste?',
    },
    options: {
      he: ['מתוק', 'מלוח־עמוק ומלא', 'חמוץ בלבד', 'מר בלבד'],
      en: ['Sweet', 'Savory and rich', 'Only sour', 'Only bitter'],
    },
    correctIndex: 1,
    explanation: {
      he: 'אומאמי הוא טעם מלוח־עמוק שמורגש במרכיבים כמו עגבניות, פטריות ופרמזן.',
      en: 'Umami is a savory depth found in ingredients like tomatoes, mushrooms, and Parmesan.',
    },
  },
  {
    id: 'couscous-grain',
    question: {
      he: 'קוסקוס עשוי בעיקר מ...',
      en: 'Couscous is mainly made from...',
    },
    options: {
      he: ['אורז', 'חיטה/סולת', 'תירס', 'שעורה'],
      en: ['Rice', 'Wheat/semolina', 'Corn', 'Barley'],
    },
    correctIndex: 1,
    explanation: {
      he: 'קוסקוס מסורתי מיוצר מגרגרי סולת חיטה קטנים שמבושלים באדים.',
      en: 'Traditional couscous is tiny steamed granules of wheat semolina.',
    },
  },
  {
    id: 'avocado-fruit',
    question: {
      he: 'אבוקדו מסווג בוטנית כ...',
      en: 'Botanically, avocado is classified as a...',
    },
    options: {
      he: ['ירק', 'פרי בעל גלעין יחיד', 'פטריה', 'קטנית'],
      en: ['Vegetable', 'Single-seeded fruit', 'Mushroom', 'Legume'],
    },
    correctIndex: 1,
    explanation: {
      he: 'אבוקדו הוא פרי (בERRY) עם גלעין אחד גדול, למרות השימוש שלו כמנה מלוחה.',
      en: 'Avocado is a fruit (a berry with one large seed), though we often use it in savory dishes.',
    },
  },
  {
    id: 'baking-soda-role',
    question: {
      he: 'מה תפקיד סודה לשתייה באפייה?',
      en: 'What is baking soda’s role in baking?',
    },
    options: {
      he: ['מוסיפה מתיקות', 'מסייעת בהתפחה', 'מקשיחה בצק', 'צובעת את העוגה'],
      en: ['Adds sweetness', 'Helps leavening', 'Hardens dough', 'Colors the cake'],
    },
    correctIndex: 1,
    explanation: {
      he: 'סודה לשתייה משחררת CO₂ בתגובה עם חומציות ומסייעת לבצק לנפוח.',
      en: 'Baking soda releases CO₂ when reacting with acidity, helping batters rise.',
    },
  },
  {
    id: 'tahini-seed',
    question: {
      he: 'טחינה מיוצרת מ...',
      en: 'Tahini is made from...',
    },
    options: {
      he: ['שומשום', 'בוטנים', 'שקדים', 'חמניות'],
      en: ['Sesame seeds', 'Peanuts', 'Almonds', 'Sunflower seeds'],
    },
    correctIndex: 0,
    explanation: {
      he: 'טחינה היא משחה עשירה מגרגירי שומשום קלויים וטחונים.',
      en: 'Tahini is a rich paste made from roasted and ground sesame seeds.',
    },
  },
  {
    id: 'kimchi-ferment',
    question: {
      he: 'קימצ\'י הוא מנה מותססת מסורתית מ...',
      en: 'Kimchi is a traditional fermented dish from...',
    },
    options: {
      he: ['קוריאה', 'הודו', 'יוון', 'קנדה'],
      en: ['Korea', 'India', 'Greece', 'Canada'],
    },
    correctIndex: 0,
    explanation: {
      he: 'קימצ\'י הוא כרוב מותסס חריף שמלווה ארוחות קוריאניות כבר מאות שנים.',
      en: 'Kimchi is spicy fermented cabbage that has accompanied Korean meals for centuries.',
    },
  },
]
