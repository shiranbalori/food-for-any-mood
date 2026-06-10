import { chromium } from 'playwright'

const RECIPE_ID = '0141de3f-7309-4fea-ae16-7867d02a6999'
const BASE = 'http://127.0.0.1:5173'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
const page = await ctx.newPage()

await page.addInitScript(({ id }) => {
  localStorage.setItem(
    'food-for-any-mood-community-saves',
    JSON.stringify([
      {
        id,
        isCommunity: true,
        title: 'עוגת גזר',
        authorName: 'Shiran Balori',
        savedAt: new Date().toISOString(),
      },
    ]),
  )
  localStorage.setItem(
    'food-for-any-mood-favorites',
    JSON.stringify([
      {
        id,
        isCommunity: true,
        title: 'עוגת גזר',
        authorName: 'Shiran Balori',
      },
    ]),
  )
}, { id: RECIPE_ID })

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const report = await page.evaluate(() => {
  const section = document.querySelector('.community-top5')
  const tile = section?.querySelector('.community-top5__tile')
  return {
    layout: section?.dataset.top5Layout,
    rank: section?.querySelector('.community-top5__rank')?.outerHTML ?? null,
    author: section?.querySelector('.community-top5__author')?.textContent?.trim() ?? null,
    like: !!section?.querySelector('.community-top5__action--like'),
    save: !!section?.querySelector('.community-top5__action--save'),
    tileHtml: tile?.outerHTML ?? null,
  }
})

console.log(JSON.stringify(report, null, 2))
await browser.close()
