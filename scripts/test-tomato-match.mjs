import { ingredientsMatch } from '../src/data/ingredientKnowledge.js'
import { ingredientAppearsInText } from '../src/utils/ingredientRelevance.js'

console.log('match', ingredientsMatch('עגבניה', 'עגבניות'))
console.log('appears', ingredientAppearsInText('עגבניה', 'קרפ מלוח בגבינה ועגבניות'))
