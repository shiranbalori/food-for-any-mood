"""Localized fallback recipe templates for mock / validation fallback paths."""

from __future__ import annotations

from typing import Literal

Category = Literal["dairy", "meat", "parve"]
RecipeType = Literal["meal", "dessert"]
Language = Literal["he", "en"]

CATEGORY_RECIPES_HE: dict[Category, dict] = {
    "dairy": {
        "name": "פסטה שמנת פטריות",
        "base_ingredients": ["פסטה", "שמנת מתוקה", "שום", "פטריות", "פרמזן", "חמאה"],
        "steps": [
            "מרתיחים סיר גדול עם מים מומלחים ומבשלים את הפסטה עד אל דנטה.",
            "מקפיצים שום ופטריות בחמאה עד הזהבה.",
            "מוסיפים שמנת ומבשלים בעדינות עד שהרוטב מסמיך.",
            "מערבבים את הפסטה עם הרוטב ופרמזן.",
            "מגישים מיד עם פלפל שחור גרוס.",
        ],
        "calories": 485,
        "protein": 17,
        "carbs": 54,
        "fat": 22,
        "spiceLevel": 0,
        "healthScore": 62,
        "tags": ["comfortFood"],
    },
    "meat": {
        "name": "קציצות בשר ביתיות",
        "base_ingredients": ["בשר בקר טחון", "בצל", "שום", "ביצה", "עגבניות", "שמן זית"],
        "steps": [
            "מערבבים בשר, בצל, שום, ביצה, מלח ופלפל עד תערובת דביקה.",
            "יוצרים קציצות בגודל אחיד.",
            "מחממים שמן במחבת וצורבים את הקציצות מכל הצדדים.",
            "מוסיפים רוטב עגבניות ומבשלים על אש נמוכה.",
            "מגישים חם עם עשבי תיבול טריים.",
        ],
        "calories": 410,
        "protein": 28,
        "carbs": 30,
        "fat": 20,
        "spiceLevel": 1,
        "healthScore": 66,
        "tags": ["highProtein", "comfortFood"],
    },
    "parve": {
        "name": "מוקפץ ירקות מהיר",
        "base_ingredients": ["טופו", "ברוקולי", "פלפל גמבה", "שום", "ג׳ינג׳ר", "רוטב סויה"],
        "steps": [
            "מייבשים וחותכים את הטופו לקוביות.",
            "מחממים מחבת או ווק על אש גבוהה.",
            "מוקפצים ירקות עם שום וג׳ינג׳ר עד שהם עדיין פריכים.",
            "מוסיפים טופו ורוטב סויה, מערבבים עד ציפוי מבריק.",
            "מגישים מיד על אורז מאודה.",
        ],
        "calories": 330,
        "protein": 19,
        "carbs": 24,
        "fat": 18,
        "spiceLevel": 2,
        "healthScore": 84,
        "tags": ["healthy", "quick", "vegetarian"],
    },
}

DESSERT_RECIPES_HE: dict[Category, dict] = {
    "dairy": {
        "name": "קינוח גבינה",
        "base_ingredients": ["גבינת שמנת", "סוכר", "ביצים", "וניל", "חמאה", "עוגיות"],
        "steps": [
            "טוחנים עוגיות לפירורים ומערבבים עם חמאה מומסת. לוחצים לתחתית תבנית.",
            "מערבבים גבינת שמנת, סוכר, ביצים ווניל עד תערובת חלקה.",
            "יוצקים על בסיס העוגיות ומעבירים למקרר לקירור של לפחות 4 שעות.",
            "מקשטים בפירות יער או רוטב פירות לפני ההגשה.",
            "מגישים קר ומתוק.",
        ],
        "calories": 420,
        "protein": 9,
        "carbs": 38,
        "fat": 26,
        "spiceLevel": 0,
        "healthScore": 58,
        "tags": ["comfortFood"],
    },
    "meat": {
        "name": "תפוחים אפויים בדבש",
        "base_ingredients": ["תפוחים", "דבש", "קינמון", "לימון", "סוכר"],
        "steps": [
            "חותכים תפוחים לחצאים ומסירים גרעינים.",
            "מערבבים דבש, קינמון, מיץ לימון וסוכר.",
            "מסדרים את התפוחים בתבנית ומוזקים את התערובת המתוקה.",
            "אופים בתנור ב-180°C כ-25 דקות עד רכות וקרמל.",
            "מגישים חמים כקינוח פרווה אחרי ארוחת בשר.",
        ],
        "calories": 280,
        "protein": 2,
        "carbs": 52,
        "fat": 8,
        "spiceLevel": 0,
        "healthScore": 70,
        "tags": ["healthy"],
    },
    "parve": {
        "name": "עוגיות מהירות",
        "base_ingredients": ["קמח", "סוכר", "אבקת קקאו", "שמן", "וניל", "אבקת אפייה"],
        "steps": [
            "מערבבים קמח, סוכר, קקאו ואבקת אפייה בקערה.",
            "מוסיפים שמן, וניל ומעט מים — עד לבצק דביק.",
            "יוצרים כדורים קטנים ומגלגלים בקמח נוסף.",
            "אופים בתנור ב-175°C כ-12 דקות.",
            "מקררים מעט ומגישים כקינוח פרווה.",
        ],
        "calories": 190,
        "protein": 3,
        "carbs": 28,
        "fat": 8,
        "spiceLevel": 0,
        "healthScore": 55,
        "tags": ["comfortFood", "vegetarian"],
    },
}

CATEGORY_RECIPES_EN: dict[Category, dict] = {
    "dairy": {
        "name": "Creamy Mushroom Pasta",
        "base_ingredients": ["pasta", "heavy cream", "garlic", "mushrooms", "parmesan", "butter"],
        "steps": [
            "Bring a large pot of salted water to a boil and cook the pasta until al dente.",
            "Sauté garlic and mushrooms in butter until golden.",
            "Add cream and simmer gently until the sauce thickens.",
            "Toss the pasta with the sauce and parmesan.",
            "Serve immediately with freshly cracked black pepper.",
        ],
        "calories": 485,
        "protein": 17,
        "carbs": 54,
        "fat": 22,
        "spiceLevel": 0,
        "healthScore": 62,
        "tags": ["comfortFood"],
    },
    "meat": {
        "name": "Homemade Beef Patties",
        "base_ingredients": ["ground beef", "onion", "garlic", "egg", "tomatoes", "olive oil"],
        "steps": [
            "Mix beef, onion, garlic, egg, salt, and pepper until sticky.",
            "Shape evenly sized patties.",
            "Sear patties in olive oil on both sides.",
            "Add tomato sauce and simmer on low heat until cooked through.",
            "Serve hot with fresh herbs.",
        ],
        "calories": 410,
        "protein": 28,
        "carbs": 30,
        "fat": 20,
        "spiceLevel": 1,
        "healthScore": 66,
        "tags": ["highProtein", "comfortFood"],
    },
    "parve": {
        "name": "Quick Vegetable Stir-Fry",
        "base_ingredients": ["tofu", "broccoli", "bell pepper", "garlic", "ginger", "soy sauce"],
        "steps": [
            "Pat tofu dry and cut into cubes.",
            "Heat a wok or skillet over high heat.",
            "Stir-fry vegetables with garlic and ginger until crisp-tender.",
            "Add tofu and soy sauce; toss until glossy.",
            "Serve immediately over steamed rice.",
        ],
        "calories": 330,
        "protein": 19,
        "carbs": 24,
        "fat": 18,
        "spiceLevel": 2,
        "healthScore": 84,
        "tags": ["healthy", "quick", "vegetarian"],
    },
}

DESSERT_RECIPES_EN: dict[Category, dict] = {
    "dairy": {
        "name": "Cheesecake Dessert",
        "base_ingredients": ["cream cheese", "sugar", "eggs", "vanilla", "butter", "cookies"],
        "steps": [
            "Crush cookies and mix with melted butter; press into a pan.",
            "Beat cream cheese, sugar, eggs, and vanilla until smooth.",
            "Pour over the crust and chill for at least 4 hours.",
            "Top with berries or fruit sauce before serving.",
            "Serve cold and sweet.",
        ],
        "calories": 420,
        "protein": 9,
        "carbs": 38,
        "fat": 26,
        "spiceLevel": 0,
        "healthScore": 58,
        "tags": ["comfortFood"],
    },
    "meat": {
        "name": "Honey Baked Apples",
        "base_ingredients": ["apples", "honey", "cinnamon", "lemon", "sugar"],
        "steps": [
            "Halve apples and remove cores.",
            "Mix honey, cinnamon, lemon juice, and sugar.",
            "Arrange apples in a baking dish and pour the mixture over.",
            "Bake at 350°F (180°C) for about 25 minutes until tender.",
            "Serve warm as a parve dessert after a meat meal.",
        ],
        "calories": 280,
        "protein": 2,
        "carbs": 52,
        "fat": 8,
        "spiceLevel": 0,
        "healthScore": 70,
        "tags": ["healthy"],
    },
    "parve": {
        "name": "Quick Chocolate Cookies",
        "base_ingredients": ["flour", "sugar", "cocoa powder", "oil", "vanilla", "baking powder"],
        "steps": [
            "Whisk flour, sugar, cocoa, and baking powder in a bowl.",
            "Add oil, vanilla, and a little water until a sticky dough forms.",
            "Roll small balls and coat lightly in extra flour.",
            "Bake at 350°F (175°C) for about 12 minutes.",
            "Cool slightly and serve as a parve dessert.",
        ],
        "calories": 190,
        "protein": 3,
        "carbs": 28,
        "fat": 8,
        "spiceLevel": 0,
        "healthScore": 55,
        "tags": ["comfortFood", "vegetarian"],
    },
}

PLAYLIST_PRESETS_HE = {
    "spotify": {
        "id": "soft-jazz-kitchen",
        "name": "ג'אז רך למטבח",
        "description": "צלילים חלקים ונעימים — מושלם לבישול רגוע ואינטימי",
        "query": "soft jazz cooking kitchen playlist",
        "energyLabel": "אנרגיה בינונית",
    },
    "youtube": {
        "id": "morning-sunshine",
        "name": "אור בוקר",
        "description": "POP עליז וקליל — אנרגיה טובה להתחלת יום במטבח",
        "query": "upbeat morning kitchen music",
        "energyLabel": "אנרגיה בינונית",
    },
}

PLAYLIST_PRESETS_EN = {
    "spotify": {
        "id": "soft-jazz-kitchen",
        "name": "Soft Jazz for the Kitchen",
        "description": "Smooth, easy listening — perfect for relaxed, intimate cooking",
        "query": "soft jazz cooking kitchen playlist",
        "energyLabel": "Medium energy",
    },
    "youtube": {
        "id": "morning-sunshine",
        "name": "Morning Sunshine",
        "description": "Upbeat pop — great energy to start your day in the kitchen",
        "query": "upbeat morning kitchen music",
        "energyLabel": "Medium energy",
    },
}


def get_category_templates(language: Language, recipe_type: RecipeType) -> dict[Category, dict]:
    if recipe_type == "dessert":
        return DESSERT_RECIPES_EN if language == "en" else DESSERT_RECIPES_HE
    return CATEGORY_RECIPES_EN if language == "en" else CATEGORY_RECIPES_HE


def get_playlist_presets(language: Language) -> dict:
    return PLAYLIST_PRESETS_EN if language == "en" else PLAYLIST_PRESETS_HE
