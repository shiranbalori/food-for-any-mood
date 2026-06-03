/**
 * Kosher category definitions — mirrors backend/kosher_category_definitions.py
 *
 * חלבי: milk, cheese, yogurt, cream, butter — no meat/fish/poultry.
 * בשרי: meat, chicken, turkey, fish — no dairy.
 * פרווה: neither dairy nor meat (vegetables, rice, legumes, salads, fruit-based).
 * ללא העדפה (any): no user preference; final category inferred from recipe ingredients.
 */

export const KOSHER_CATEGORY_DEFINITIONS = {
  dairy: {
    id: 'dairy',
    labelHe: 'חלבי',
    labelEn: 'Dairy',
    includes: ['milk', 'cheese', 'yogurt', 'cream', 'butter'],
    excludes: ['meat', 'chicken', 'turkey', 'fish', 'other meat products'],
  },
  meat: {
    id: 'meat',
    labelHe: 'בשרי',
    labelEn: 'Meat',
    includes: ['meat', 'chicken', 'turkey', 'fish', 'other meat products'],
    excludes: ['milk', 'cheese', 'yogurt', 'cream', 'butter'],
  },
  parve: {
    id: 'parve',
    labelHe: 'פרווה',
    labelEn: 'Parve',
    includes: [],
    excludes: [
      'milk',
      'cheese',
      'yogurt',
      'cream',
      'butter',
      'meat',
      'chicken',
      'turkey',
      'fish',
    ],
    examples: ['vegetable dishes', 'rice', 'legumes', 'salads', 'fruit-based recipes'],
  },
  any: {
    id: 'any',
    labelHe: 'ללא העדפה',
    labelEn: 'No preference',
    description:
      'User has no preference; final category (dairy / meat / parve) is determined automatically from recipe ingredients.',
  },
}
