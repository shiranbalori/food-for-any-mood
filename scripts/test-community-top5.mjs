import {
  getCommunityTop5DisplayRecipes,
  getWeeklyTopCommunityRecipes,
} from '../src/utils/communityRecipeRanking.js'

const now = new Date('2026-06-10T12:00:00')
const lastWeek = new Date('2026-06-01T10:00:00').toISOString()
const thisWeek = new Date('2026-06-09T10:00:00').toISOString()

const recipes = [
  { id: 'old', title: 'Old recipe', createdAt: lastWeek, likeCount: 10 },
  { id: 'new', title: 'New recipe', createdAt: thisWeek, likeCount: 1 },
]

const weekly = getWeeklyTopCommunityRecipes(recipes, 5, now)
const display = getCommunityTop5DisplayRecipes(recipes, 5, now)

if (weekly.length !== 1 || weekly[0].id !== 'new') {
  throw new Error(`weekly filter failed: ${JSON.stringify(weekly.map((r) => r.id))}`)
}

if (display.length !== 1 || display[0].id !== 'new') {
  throw new Error(`display should prefer weekly recipe: ${JSON.stringify(display.map((r) => r.id))}`)
}

const onlyOld = [{ id: 'old', title: 'Old only', createdAt: lastWeek, likeCount: 3 }]
const weeklyOld = getWeeklyTopCommunityRecipes(onlyOld, 5, now)
const displayOld = getCommunityTop5DisplayRecipes(onlyOld, 5, now)

if (weeklyOld.length !== 0) {
  throw new Error('weekly should be empty for last-week-only recipe')
}

if (displayOld.length !== 1 || displayOld[0].id !== 'old') {
  throw new Error('display should fallback to available recipes when weekly is empty')
}

if (getCommunityTop5DisplayRecipes([], 5, now).length !== 0) {
  throw new Error('display should be empty for empty input')
}

console.log('✅ community top5 display tests passed')
