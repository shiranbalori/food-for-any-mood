import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://127.0.0.1:5173'
const OUT = 'e2e_ss_top5'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

const thisWeek = new Date()
thisWeek.setHours(12, 0, 0, 0)

function weeklyMockRows() {
  const authors = ['מיכל א.', 'דוד ר.', 'נועה ש.', 'יעל כ.', 'אורי מ.']
  const titles = [
    'שקשוקה מהירה של סבתא',
    'עוף בתנור עם לימון',
    'סלט קינואה וירקות',
    'עוגת גבינה עם פירות',
    'קציצות עדשים בתנור',
  ]
  const categories = ['dairy', 'meat', 'parve', 'dairy', 'parve']
  return titles.map((title, i) => ({
    id: `mock-weekly-${i + 1}`,
    user_id: `user-${i + 1}`,
    title,
    description: '',
    ingredients: [],
    steps: [],
    kosher_category: categories[i],
    recipe_type: 'meal',
    image_url: null,
    is_gluten_free: false,
    view_count: 100 + i * 50,
    created_at: new Date(thisWeek.getTime() - i * 3600000).toISOString(),
  }))
}

async function seedPage(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('food-for-any-mood-community-saves')
    localStorage.removeItem('food-for-any-mood-favorites')
    localStorage.setItem('food-for-any-mood-recipes', JSON.stringify({ version: 1, recipes: [] }))
  })
}

async function routeWeeklyMocks(page) {
  const rows = weeklyMockRows()
  const profiles = rows.map((r, i) => ({
    id: r.user_id,
    display_name: ['מיכל א.', 'דוד ר.', 'נועה ש.', 'יעל כ.', 'אורי מ.'][i],
  }))

  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url()
    if (url.includes('community_recipes')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rows),
      })
    }
    if (url.includes('profiles')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profiles),
      })
    }
    if (
      url.includes('recipe_likes') ||
      url.includes('recipe_ratings') ||
      url.includes('recipe_shares') ||
      url.includes('recipe_comments')
    ) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    return route.continue()
  })
}

async function openMyAreaCommunity(page) {
  const headerBtns = page.locator('header button')
  const count = await headerBtns.count()
  for (let i = 0; i < count; i += 1) {
    const txt = (await headerBtns.nth(i).innerText().catch(() => '')).trim()
    if (/אזור|area|👤|☰/i.test(txt)) {
      await headerBtns.nth(i).click()
      break
    }
  }
  await page.waitForTimeout(400)
  const navBtns = page.locator('button')
  const navCount = await navBtns.count()
  for (let i = 0; i < navCount; i += 1) {
    const txt = (await navBtns.nth(i).innerText().catch(() => '')).trim()
    if (txt.includes('קהילה') || txt.includes('Community') || txt.includes('👥')) {
      await navBtns.nth(i).click()
      break
    }
  }
}

async function shotTop5(page, name) {
  const section = page.locator('.community-top5').first()
  await section.waitFor({ state: 'visible', timeout: 15000 })
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  await section.screenshot({ path: `${OUT}/${name}.png` })
}

async function capture(label, viewport, fn) {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport, locale: 'he-IL' })
  const page = await ctx.newPage()
  await seedPage(page)
  await routeWeeklyMocks(page)
  await fn(page)
  await browser.close()
  console.log(`saved ${label}`)
}

await capture('home-desktop', { width: 1280, height: 900 }, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await shotTop5(page, '01_home_desktop')
})

await capture('home-mobile', { width: 390, height: 844 }, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await shotTop5(page, '02_home_mobile')
})

await capture('community-desktop', { width: 1280, height: 900 }, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await openMyAreaCommunity(page)
  await page.waitForTimeout(1500)
  await shotTop5(page, '03_community_desktop')
})

await capture('community-mobile', { width: 390, height: 844 }, async (page) => {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await openMyAreaCommunity(page)
  await page.waitForTimeout(1500)
  await shotTop5(page, '04_community_mobile')
})

console.log(`Screenshots in ./${OUT}/`)
