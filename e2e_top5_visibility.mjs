import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'

async function audit(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

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

  await page.screenshot({ path: 'e2e_ss_top5/tile.png', fullPage: false })

  return page.evaluate(() => {
    const tile = document.querySelector('.community-top5__tile')
    const like = tile?.querySelector('.community-top5__action--like')
    const save = tile?.querySelector('.community-top5__action--save')
    const author = tile?.querySelector('.community-top5__author')

    const overlap = (a, b) => {
      if (!a || !b) return null
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      return !(ra.right < rb.left || ra.left > rb.right || ra.bottom < rb.top || ra.top > rb.bottom)
    }

    const visible = (el) => {
      if (!el) return false
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
      if (r.width < 1 || r.height < 1) return false
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const topEl = document.elementFromPoint(cx, cy)
      return el === topEl || el.contains(topEl)
    }

    return {
      likeExists: !!like,
      saveExists: !!save,
      likeVisible: visible(like),
      saveVisible: visible(save),
      likeOverlapsAuthor: overlap(like, author),
      saveOverlapsAuthor: overlap(save, author),
      likeSpanText: like?.querySelector('span')?.textContent,
      saveSpanText: save?.querySelector('span')?.textContent,
      likeSpanRect: like?.querySelector('span')?.getBoundingClientRect(),
    }
  })
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
const page = await ctx.newPage()
await page.addInitScript(() => {
  localStorage.removeItem('food-for-any-mood-community-saves')
  localStorage.removeItem('food-for-any-mood-favorites')
})
console.log(JSON.stringify(await audit(page), null, 2))
await browser.close()
