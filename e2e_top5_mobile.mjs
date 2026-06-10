import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'

async function inspectSavedLiked(page) {
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

  return page.evaluate(() => {
    const tile = document.querySelector('.community-top5__tile')
    const card = document.querySelector('.community-card')
    return {
      top5: {
        likeExists: !!tile?.querySelector('.community-top5__action--like'),
        saveExists: !!tile?.querySelector('.community-top5__action--save'),
        actionsExists: !!tile?.querySelector('.community-top5__actions'),
      },
      card: {
        likeExists: !!card?.querySelector('.community-card__like'),
        saveExists: !!card?.querySelector('.community-card__save'),
      },
    }
  })
}

const browser = await chromium.launch({ headless: true })

{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.removeItem('food-for-any-mood-community-saves')
    localStorage.removeItem('food-for-any-mood-favorites')
  })
  console.log('MOBILE clean:', JSON.stringify(await inspectSavedLiked(page)))
  await ctx.close()
}

{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await page.addInitScript(({ id }) => {
    localStorage.setItem(
      'food-for-any-mood-community-saves',
      JSON.stringify([{ id, isCommunity: true, title: 'עוגת גזר', savedAt: new Date().toISOString() }]),
    )
  }, { id: '0141de3f-7309-4fea-ae16-7867d02a6999' })
  console.log('MOBILE saved only:', JSON.stringify(await inspectSavedLiked(page)))
  await ctx.close()
}

await browser.close()
