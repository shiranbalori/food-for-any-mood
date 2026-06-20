/** @typedef {{ id: string, question: Record<string, string>, options: Record<string, string[]>, correctIndex: number, explanation: Record<string, string> }} DailyQuizQuestion */

/** @type {DailyQuizQuestion[]} */
export const DAILY_QUIZ_QUESTIONS_EXTRA = [
  {
    id: 'roux-thickener',
    question: {
      he: 'מהו רוּ (roux) במטבח?',
      en: 'What is a roux in cooking?',
    },
    options: {
      he: ['תערובת קמח ושומן להסמכה', 'מרק עוף מרוכז', 'תבלין צרפתי', 'סוג של גבינה'],
      en: ['A flour-and-fat mixture for thickening', 'Concentrated chicken broth', 'A French spice blend', 'A type of cheese'],
    },
    correctIndex: 0,
    explanation: {
      he: 'רוּ הוא תערובת של קמח ושומן שמבושלת יחד ומשמשת להסמכת רטבים ומרקים.',
      en: 'A roux is cooked flour and fat used to thicken sauces and soups.',
    },
  },
  {
    id: 'caramel-temp',
    question: {
      he: 'באיזו טמפרטורה בערך סוכר הופך לקרמל?',
      en: 'At roughly what temperature does sugar turn into caramel?',
    },
    options: {
      he: ['100°C', '160°C', '220°C', '300°C'],
      en: ['100°C', '160°C', '220°C', '300°C'],
    },
    correctIndex: 1,
    explanation: {
      he: 'קרמל מתחיל להיווצר סביב 160°C, כשהסוכר מתחמם ומקבל צבע וטעם קרמליים.',
      en: 'Caramelization begins around 160°C (320°F) as sugar heats and browns.',
    },
  },
  {
    id: 'mirepoix-base',
    question: {
      he: 'מהו מירפואה (mirepoix) במטבח הצרפתי?',
      en: 'What is mirepoix in French cooking?',
    },
    options: {
      he: ['בצל, גזר וסלרי', 'שום, לימון ורוזמרין', 'עגבניות, בזיליקום ושמן זית', 'תפוחי אדמה, פטרוזיליה וחמאה'],
      en: ['Onion, carrot and celery', 'Garlic, lemon and rosemary', 'Tomatoes, basil and olive oil', 'Potatoes, parsley and butter'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מירפואה הוא בסיס ירקות קלאסי לרוטבים, מרקים ותבשילים צרפתיים.',
      en: 'Mirepoix is the classic vegetable base for French sauces, soups and stews.',
    },
  },
  {
    id: 'poach-method',
    question: {
      he: 'מהי שיטת בישול "פוש" (poaching)?',
      en: 'What is poaching as a cooking method?',
    },
    options: {
      he: ['בישול עדין בנוזל בטמפרטורה נמוכה', 'צלייה ישירה על גחלים', 'טיגון בשמן עמוק', 'אידוי בלחץ גבוה'],
      en: ['Gentle cooking in liquid at low temperature', 'Direct grilling over coals', 'Deep frying in oil', 'High-pressure steaming'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בפוש (poaching) מבשלים מזון בנוזל שלא מגיע לרתיחה — מים, חלב או יין — בטמפרטורה נמוכה.',
      en: 'Poaching cooks food gently in liquid that is not boiling, such as water, milk or wine.',
    },
  },
  {
    id: 'blanch-vegetables',
    question: {
      he: 'למה מבשלים ירקות רגע במים רותחים?',
      en: 'Why are vegetables briefly boiled in water?',
    },
    options: {
      he: ['לריכוך, שמירה על צבע והקלה על קילוף', 'להוספת מתיקות', 'להפיכתם לפריכים', 'להעלמת ויטמינים'],
      en: ['To peel, soften and preserve color', 'To add sweetness', 'To make them crispy', 'To remove vitamins'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בבלנש (blanching) משרים ירקות רגע במים רותחים ואז מצננים — כדי לרכך, לשמור על הצבע ולהקל על הקילוף.',
      en: 'Blanching briefly cooks vegetables then cools them to soften, set color and ease peeling.',
    },
  },
  {
    id: 'sous-vide-meaning',
    question: {
      he: 'מה פירוש "sous-vide" בבישול?',
      en: 'What does "sous-vide" mean in cooking?',
    },
    options: {
      he: ['תחת ואקום', 'מעל אש', 'בשמן עמוק', 'בתנור גבוה'],
      en: ['Under vacuum', 'Over fire', 'In deep oil', 'In a hot oven'],
    },
    correctIndex: 0,
    explanation: {
      he: 'סו-וויד (sous-vide) הוא בישול של מזון ארוז בוואקום, בטמפרטורה מדויקת, בתוך מי אמבט.',
      en: 'Sous-vide cooks vacuum-sealed food in a precisely controlled water bath.',
    },
  },
  {
    id: 'resting-meat',
    question: {
      he: 'למה מניחים בשר לנוח אחרי צלייה?',
      en: 'Why should meat rest after roasting or grilling?',
    },
    options: {
      he: ['כדי שהמיצים יתפזרו שוב בכל חתיכה', 'כדי שיתקרר לחלוטין', 'כדי להקשיח את הבשר', 'כדי להוסיף טעם מעושן'],
      en: ['So juices redistribute evenly', 'So it cools completely', 'To toughen the meat', 'To add smoky flavor'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מנוחה מאפשרת למיצים שנדחפו למרכז לחזור ולהתפזר בחתיכה — והבשר יוצא עסיסי יותר.',
      en: 'Resting lets juices pushed to the center flow back through the cut for a juicier result.',
    },
  },
  {
    id: 'deglaze-pan',
    question: {
      he: 'מה עושים כש"מדגלייזים" (deglaze) מחבת?',
      en: 'What do you do when you deglaze a pan?',
    },
    options: {
      he: ['מוסיפים נוזל כדי לשחרר שאריות צרובות', 'מנקים את המחבת בלבד', 'מוסיפים קמח ישירות', 'מקפיאים את התבשיל'],
      en: ['Add liquid to lift browned bits', 'Only clean the pan', 'Add flour directly', 'Freeze the dish'],
    },
    correctIndex: 0,
    explanation: {
      he: 'דגליזינג משחרר את השאריות הצרובות מהמחבת עם יין, ציר או מים — וכך בונים רוטב עשיר.',
      en: 'Deglazing loosens browned bits from the pan with wine, stock or water to build a rich sauce.',
    },
  },
  {
    id: 'braising-method',
    question: {
      he: 'מה מאפיין בישול בראיז (braising)?',
      en: 'What characterizes braising as a cooking method?',
    },
    options: {
      he: ['צריבה קלה ואז בישול ארוך בנוזל', 'טיגון מהיר בשמן', 'אידוי בלבד', 'הקפאה ואז צלייה'],
      en: ['Light browning then long cooking in liquid', 'Quick frying in oil', 'Steaming only', 'Freezing then roasting'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בראיז משלבים צריבה קלה על מחבת עם בישול איטי בנוזל — מתאים לבשר וירקות קשים.',
      en: 'Braising combines light browning with slow cooking in liquid, ideal for tough meats and vegetables.',
    },
  },
  {
    id: 'julienne-cut',
    question: {
      he: 'איך נראית חיתוך "ג\'וליין" (julienne)?',
      en: 'What does a julienne cut look like?',
    },
    options: {
      he: ['גפרורים דקים וארוכים', 'קוביות קטנות', 'פרוסות עגולות דקות', 'חתיכות גסות'],
      en: ['Thin matchstick strips', 'Small cubes', 'Thin round slices', 'Large chunks'],
    },
    correctIndex: 0,
    explanation: {
      he: 'ג\'וליין הוא חיתוך לרצועות דקות, שכיח בסלטים, לקישוט וירקות מוקפצים.',
      en: 'Julienne means thin matchstick strips, common in salads, garnishes and stir-fries.',
    },
  },
  {
    id: 'yeast-leavening',
    question: {
      he: 'מה תפקיד השמרים בלחם?',
      en: 'What is the role of yeast in bread?',
    },
    options: {
      he: ['מייצרים פחמן דו-חמצני ומרימים את הבצק', 'מוסיפים מתיקות', 'מחממים את התנור', 'מקשיחים את הקמח'],
      en: ['Produces carbon dioxide and raises dough', 'Adds sweetness', 'Heats the oven', 'Hardens flour'],
    },
    correctIndex: 0,
    explanation: {
      he: 'שמרים מפרקים סוכרים ומייצרים פחמן דו-חמצני, שגורם לבצק לתפוח.',
      en: 'Yeast ferments sugars and releases gas that makes dough rise and expand.',
    },
  },
  {
    id: 'gluten-formation',
    question: {
      he: 'מה יוצר גלוטן בבצק?',
      en: 'What creates gluten in dough?',
    },
    options: {
      he: ['לישה של קמח עם מים', 'הוספת סוכר', 'אידוי הבצק', 'קירור מהיר'],
      en: ['Kneading flour with water', 'Adding sugar', 'Steaming the dough', 'Rapid chilling'],
    },
    correctIndex: 0,
    explanation: {
      he: 'לישה מחברת חלבוני גלוטן וגלוטנין בקמח חיטה, ויוצרת מבנה אלסטי.',
      en: 'Kneading links glutenin and gliadin proteins in wheat flour into an elastic network.',
    },
  },
  {
    id: 'proofing-dough',
    question: {
      he: 'מהו "התפחה" (proofing) של בצק?',
      en: 'What is proofing dough?',
    },
    options: {
      he: ['המתנה לבצק לעלות לפני אפייה', 'הקפאת הבצק', 'צלייה על הגריל', 'הוספת שמן לבצק'],
      en: ['Letting dough rise before baking', 'Freezing the dough', 'Grilling the dough', 'Adding oil to dough'],
    },
    correctIndex: 0,
    explanation: {
      he: 'התפחה מאפשרת לשמרים או למחמצת להמשיך לייצר פחמן דו-חמצני ולהגדיל את נפח הבצק.',
      en: 'Proofing lets yeast or leavening continue producing gas and increasing dough volume.',
    },
  },
  {
    id: 'baking-powder-vs-soda',
    question: {
      he: 'מה ההבדל העיקרי בין אבקת אפייה לסודה לשתייה?',
      en: 'What is the main difference between baking powder and baking soda?',
    },
    options: {
      he: ['אבקת אפייה כוללת חומצה מובנית', 'סודה לשתייה חזקה יותר תמיד', 'אבקת אפייה ללא גז', 'סודה לשתייה אינה מגיבה'],
      en: ['Baking powder includes built-in acid', 'Baking soda is always stronger', 'Baking powder has no gas', 'Baking soda does not react'],
    },
    correctIndex: 0,
    explanation: {
      he: 'אבקת אפייה היא תערובת של סודה לשתייה וחומצה; סודה לבדה דורשת חומציות בבצק.',
      en: 'Baking powder combines baking soda with acid; baking soda alone needs acidity in the batter.',
    },
  },
  {
    id: 'choux-pastry',
    question: {
      he: 'באיזה מאפה משתמשים בבצק שו (choux)?',
      en: 'Which pastry is made from choux dough?',
    },
    options: {
      he: ['אקלר וקרם פאף', 'קרואסון', 'פאי תפוחים', 'בראוניז'],
      en: ['Éclairs and cream puffs', 'Croissants', 'Apple pie', 'Brownies'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בצק שו מבושל קודם על הגז, ואז נאפה בתנור — ויוצר מאפים חלולים כמו אקלר.',
      en: 'Choux paste is cooked on the stovetop then baked, creating hollow pastries like éclairs.',
    },
  },
  {
    id: 'tempering-chocolate',
    question: {
      he: 'למה מטמפרים שוקולד?',
      en: 'Why is chocolate tempered?',
    },
    options: {
      he: ['לקבל ברק, קריספיות ויציבות', 'להוסיף מתיקות', 'להפוך אותו לנוזלי', 'להסיר קקאו'],
      en: ['For shine, snap and stability', 'To add sweetness', 'To make it runny', 'To remove cocoa'],
    },
    correctIndex: 0,
    explanation: {
      he: 'טמפרינג מסדר את גבישי חמאת הקקאו, כך שהשוקולד מבריק, נשבר בחדות ולא מתכתש.',
      en: 'Tempering aligns cocoa butter crystals so chocolate is glossy, snappy and resistant to bloom.',
    },
  },
  {
    id: 'meringue-base',
    question: {
      he: 'ממה עשויה מרנג בסיסית?',
      en: 'What is basic meringue made from?',
    },
    options: {
      he: ['חלבוני ביצים וסוכר', 'שמנת וסוכר', 'חמאה וקמח', 'שמרים וחלב'],
      en: ['Egg whites and sugar', 'Cream and sugar', 'Butter and flour', 'Yeast and milk'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מרנג מוקצף מחלבונים עם סוכר עד לתערובת יציבה, קלילה ומתוקה.',
      en: 'Meringue is whipped egg whites with sugar until light, stable and sweet.',
    },
  },
  {
    id: 'puff-pastry-layers',
    question: {
      he: 'מה יוצר את השכבות בבצק עלים?',
      en: 'What creates the layers in puff pastry?',
    },
    options: {
      he: ['שכבות חמאה בין דפי בצק', 'הוספת שמרים', 'אידוי הבצק', 'ערבוב עם מים בלבד'],
      en: ['Laminating butter between dough sheets', 'Adding yeast', 'Steaming the dough', 'Mixing with water only'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בצק עלים נוצר מקיפול חמאה לתוך הבצק; בחום, הלח שבחמאה הופך לאדים ומרים שכבות.',
      en: 'Puff pastry folds butter into dough; heat turns moisture to steam and lifts layers apart.',
    },
  },
  {
    id: 'custard-thickener',
    question: {
      he: 'מה מסמיך קרם פטיסייר (crème pâtissière) בדרך כלל?',
      en: 'What usually thickens crème pâtissière?',
    },
    options: {
      he: ['חלמוני ביצים וקמח או עמילן', 'שמרים', 'ג\'לטין בלבד', 'אבקת אפייה'],
      en: ['Egg yolks and flour or starch', 'Yeast', 'Gelatin only', 'Baking powder'],
    },
    correctIndex: 0,
    explanation: {
      he: 'קרם פטיסייר הוא קרם מתוק מבושל מחלמונים ועמילן — בסיס למילוי עוגות ומאפים.',
      en: 'Crème pâtissière is a cooked custard of yolks and starch, used to fill cakes and pastries.',
    },
  },
  {
    id: 'sourdough-starter',
    question: {
      he: 'מה מזין מחמצת (sourdough starter)?',
      en: 'What feeds a sourdough starter?',
    },
    options: {
      he: ['קמח ומים', 'סוכר וחלב', 'שמן זית בלבד', 'אבקת אפייה'],
      en: ['Flour and water', 'Sugar and milk', 'Olive oil only', 'Baking powder'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מחמצת היא תערובת חיה של שמרים וחיידקים טבעיים שמתחזקים במזון קבוע של קמח ומים.',
      en: 'A sourdough starter is a culture of wild yeast and bacteria maintained with flour and water.',
    },
  },
  {
    id: 'cardamom-origin',
    question: {
      he: 'מאיזו אזור מקורו ההל (cardamom)?',
      en: 'From which region does cardamom originate?',
    },
    options: {
      he: ['דרום הודו וסרי לנקה', 'מרוקו', 'מקסיקו', 'סקנדינביה'],
      en: ['Southern India and Sri Lanka', 'Morocco', 'Mexico', 'Scandinavia'],
    },
    correctIndex: 0,
    explanation: {
      he: 'הל הוא תבלין ארומטי שמקורו בדרום הודו ומשמש במטבחים אסייתיים ומזרח־תיכוניים.',
      en: 'Cardamom is an aromatic spice native to southern India, used across Asian and Middle Eastern cuisines.',
    },
  },
  {
    id: 'nutmeg-seed',
    question: {
      he: 'מאיזה חלק של הצמח מופקת אגוז המוסקט?',
      en: 'Which part of the plant is nutmeg?',
    },
    options: {
      he: ['גרעין פנימי של פרי', 'שורש', 'עלה יבש', 'פרח'],
      en: ['Inner seed of the fruit', 'Root', 'Dried leaf', 'Flower'],
    },
    correctIndex: 0,
    explanation: {
      he: 'אגוז המוסקט הוא הגרעין של פרי עץ המוסקט; המעטפת החיצונית נקראת מוסקט.',
      en: 'Nutmeg is the seed inside nutmeg fruit; its outer covering is mace.',
    },
  },
  {
    id: 'vanilla-orchid',
    question: {
      he: 'מאיזה סוג צמח מופקת וניל?',
      en: 'What type of plant produces vanilla?',
    },
    options: {
      he: ['סחלב', 'דקל', 'שיח תבלין', 'עץ הדר'],
      en: ['Orchid', 'Palm', 'Spice shrub', 'Citrus tree'],
    },
    correctIndex: 0,
    explanation: {
      he: 'וניל מגיע מקלי סחלב מסוג Vanilla, בעיקר ממדגסקר ומקסיקו.',
      en: 'Vanilla comes from pods of Vanilla orchids, especially from Madagascar and Mexico.',
    },
  },
  {
    id: 'cinnamon-bark',
    question: {
      he: 'מאיזה חלק של העץ מופק קינמון?',
      en: 'Which part of the tree is cinnamon?',
    },
    options: {
      he: ['קליפת עץ פנימית', 'שורש', 'זרעים', 'עלים'],
      en: ['Inner tree bark', 'Root', 'Seeds', 'Leaves'],
    },
    correctIndex: 0,
    explanation: {
      he: 'קינמון הוא קליפה פנימית מיובשת של עצי קינמון, שנקלפת ומגולגלת.',
      en: 'Cinnamon is dried inner bark from cinnamon trees, peeled and rolled into sticks.',
    },
  },
  {
    id: 'turmeric-color',
    question: {
      he: 'מה נותן לכורכום את צבעו הצהוב־כתום?',
      en: 'What gives turmeric its yellow-orange color?',
    },
    options: {
      he: ['החומר כורכומין', 'בטא-קרוטן בלבד', 'כלורופיל', 'אנתוציאנינים'],
      en: ['The compound curcumin', 'Beta-carotene only', 'Chlorophyll', 'Anthocyanins'],
    },
    correctIndex: 0,
    explanation: {
      he: 'כורכומין הוא הצבען הפעיל בכורכום, שמעניק לו את הגוון הצהוב-כתום.',
      en: 'Curcumin is the active pigment in turmeric, valued in cooking and traditional use.',
    },
  },
  {
    id: 'sumac-berry',
    question: {
      he: 'סומאק הוא תבלין מיובש ממה?',
      en: 'Sumac is a dried spice from what?',
    },
    options: {
      he: ['פירות עץ הסומאק', 'שורש ג\'ינג\'ר', 'זרעי כוסברה', 'פרחי זעפרן'],
      en: ['Sumac tree berries', 'Ginger root', 'Coriander seeds', 'Saffron flowers'],
    },
    correctIndex: 0,
    explanation: {
      he: 'סומאק עשוי מפירות מיובשים וטחונים, ומוסיף חמיצות עדינה למטבח המזרח־תיכוני.',
      en: 'Sumac is ground dried berries that add gentle tartness to Middle Eastern dishes.',
    },
  },
  {
    id: 'miso-paste',
    question: {
      he: 'ממה עשוי רוב מיסו?',
      en: 'What is most miso made from?',
    },
    options: {
      he: ['סויה מותססת ומלח', 'אורז בלבד', 'חיטה בלבד', 'עדשים'],
      en: ['Fermented soybeans and salt', 'Rice only', 'Wheat only', 'Lentils'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מיסו הוא רסק מותסס של פולי סויה (לעיתים עם דגן), בסיס למרקים ורטבים יפניים.',
      en: 'Miso is fermented soybean paste, sometimes with grain, used in Japanese soups and sauces.',
    },
  },
  {
    id: 'fish-sauce-country',
    question: {
      he: 'רוטב דגים (fish sauce) מזוהה במיוחד עם איזה אזור?',
      en: 'Fish sauce is especially associated with which region?',
    },
    options: {
      he: ['דרום־מזרח אסיה', 'צפון אירופה', 'האנדים', 'צפון אפריקה'],
      en: ['Southeast Asia', 'Northern Europe', 'The Andes', 'North Africa'],
    },
    correctIndex: 0,
    explanation: {
      he: 'רוטב דגים מותסס הוא מרכיב מרכזי במטבח תאילנדי, וייטנאמי וקמבודי.',
      en: 'Fermented fish sauce is essential in Thai, Vietnamese and Cambodian cooking.',
    },
  },
  {
    id: 'gochujang-base',
    question: {
      he: 'מהו המרכיב העיקרי בגוצ\'וג\'אנג?',
      en: 'What is the main ingredient in gochujang?',
    },
    options: {
      he: ['פלפל אדום מותסס', 'עגבניות טריות', 'חומץ תפוחים', 'שומשום'],
      en: ['Fermented red chili', 'Fresh tomatoes', 'Apple cider vinegar', 'Sesame'],
    },
    correctIndex: 0,
    explanation: {
      he: 'גוצ\'וג\'אנג הוא רסק פלפלים אדומים מותסס, מתוק-חריף, ומרכיב מרכזי במטבח הקוריאני.',
      en: 'Gochujang is a sweet-spicy fermented red chili paste central to Korean cuisine.',
    },
  },
  {
    id: 'harissa-origin',
    question: {
      he: 'חריסה היא רסק חריף שמקושר במיוחד לאיזה מדינה?',
      en: 'Harissa is a chili paste most linked to which country?',
    },
    options: {
      he: ['תוניסיה', 'יפן', 'ברזיל', 'שוודיה'],
      en: ['Tunisia', 'Japan', 'Brazil', 'Sweden'],
    },
    correctIndex: 0,
    explanation: {
      he: 'חריסה היא רסק חריף צפון-אפריקאי, עשיר בפלפלים, שום ותבלינים — ובמיוחד בתוניסיה.',
      en: 'Harissa is a North African chili paste rich in peppers, garlic and spices, especially Tunisian.',
    },
  },
  {
    id: 'ghee-clarified',
    question: {
      he: 'מהו גהי (ghee)?',
      en: 'What is ghee?',
    },
    options: {
      he: ['חמאה מזוקקת ללא מים ומוצקים', 'שמן זית מעושן', 'חלב עשיר', 'גבינה קשה'],
      en: ['Clarified butter without water and milk solids', 'Smoked olive oil', 'Rich milk', 'Hard cheese'],
    },
    correctIndex: 0,
    explanation: {
      he: 'גהי נוצר מחמאה שמבושלת עד הפרדת המוצקים, ושכיח במטבח ההודי.',
      en: 'Ghee is butter cooked until milk solids separate, widely used in Indian cooking.',
    },
  },
  {
    id: 'mirin-type',
    question: {
      he: 'מהו מירין במטבח היפני?',
      en: 'What is mirin in Japanese cooking?',
    },
    options: {
      he: ['יין אורז מתוק לבישול', 'רוטב סויה', 'אבקת וואסאבי', 'מרק דאשי'],
      en: ['Sweet rice wine for cooking', 'Soy sauce', 'Wasabi powder', 'Dashi broth'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מירין מוסיף מתיקות עדינה וגימור מבריק לרטבים, מרינדות ותבשילים יפניים.',
      en: 'Mirin adds gentle sweetness and gloss to Japanese sauces, marinades and simmered dishes.',
    },
  },
  {
    id: 'nori-seaweed',
    question: {
      he: 'נורי, שעוטף סושי, עשוי ממה?',
      en: 'Nori, used to wrap sushi, is made from what?',
    },
    options: {
      he: ['אצות ים מיובשות', 'אורז דחוס', 'בצק סויה', 'עלי תה'],
      en: ['Dried seaweed', 'Pressed rice', 'Soy dough', 'Tea leaves'],
    },
    correctIndex: 0,
    explanation: {
      he: 'נורי הוא אצת ים אדומה מיובשת וקלויה, דקה וקריספית.',
      en: 'Nori is thin, crisp dried and toasted red seaweed sheets.',
    },
  },
  {
    id: 'tofu-coagulant',
    question: {
      he: 'איך מייצרים טופו מחלב סויה?',
      en: 'How is tofu made from soy milk?',
    },
    options: {
      he: ['באמצעות גירוי (קואגולציה)', 'באידוי בלבד', 'בהקפאה', 'בטיגון עמוק'],
      en: ['By coagulation', 'By steaming only', 'By freezing', 'By deep frying'],
    },
    correctIndex: 0,
    explanation: {
      he: 'טופו נוצר כשמוסיפים חומר גירוי (קואגולנט) לחלב סויה, והחלבונים מתגבשים לגוש רך.',
      en: 'Tofu forms when a coagulant is added to soy milk and proteins set into soft curds.',
    },
  },
  {
    id: 'edamame-stage',
    question: {
      he: 'אדממה הם פולי סויה ב...',
      en: 'Edamame are soybeans at what stage?',
    },
    options: {
      he: ['בשלב לא בוגר, לפני ייבוש', 'אחרי ייבוש מלא', 'מותססים', 'טחונים לאבקה'],
      en: ['Immature stage before drying', 'After full drying', 'Fermented', 'Ground to powder'],
    },
    correctIndex: 0,
    explanation: {
      he: 'אדממה הם פולי סויה ירוקים צעירים שמבושלים ומוגשים שלמים בקליפה.',
      en: 'Edamame are young green soybeans cooked and served whole in the pod.',
    },
  },
  {
    id: 'risotto-rice',
    question: {
      he: 'איזה אורז משמש לריזוטו?',
      en: 'Which rice is used for risotto?',
    },
    options: {
      he: ['ארבוריו', 'בסמטי', 'יסמין', 'אורז בר'],
      en: ['Arborio', 'Basmati', 'Jasmine', 'Wild rice'],
    },
    correctIndex: 0,
    explanation: {
      he: 'ארבוריו וזנים דומים עשירים בעמילן ויוצרים מרקם קרמי בבישול איטי.',
      en: 'Arborio and similar varieties are starchy and become creamy when cooked slowly.',
    },
  },
  {
    id: 'polenta-grain',
    question: {
      he: 'ממה עשויה פולנטה מסורתית?',
      en: 'What is traditional polenta made from?',
    },
    options: {
      he: ['קמח תירס', 'קמח חיטה', 'קמח שעורה', 'קמח אורז'],
      en: ['Cornmeal', 'Wheat flour', 'Barley flour', 'Rice flour'],
    },
    correctIndex: 0,
    explanation: {
      he: 'פולנטה היא תבשיל איטלקי מקמח תירס גס או דק שמבושל במים או בחלב.',
      en: 'Polenta is an Italian dish of coarse or fine cornmeal cooked in water or milk.',
    },
  },
  {
    id: 'gnocchi-base',
    question: {
      he: 'ממה עשויים ניוקי מסורתיים?',
      en: 'What are traditional gnocchi made from?',
    },
    options: {
      he: ['תפוחי אדמה, קמח וביצה', 'אורז וחלב', 'קמח חומוס', 'בצק שמרים בלבד'],
      en: ['Potatoes, flour and egg', 'Rice and milk', 'Chickpea flour', 'Yeast dough only'],
    },
    correctIndex: 0,
    explanation: {
      he: 'ניוקי תפוחי אדמה הם כדורי בצק רכים מבוססי תפוחי אדמה מבושלים.',
      en: 'Potato gnocchi are soft dumplings made from cooked potatoes, flour and egg.',
    },
  },
  {
    id: 'paella-pan',
    question: {
      he: 'פאייה מסורתית מבושלת באיזה כלי?',
      en: 'Traditional paella is cooked in which pan?',
    },
    options: {
      he: ['מחבת רחבה ורדודה', 'סיר עמוק עם מכסה', 'תבנית אפייה גבוהה', 'סיר לחץ'],
      en: ['Wide shallow pan', 'Deep lidded pot', 'Tall baking dish', 'Pressure cooker'],
    },
    correctIndex: 0,
    explanation: {
      he: 'פאייה מבושלת במחבת רחבה ושטוחה, כדי שהנוזלים יתאדו בצורה אחידה ותיווצר שכבה פריכה בתחתית.',
      en: 'Paella cooks in a wide pan so liquid evaporates evenly and the bottom can crisp.',
    },
  },
  {
    id: 'tagine-dish',
    question: {
      he: 'מה מאפיין בישול בטאג\'ין מרוקאי?',
      en: 'What characterizes cooking in a Moroccan tagine?',
    },
    options: {
      he: ['בישול איטי עם אדים במכסה חרוטי', 'טיגון מהיר בשמן עמוק', 'צלייה על גחלים', 'אידוי בלחץ'],
      en: ['Slow cooking with steam in a conical lid', 'Quick deep frying', 'Grilling over coals', 'Pressure steaming'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בטאג\'ין מבשלים לאט; המכסה החרוטי מחזיר את האדים אל התבשיל ושומר על לחות וטעמים.',
      en: 'A tagine is both a pot and a style of slow-cooked dishes with spices, dried fruit and vegetables.',
    },
  },
  {
    id: 'injera-teff',
    question: {
      he: 'ממה עשויה אינג\'רה, לחם דק מאתיופיה?',
      en: 'What is Ethiopian injera bread made from?',
    },
    options: {
      he: ['קמח טף מותסס', 'קמח חיטה לבן', 'תירס בלבד', 'אורז דחוס'],
      en: ['Fermented teff flour', 'White wheat flour', 'Corn only', 'Pressed rice'],
    },
    correctIndex: 0,
    explanation: {
      he: 'אינג\'רה מכינים מבלילת טף מותססת, והיא משמשת גם כ"צלחת" לאוכל.',
      en: 'Injera is a spongy flatbread from fermented teff batter and doubles as an edible plate.',
    },
  },
  {
    id: 'feijoada-country',
    question: {
      he: 'פייז\'ואדה היא מנה לאומית מסורתית של איזו מדינה?',
      en: 'Feijoada is a traditional national dish of which country?',
    },
    options: {
      he: ['ברזיל', 'ספרד', 'טורקיה', 'תאילנד'],
      en: ['Brazil', 'Spain', 'Turkey', 'Thailand'],
    },
    correctIndex: 0,
    explanation: {
      he: 'פייז\'ואדה ברזילאית היא תבשיל עשיר של שעועית שחורה עם בשר, מזוהה עם המטבח הברזילאי.',
      en: 'Brazilian feijoada is a hearty black-bean stew with meat, iconic in Brazilian cuisine.',
    },
  },
  {
    id: 'ceviche-cure',
    question: {
      he: 'איך "מבשלים" דגים בסביצ\'ה?',
      en: 'How are fish "cooked" in ceviche?',
    },
    options: {
      he: ['במיץ ליים חומצי', 'במים רותחים', 'בתנור גבוה', 'בשמן עמוק'],
      en: ['In acidic lime juice', 'In boiling water', 'In a hot oven', 'In deep oil'],
    },
    correctIndex: 0,
    explanation: {
      he: 'חומציות הליים משנה את מבנה החלבונים בדג ונותנת לו מרקם של דג מבושל.',
      en: 'Lime acidity denatures fish proteins, giving a texture similar to light cooking.',
    },
  },
  {
    id: 'mole-sauce',
    question: {
      he: 'מולה מקסיקני מסורתי מכיל לרוב...',
      en: 'Traditional Mexican mole usually contains...',
    },
    options: {
      he: ['צ\'ילי, תבלינים ולעיתים שוקולד', 'רק עגבניות ושמן', 'יוגורט ומנטה', 'חומץ וסוכר בלבד'],
      en: ['Chilies, spices and sometimes chocolate', 'Only tomatoes and oil', 'Yogurt and mint', 'Vinegar and sugar only'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מולה הוא רוטב מורכב מצ\'ילי, תבלינים, אגוזים ולעיתים שוקולד, כמו במולה פובלנה.',
      en: 'Mole is a complex sauce of chilies, spices, nuts and sometimes chocolate, as in mole poblano.',
    },
  },
  {
    id: 'pho-broth',
    question: {
      he: 'מהו הבסיס המרכזי של מרק פו וייטנאמי?',
      en: 'What is the central base of Vietnamese pho broth?',
    },
    options: {
      he: ['מרק עצמות ארוך בישול', 'רוטב עגבניות', 'חלב קוקוס', 'מרק ירקות מיידי'],
      en: ['Long-simmered bone broth', 'Tomato sauce', 'Coconut milk', 'Instant vegetable broth'],
    },
    correctIndex: 0,
    explanation: {
      he: 'פו מבוסס על ציר עצמות ארוך, שמבושל שעות עם תבלינים כמו אניס כוכבים וקינמון.',
      en: 'Pho relies on a rich bone broth simmered for hours with spices like star anise and cinnamon.',
    },
  },
  {
    id: 'biryani-style',
    question: {
      he: 'ביריאני הוא מנה שמשלבת בעיקר...',
      en: 'Biryani is a dish that mainly combines...',
    },
    options: {
      he: ['אורז מתובל עם בשר או ירקות', 'פסטה ברוטב עגבניות', 'לחם שטוח עם חומוס', 'מרק אטריות בלבד'],
      en: ['Spiced rice with meat or vegetables', 'Pasta in tomato sauce', 'Flatbread with hummus', 'Noodle soup only'],
    },
    correctIndex: 0,
    explanation: {
      he: 'ביריאני הוא תבשיל אורז מתובל בשכבות, פופולרי במטבח ההודי והפקיסטני.',
      en: 'Biryani is a layered spiced rice dish popular across Indian and Pakistani cooking.',
    },
  },
  {
    id: 'tzatziki-base',
    question: {
      he: 'מהו המרכיב העיקרי בצאציקי?',
      en: 'What is the main ingredient in tzatziki?',
    },
    options: {
      he: ['יוגורט', 'טחינה', 'גבינת פטה', 'חמאת בוטנים'],
      en: ['Yogurt', 'Tahini', 'Feta cheese', 'Peanut butter'],
    },
    correctIndex: 0,
    explanation: {
      he: 'צאציקי הוא רוטב יווני מיוגורט, מלפפון, שום ושמן זית.',
      en: 'Tzatziki is a Greek sauce of yogurt, cucumber, garlic and olive oil.',
    },
  },
  {
    id: 'falafel-legume',
    question: {
      he: 'ממה עשויים פלאפל מסורתיים?',
      en: 'What are traditional falafel made from?',
    },
    options: {
      he: ['גרגרי חומוס או פול', 'תפוחי אדמה', 'קמח חיטה', 'אורז'],
      en: ['Chickpeas or fava beans', 'Potatoes', 'Wheat flour', 'Rice'],
    },
    correctIndex: 0,
    explanation: {
      he: 'פלאפל הוא כדורי קטניות טחונות מתובלים שמטוגנים או נאפים.',
      en: 'Falafel are seasoned ground legume balls that are fried or baked.',
    },
  },
  {
    id: 'shakshuka-origin',
    question: {
      he: 'שקשוקה היא מנה שמקושרת במיוחד לאיזה אזור?',
      en: 'Shakshuka is a dish most linked to which region?',
    },
    options: {
      he: ['צפון אפריקה והמזרח התיכון', 'יפן', 'סקוטלנד', 'פרו'],
      en: ['North Africa and the Middle East', 'Japan', 'Scotland', 'Peru'],
    },
    correctIndex: 0,
    explanation: {
      he: 'שקשוקה היא ביצים ברוטב עגבניות ופלפלים, פופולרית בישראל, תוניסיה ומטבחים שכנים.',
      en: 'Shakshuka is eggs poached in a tomato-pepper sauce, popular across Israel, Tunisia and nearby cuisines.',
    },
  },
  {
    id: 'iron-spinach',
    question: {
      he: 'איזה מינרל מצוי בכמות טובה בתרד?',
      en: 'Which mineral is found in good amounts in spinach?',
    },
    options: {
      he: ['ברזל', 'סידן בלבד', 'יוד', 'נתרן'],
      en: ['Iron', 'Calcium only', 'Iodine', 'Sodium'],
    },
    correctIndex: 0,
    explanation: {
      he: 'תרד עשיר בברזל, אם כי ספיגתו מושפעת גם מחומצות וממרכיבים אחרים במזון.',
      en: 'Spinach is rich in iron, though absorption is influenced by oxalates and other compounds.',
    },
  },
  {
    id: 'potassium-banana',
    question: {
      he: 'בננה ידועה כמקור טוב ל...',
      en: 'Bananas are known as a good source of...',
    },
    options: {
      he: ['אשלגן', 'ויטמין D', 'ויטמין B12', 'חומצות שומן אומגה-3'],
      en: ['Potassium', 'Vitamin D', 'Vitamin B12', 'Omega-3 fatty acids'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בננות מספקות אשלגן, שחשוב לתפקוד שרירים ולשמירה על לחץ דם תקין.',
      en: 'Bananas provide potassium, important for muscle function and healthy blood pressure.',
    },
  },
  {
    id: 'fiber-oats',
    question: {
      he: 'איזה סוג סיבים בולט בשיבולת שועל?',
      en: 'Which type of fiber is notable in oats?',
    },
    options: {
      he: ['בטא-גלוקן', 'פקטין בלבד', 'צלולוז בלבד', 'אין סיבים כלל'],
      en: ['Beta-glucan', 'Pectin only', 'Cellulose only', 'No fiber at all'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בטא-גלוקן בשיבולת שועל קשור לתחושת שובע ולתמיכה ברמות כולסטרול.',
      en: 'Oat beta-glucan is linked to satiety and support for healthy cholesterol levels.',
    },
  },
  {
    id: 'omega3-salmon',
    question: {
      he: 'סלמון עשיר במיוחד ב...',
      en: 'Salmon is especially rich in...',
    },
    options: {
      he: ['חומצות שומן אומגה-3', 'ויטמין C', 'פחמימות מורכבות', 'סוכר טבעי'],
      en: ['Omega-3 fatty acids', 'Vitamin C', 'Complex carbohydrates', 'Natural sugar'],
    },
    correctIndex: 0,
    explanation: {
      he: 'דגים שמנים כמו סלמון מספקים אומגה-3, בעיקר EPA ו-DHA.',
      en: 'Fatty fish like salmon supply omega-3 fats, especially EPA and DHA.',
    },
  },
  {
    id: 'probiotic-yogurt',
    question: {
      he: 'מה הופך יוגורט ל"פרוביוטי"?',
      en: 'What makes yogurt "probiotic"?',
    },
    options: {
      he: ['חיידקים חיים מועילים', 'ויטמינים מוספים', 'סוכר גבוה', 'קפאין'],
      en: ['Live beneficial bacteria', 'Added vitamins', 'High sugar', 'Caffeine'],
    },
    correctIndex: 0,
    explanation: {
      he: 'יוגורט פרוביוטי מכיל תרביות חיות של חיידקים כמו Lactobacillus ו-Bifidobacterium.',
      en: 'Probiotic yogurt contains live cultures such as Lactobacillus and Bifidobacterium.',
    },
  },
  {
    id: 'vitamin-k-kale',
    question: {
      he: 'קייל (kale) עשיר במיוחד ב...',
      en: 'Kale is especially rich in...',
    },
    options: {
      he: ['ויטמין K', 'ויטמין B12', 'ויטמין D', 'יוד'],
      en: ['Vitamin K', 'Vitamin B12', 'Vitamin D', 'Iodine'],
    },
    correctIndex: 0,
    explanation: {
      he: 'קייל וירקות עלים כהים אחרים מספקים ויטמין K, חשוב לקרישת דם ולבריאות העצמות.',
      en: 'Kale and other dark greens provide vitamin K, important for clotting and bone health.',
    },
  },
  {
    id: 'folate-lentils',
    question: {
      he: 'עדשים הן מקור טוב ל...',
      en: 'Lentils are a good source of...',
    },
    options: {
      he: ['חומצה פולית (פולאט)', 'ויטמין D', 'כולסטרול', 'קפאין'],
      en: ['Folate', 'Vitamin D', 'Cholesterol', 'Caffeine'],
    },
    correctIndex: 0,
    explanation: {
      he: 'עדשים וקטניות אחרות עשירות בחומצה פולית, חשובה לתאים מתחלקים.',
      en: 'Lentils and other legumes are rich in folate, important for dividing cells.',
    },
  },
  {
    id: 'lycopene-tomato',
    question: {
      he: 'מהו ליקופן, שנמצא בעגבניות?',
      en: 'What is lycopene, found in tomatoes?',
    },
    options: {
      he: ['פיגמנט אנטי-אוקסידנטי', 'סוג של סוכר', 'חלבון מהצומח', 'נתרן'],
      en: ['An antioxidant pigment', 'A type of sugar', 'Plant protein', 'Sodium'],
    },
    correctIndex: 0,
    explanation: {
      he: 'ליקופן נותן לעגבניות את הגוון האדום, והוא ידוע כנוגד חמצון.',
      en: 'Lycopene gives tomatoes their red color and is studied for antioxidant properties.',
    },
  },
  {
    id: 'capsaicin-heat',
    question: {
      he: 'מה גורם לחריפות בפלפל צ\'ילי?',
      en: 'What causes the heat in chili peppers?',
    },
    options: {
      he: ['קפסאיצין', 'ויטמין C', 'סוכר', 'גלוטן'],
      en: ['Capsaicin', 'Vitamin C', 'Sugar', 'Gluten'],
    },
    correctIndex: 0,
    explanation: {
      he: 'קפסאיצין הוא התרכובת שמגרה קולטני חום ויוצרת תחושת חריפות.',
      en: 'Capsaicin is the compound that stimulates heat receptors and creates spiciness.',
    },
  },
  {
    id: 'pectin-jam',
    question: {
      he: 'מה תפקיד הפקטין בריבה?',
      en: 'What is pectin\'s role in jam?',
    },
    options: {
      he: ['מסייע להגבשה ולמרקם מוצק', 'מוסיף חריפות', 'מונע התססה לחלוטין', 'מחליף סוכר'],
      en: ['Helps set and firm texture', 'Adds spiciness', 'Completely prevents fermentation', 'Replaces sugar'],
    },
    correctIndex: 0,
    explanation: {
      he: 'פקטין, שקיים בפירות כמו תפוחים והדרים, עוזר לריבה להתמצק עם סוכר וחום.',
      en: 'Pectin in fruits like apples and citrus helps jam set with sugar and heat.',
    },
  },
  {
    id: 'emulsify-mayo',
    question: {
      he: 'מהו המרכיב שמייצב מיונז כאמולסיה?',
      en: 'What ingredient stabilizes mayonnaise as an emulsion?',
    },
    options: {
      he: ['חלמון ביצה', 'קמח', 'אבקת אפייה', 'שמרים'],
      en: ['Egg yolk', 'Flour', 'Baking powder', 'Yeast'],
    },
    correctIndex: 0,
    explanation: {
      he: 'לציטין בחלמון מסייע לשמן ולחומץ (או מיץ לימון) להתמזג לתערובת יציבה וקרמית.',
      en: 'Lecithin in egg yolk helps oil and acid blend into a stable creamy emulsion.',
    },
  },
  {
    id: 'denature-egg-white',
    question: {
      he: 'מה קורה לחלבון ביצה כשמבשלים אותו?',
      en: 'What happens to egg protein when it is cooked?',
    },
    options: {
      he: ['המבנה שלו משתנה והוא מתמצק', 'הוא נעלם לחלוטין', 'הופך לסוכר', 'הופך לשומן'],
      en: ['It denatures and sets', 'It disappears completely', 'It turns into sugar', 'It turns into fat'],
    },
    correctIndex: 0,
    explanation: {
      he: 'חום משנה את מבנה החלבון, ולכן חלבון הביצה הופך משקוף ללבן מוצק.',
      en: 'Heat changes protein structure, turning translucent egg white into solid white.',
    },
  },
  {
    id: 'caramelization-sugar',
    question: {
      he: 'מהו קרמליזציה?',
      en: 'What is caramelization?',
    },
    options: {
      he: ['הזהבה ושינוי טעם של סוכר בחום', 'התססת ירקות', 'הקפאת שומן', 'ריכוך בשר במים'],
      en: ['Browning and flavor change of sugar with heat', 'Fermenting vegetables', 'Freezing fat', 'Softening meat in water'],
    },
    correctIndex: 0,
    explanation: {
      he: 'קרמליזציה היא תהליך שבו סוכר מתפרק ומפתח טעמים וצבעים עשירים.',
      en: 'Caramelization is when sugar breaks down under heat, developing rich flavors and colors.',
    },
  },
  {
    id: 'smoke-point-oil',
    question: {
      he: 'מהו "נקודת עישון" של שמן?',
      en: 'What is an oil\'s smoke point?',
    },
    options: {
      he: ['הטמפרטורה שבה השמן מתחיל לעשן', 'הטמפרטורה שבה השמן קופא', 'כמות השומן בביצה', 'זמן אחסון מקסימלי'],
      en: ['The temperature when oil starts smoking', 'The temperature when oil freezes', 'Fat amount in an egg', 'Maximum storage time'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מעל נקודת העישון השמן מתחיל להתפרק ולפתח טעם מר; חשוב לבחור שמן מתאים לחום הגבוה.',
      en: 'Above the smoke point oil breaks down and tastes harsh; choosing the right oil matters for frying.',
    },
  },
  {
    id: 'kosher-salt-grain',
    question: {
      he: 'למה שפים אוהבים מלח כשר (kosher salt)?',
      en: 'Why do chefs like kosher salt?',
    },
    options: {
      he: ['גרגרים גדולים וקל לתבל ביד', 'הוא מלוח פי שניים', 'אין בו נתרן', 'הוא מחליף סוכר'],
      en: ['Large grains easy to pinch', 'It is twice as salty', 'It has no sodium', 'It replaces sugar'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מלח כשר, עם גרגרים גדולים, מאפשר לתבל ביד בצורה מדויקת יותר.',
      en: 'Kosher salt\'s larger crystals give better control when seasoning by hand.',
    },
  },
  {
    id: 'al-dente-pasta',
    question: {
      he: 'מה פירוש "אל דנטה" בפסטה?',
      en: 'What does "al dente" mean for pasta?',
    },
    options: {
      he: ['מבושל אך עדיין קצת נעכש', 'רך לחלוטין', 'לא מבושל כלל', 'מטוגן בשמן'],
      en: ['Cooked but still firm to bite', 'Completely soft', 'Completely raw', 'Fried in oil'],
    },
    correctIndex: 0,
    explanation: {
      he: '"אל דנטה" פירושו "לשן" — פסטה עם מרקם קלות קשה במרכז, כפי שאוהבים באיטליה.',
      en: '"Al dente" means "to the tooth"—pasta with a slight firmness at the center, as preferred in Italy.',
    },
  },
  {
    id: 'wok-hei',
    question: {
      he: 'מהו "ווק היי" (wok hei) במטבח הסיני?',
      en: 'What is "wok hei" in Chinese cooking?',
    },
    options: {
      he: ['ניחוח מעושן מטיגון מהיר בווק', 'מרינדה מתוקה', 'רוטב סויה מיושן', 'תערובת תבלינים יבשה'],
      en: ['Smoky flavor from fast wok cooking', 'Sweet marinade', 'Aged soy sauce', 'Dry spice mix'],
    },
    correctIndex: 0,
    explanation: {
      he: 'ווק היי ("נשימת הווק") מתקבל מטיגון מהיר בלהבה חזקה, ומעניק ניחוח מעושן וקלוי.',
      en: 'Wok hei, or "breath of the wok," comes from intense fast stir-frying and a lightly charred aroma.',
    },
  },
  {
    id: 'zest-citrus',
    question: {
      he: 'מהו "זסט" (zest) של הדר?',
      en: 'What is citrus zest?',
    },
    options: {
      he: ['הקליפה החיצונית העשירה בשמנים', 'המיץ בלבד', 'הגבעול', 'הזרעים'],
      en: ['The outer peel rich in oils', 'Juice only', 'The stem', 'The seeds'],
    },
    correctIndex: 0,
    explanation: {
      he: 'זסט הוא שכבת הקליפה הצבעונית, בלי החלק הלבן המר — ומוסיף ניחוח חזק.',
      en: 'Zest is the colored outer peel without bitter white pith, adding intense aroma.',
    },
  },
  {
    id: 'reduce-sauce',
    question: {
      he: 'מה עושה "רדוקציה" (reduction) לרוטב?',
      en: 'What does reducing a sauce do?',
    },
    options: {
      he: ['מסמיך ומרכז את הטעמים', 'מוסיף מים', 'מקפיא את הרוטב', 'מסיר את כל המלח'],
      en: ['Thickens and intensifies flavors', 'Adds water', 'Freezes the sauce', 'Removes all salt'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בישול ארוך גורם לאידוי נוזלים ומעשיר את הטעם — למשל ברוטב בלסמי מצומצם או בציר עשיר.',
      en: 'Long simmering evaporates liquid and concentrates flavors, as in balsamic reduction or rich stock.',
    },
  },
  {
    id: 'bain-marie',
    question: {
      he: 'מהו באן מארי (bain-marie)?',
      en: 'What is a bain-marie?',
    },
    options: {
      he: ['חימום או אפייה במים חמים', 'טיגון בשמן עמוק', 'צלייה ישירה', 'הקפאה מהירה'],
      en: ['Heating or baking in hot water', 'Deep frying', 'Direct grilling', 'Flash freezing'],
    },
    correctIndex: 0,
    explanation: {
      he: 'באן-מארי מחמם בעדינות — שיטה נפוצה להמסת שוקולד, הכנת קרמים ואפיית עוגות עדינות.',
      en: 'A bain-marie provides gentle heat, common for melting chocolate, custards and delicate cakes.',
    },
  },
  {
    id: 'knife-honing',
    question: {
      he: 'מה עושה השחזה (honing) של סכין?',
      en: 'What does honing a knife do?',
    },
    options: {
      he: ['מיישרת את קצה הלהב', 'מסירה חלקים מהלהב', 'מחליפה את הידית', 'מונעת חלודה לחלוטין'],
      en: ['Realigns the blade edge', 'Removes metal from the blade', 'Replaces the handle', 'Completely prevents rust'],
    },
    correctIndex: 0,
    explanation: {
      he: 'השחזה על משחיז פלדה מיישרת את הקצה; הדקה מסירה מתכת ויוצרת קצה חדש.',
      en: 'Honing on a steel realigns the edge; sharpening removes metal to create a new edge.',
    },
  },
  {
    id: 'gelato-difference',
    question: {
      he: 'מה מבדיל ג\'לטו מגלידה אמריקאית?',
      en: 'What distinguishes gelato from American ice cream?',
    },
    options: {
      he: ['פחות שומן ויותר צפיפות', 'יותר אוויר תמיד', 'ללא סוכר', 'עשוי ממים בלבד'],
      en: ['Less fat and denser texture', 'Always more air', 'No sugar', 'Made from water only'],
    },
    correctIndex: 0,
    explanation: {
      he: 'ג\'לטו איטלקי מכיל בדרך כלל פחות שומן ומוגש בטמפרטורה מעט גבוהה יותר, ולכן רך וצפוף.',
      en: 'Italian gelato usually has less fat and is served slightly warmer, making it soft and dense.',
    },
  },
  {
    id: 'sorbet-base',
    question: {
      he: 'ממה עשוי סורבה קלאסי?',
      en: 'What is classic sorbet made from?',
    },
    options: {
      he: ['מיץ פירות, מים וסוכר', 'שמנת וחלב', 'חלמונים וחמאה', 'קמח ושמרים'],
      en: ['Fruit juice, water and sugar', 'Cream and milk', 'Yolks and butter', 'Flour and yeast'],
    },
    correctIndex: 0,
    explanation: {
      he: 'סורבה הוא קינוח קפוא ללא חלב, מבוסס פירות וסירופ סוכר.',
      en: 'Sorbet is a dairy-free frozen dessert based on fruit and sugar syrup.',
    },
  },
  {
    id: 'tiramisu-meaning',
    question: {
      he: 'מה פירוש השם "טירמיסו"?',
      en: 'What does the name "tiramisu" mean?',
    },
    options: {
      he: ['הרימו אותי', 'מתוק כמו שוקולד', 'עוגת קפה', 'מאפה איטלקי'],
      en: ['Pick me up', 'Sweet like chocolate', 'Coffee cake', 'Italian pastry'],
    },
    correctIndex: 0,
    explanation: {
      he: 'השם "טירמיסו" מגיע מהביטוי האיטלקי tirami su – "הרימו אותי", בהתייחס לאנרגיה של הקפה והסוכר.',
      en: 'Tiramisu comes from "tirami su"—"pick me up," referring to coffee and sugar energy.',
    },
  },
  {
    id: 'macaron-vs-macaroon',
    question: {
      he: 'מקרון צרפתי מבוסס בעיקר על...',
      en: 'French macarons are mainly based on...',
    },
    options: {
      he: ['אבקת שקדים וחלבוני ביצים', 'קמח חיטה ושמרים', 'קוקוס וחלב מרוכז', 'תפוחי אדמה'],
      en: ['Almond flour and egg whites', 'Wheat flour and yeast', 'Coconut and condensed milk', 'Potatoes'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מקרון צרפתי הוא כרית שקדים דקה עם מילוי קרמי, שונה ממקרון קוקוס אמריקאי.',
      en: 'French macarons are delicate almond meringue shells with creamy filling, unlike coconut macaroons.',
    },
  },
  {
    id: 'creme-brulee-top',
    question: {
      he: 'מה מאפיין את השכבה העליונה בקרם ברולה?',
      en: 'What characterizes the top of crème brûlée?',
    },
    options: {
      he: ['שכבת סוכר מקורמלת ופריכה', 'ציפוי שוקולד', 'פירות טריים', 'קרמבו מלוח'],
      en: ['A caramelized crisp sugar layer', 'Chocolate coating', 'Fresh fruit', 'Salty crumble'],
    },
    correctIndex: 0,
    explanation: {
      he: 'קרם ברולה מוגמר בצריבת סוכר שיוצר קרום פריך מעל קרם וניל רך.',
      en: 'Crème brûlée is finished by torching sugar into a crisp crust over soft vanilla custard.',
    },
  },
  {
    id: 'baklava-layers',
    question: {
      he: 'בקלווה בנויה בעיקר משכבות של...',
      en: 'Baklava is mainly built from layers of...',
    },
    options: {
      he: ['בצק פילו, אגוזים וסירופ מתוק', 'אורז וחלב', 'שוקולד וקרם', 'תפוחי אדמה וגבינה'],
      en: ['Phyllo dough, nuts and sweet syrup', 'Rice and milk', 'Chocolate and cream', 'Potatoes and cheese'],
    },
    correctIndex: 0,
    explanation: {
      he: 'בקלווה היא ממתק מזרח־תיכוני של דפי בצק דקים, אגוזים ודבש או סירופ.',
      en: 'Baklava is a Middle Eastern pastry of thin phyllo, nuts and honey or syrup.',
    },
  },
  {
    id: 'panna-cotta-set',
    question: {
      he: 'מה מגבש פנה קוטה?',
      en: 'What sets panna cotta?',
    },
    options: {
      he: ['ג\'לטין', 'שמרים', 'אבקת אפייה', 'גלוטן'],
      en: ['Gelatin', 'Yeast', 'Baking powder', 'Gluten'],
    },
    correctIndex: 0,
    explanation: {
      he: 'פנה קוטה הוא קינוח איטלקי מבוסס שמנת שמתמצק עם ג\'לטין ומוגש קר.',
      en: 'Panna cotta is an Italian cream dessert set with gelatin and served chilled.',
    },
  },
  {
    id: 'flan-custard',
    question: {
      he: 'פלאן ספרדי/לטיני הוא בעיקר...',
      en: 'Spanish/Latin flan is mainly...',
    },
    options: {
      he: ['קרם ביצים אפוי עם קרמל', 'עוגת שוקולד', 'לחם מטוגן', 'מרינדה חריפה'],
      en: ['Baked egg custard with caramel', 'Chocolate cake', 'Fried bread', 'Spicy marinade'],
    },
    correctIndex: 0,
    explanation: {
      he: 'פלאן הוא קינוח קרמי אפוי עם שכבת קרמל מתוקה בתחתית.',
      en: 'Flan is a baked custard dessert with a sweet caramel layer underneath.',
    },
  },
  {
    id: 'matcha-powder',
    question: {
      he: 'מהו מאצ\'ה?',
      en: 'What is matcha?',
    },
    options: {
      he: ['אבקת תה ירוק טחונה דק', 'תבלין מיובש מפלפל', 'סוכר יפני', 'אבקת אורז'],
      en: ['Finely ground green tea powder', 'Dried chili spice', 'Japanese sugar', 'Rice powder'],
    },
    correctIndex: 0,
    explanation: {
      he: 'מאצ\'ה הוא אבקת תה ירוק מעלי תה שהוצלו לפני הקטיף — משמש בתה היפני ובקינוחים.',
      en: 'Matcha is shade-grown green tea ground to powder, used in Japanese tea and desserts.',
    },
  },
  {
    id: 'dashi-base',
    question: {
      he: 'מהו דאשי, בסיס מרקים יפניים?',
      en: 'What is dashi, the base of Japanese soups?',
    },
    options: {
      he: ['ציר מעלה קומבו ופתיתי בוניטו', 'רוטב עגבניות', 'חלב קוקוס', 'מרק עוף מוצל'],
      en: ['Broth from kombu kelp and bonito flakes', 'Tomato sauce', 'Coconut milk', 'Instant chicken soup'],
    },
    correctIndex: 0,
    explanation: {
      he: 'דאשי מעניק אומאמי עדין ומהווה בסיס למיסו, ראמן ועוד תבשילים יפניים רבים.',
      en: 'Dashi gives gentle umami and forms the base for miso, ramen and many Japanese dishes.',
    },
  },
];
