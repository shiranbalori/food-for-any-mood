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

async function auditPage(page, label) {
  await page.locator('.community-top5').scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(400)

  return page.evaluate((lbl) => {
    const upload = document.querySelector('.community-upload')
    const uploadRect = upload?.getBoundingClientRect()
    const tile = document.querySelector('.community-top5__tile')
    const like = tile?.querySelector('.community-top5__action--like')
    const save = tile?.querySelector('.community-top5__action--save')
    const listTitle = document.querySelector('.community-recipes__list-title')

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
      label: lbl,
      uploadExists: !!upload,
      uploadHeight: uploadRect?.height ?? 0,
      likeExists: !!like,
      saveExists: !!save,
      likeVisible: visible(like),
      saveVisible: visible(save),
      listTitleText: listTitle?.textContent?.trim() ?? null,
      actionsBeforeOpen: !!tile?.querySelector('.community-top5__actions') &&
        tile.querySelector('.community-top5__open')?.compareDocumentPosition(tile.querySelector('.community-top5__actions')) === Node.DOCUMENT_POSITION_FOLLOWING,
    }
  }, label)
}

const browser = await chromium.launch({ headless: true })

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.removeItem('food-for-any-mood-community-saves')
    localStorage.removeItem('food-for-any-mood-favorites')
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  console.log('HOME:', JSON.stringify(await auditPage(page, 'home'), null, 2))
  await ctx.close()
}

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.removeItem('food-for-any-mood-community-saves')
    localStorage.removeItem('food-for-any-mood-favorites')
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await openCommunity(page)
  console.log('COMMUNITY:', JSON.stringify(await auditPage(page, 'community'), null, 2))
  await ctx.close()
}

await browser.close()
