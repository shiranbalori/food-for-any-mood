import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'

async function inspect(page, label) {
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

  const report = await page.evaluate(() => {
    const tile = document.querySelector('.community-top5__tile')
    if (!tile) return { tileFound: false }

    const like = tile.querySelector('.community-top5__action--like')
    const save = tile.querySelector('.community-top5__action--save')
    const actions = tile.querySelector('.community-top5__actions')

    const style = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        zIndex: s.zIndex,
        width: r.width,
        height: r.height,
        top: r.top,
        left: r.left,
        overflow: s.overflow,
        clipPath: s.clipPath,
        fontSize: s.fontSize,
        color: s.color,
        background: s.backgroundColor,
      }
    }

    return {
      tileFound: true,
      tileHtml: tile.outerHTML,
      actionsContainerExists: !!actions,
      likeExists: !!like,
      saveExists: !!save,
      likeStyle: style(like),
      saveStyle: style(save),
      actionsStyle: style(actions),
      openStyle: style(tile.querySelector('.community-top5__open')),
      authorStyle: style(tile.querySelector('.community-top5__author')),
    }
  })

  console.log(`\n=== ${label} ===`)
  console.log(JSON.stringify(report, null, 2))
}

const browser = await chromium.launch({ headless: true })

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.removeItem('food-for-any-mood-community-saves')
    localStorage.removeItem('food-for-any-mood-favorites')
  })
  await inspect(page, 'COMMUNITY clean localStorage')
  await ctx.close()
}

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await inspect(page, 'COMMUNITY default storage')
  await ctx.close()
}

await browser.close()
