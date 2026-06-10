import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
const page = await ctx.newPage()
await page.addInitScript(() => {
  localStorage.removeItem('food-for-any-mood-community-saves')
  localStorage.removeItem('food-for-any-mood-favorites')
})
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

await page.locator('.community-top5').scrollIntoViewIfNeeded()
await page.waitForTimeout(500)

const report = await page.evaluate(() => {
  const like = document.querySelector('.community-top5__action--like')
  const r = like?.getBoundingClientRect()
  const cx = (r?.left ?? 0) + (r?.width ?? 0) / 2
  const cy = (r?.top ?? 0) + (r?.height ?? 0) / 2
  const top = document.elementFromPoint(cx, cy)
  return {
    scrollY: window.scrollY,
    likeRect: r,
    hit: {
      cx,
      cy,
      topTag: top?.tagName,
      topClass: top?.className,
      topText: top?.textContent?.slice(0, 40),
      isLike: top === like || like?.contains(top),
    },
    likeStyle: like ? getComputedStyle(like).display : null,
  }
})

console.log(JSON.stringify(report, null, 2))
await browser.close()
