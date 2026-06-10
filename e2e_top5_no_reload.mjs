import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'

async function openCommunity(page) {
  const headerBtns = page.locator('header button')
  for (let i = 0; i < (await headerBtns.count()); i += 1) {
    const txt = (await headerBtns.nth(i).innerText().catch(() => '')).trim()
    if (/אזור|area|👤|☰/i.test(txt)) {
      await headerBtns.nth(i).click()
      break
    }
  }
  await page.waitForTimeout(400)
  const navBtns = page.locator('button')
  for (let i = 0; i < (await navBtns.count()); i += 1) {
    const txt = (await navBtns.nth(i).innerText().catch(() => '')).trim()
    if (txt.includes('קהילה') || txt.includes('Community') || txt.includes('👥')) {
      await navBtns.nth(i).click()
      break
    }
  }
  await page.waitForTimeout(2000)
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
const page = await ctx.newPage()
await page.addInitScript(() => {
  localStorage.removeItem('food-for-any-mood-community-saves')
  localStorage.removeItem('food-for-any-mood-favorites')
})
await page.goto(BASE, { waitUntil: 'networkidle' })
await openCommunity(page)
await page.locator('.community-top5').scrollIntoViewIfNeeded()

const loadingVisibleBefore = await page.locator('.community-recipes__status').isVisible().catch(() => false)
await page.locator('.community-top5__action--save').click({ force: true })
await page.waitForTimeout(800)
const loadingVisibleAfter = await page.locator('.community-recipes__status').isVisible().catch(() => false)
const gridCountBeforeAfter = await page.evaluate(() => ({
  saveActive: document.querySelector('.community-top5__action--save')?.classList.contains('community-top5__action--active'),
  saveOpacity: getComputedStyle(document.querySelector('.community-top5__action--save span')).opacity,
  top5Bar: getComputedStyle(document.querySelector('.community-top5__heading')).backgroundColor,
  listBar: getComputedStyle(document.querySelector('.community-recipes__list-title')).backgroundColor,
  top5BarWidth: document.querySelector('.community-top5__heading')?.getBoundingClientRect().width,
  parentWidth: document.querySelector('.community-recipes')?.getBoundingClientRect().width,
}))

console.log(JSON.stringify({
  noReload: !loadingVisibleBefore && !loadingVisibleAfter,
  ...gridCountBeforeAfter,
}, null, 2))

await browser.close()
