import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'
const RECIPE_ID = '0141de3f-7309-4fea-ae16-7867d02a6999'

async function openMyAreaPanel(page, label) {
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
    if (txt.includes(label)) {
      await navBtns.nth(i).click()
      break
    }
  }
  await page.waitForTimeout(1800)
}

function layoutOrder(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.community-recipes')
    if (!root) return { ok: false, reason: 'no community-recipes' }

    const indexOf = (sel) => {
      const el = root.querySelector(sel)
      if (!el) return -1
      return Array.from(root.children).indexOf(
        el.closest('.community-recipes > *') ?? el,
      )
    }

    const children = [...root.children].map((el) => el.className || el.tagName)
    const top5Idx = children.findIndex((c) => String(c).includes('community-top5'))
    const catsIdx = children.findIndex((c) => String(c).includes('community-recipes__categories'))
    const listIdx = children.findIndex((c) => String(c).includes('community-recipes__list-title'))

    const top5Heading = document.querySelector('#community-top5-title')?.textContent?.trim()
    const listTitle = document.querySelector('.community-recipes__list-title')?.textContent?.trim()

    return {
      ok: top5Idx > -1 && catsIdx > top5Idx && listIdx > catsIdx,
      top5Idx,
      catsIdx,
      listIdx,
      top5Heading,
      listTitle,
      childClasses: children,
    }
  })
}

function top5Icons(page) {
  return page.evaluate(() => {
    const tile = document.querySelector('.community-top5__tile')
    const like = tile?.querySelector('.community-top5__action--like')
    const save = tile?.querySelector('.community-top5__action--save')
    return {
      likeExists: !!like,
      saveExists: !!save,
      likeText: like?.querySelector('span')?.textContent?.trim() ?? null,
      saveText: save?.querySelector('span')?.textContent?.trim() ?? null,
      likeActive: like?.classList.contains('community-top5__action--active') ?? false,
      saveActive: save?.classList.contains('community-top5__action--active') ?? false,
    }
  })
}

const browser = await chromium.launch({ headless: true })
const results = {}

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.removeItem('food-for-any-mood-community-saves')
    localStorage.removeItem('food-for-any-mood-favorites')
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.locator('.community-top5').scrollIntoViewIfNeeded()
  results.homeTop5Clean = await top5Icons(page)
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
  await openMyAreaPanel(page, 'קהילה')
  results.communityLayout = await layoutOrder(page)
  await page.locator('.community-top5').scrollIntoViewIfNeeded()
  results.communityTop5Clean = await top5Icons(page)

  const uploadStrip = await page.evaluate(() => {
    const upload = document.querySelector('.community-upload')
    return { exists: !!upload, height: upload?.getBoundingClientRect().height ?? 0 }
  })
  results.uploadStripCollapsed = uploadStrip

  await ctx.close()
}

{
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
          savedAt: new Date().toISOString(),
        },
      ]),
    )
    localStorage.setItem(
      'food-for-any-mood-favorites',
      JSON.stringify({
        version: 1,
        recipes: [
          {
            id,
            isCommunity: true,
            name: 'עוגת גזר',
            title: 'עוגת גזר',
            savedAt: new Date().toISOString(),
          },
        ],
      }),
    )
  }, { id: RECIPE_ID })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await openMyAreaPanel(page, 'קהילה')
  await page.locator('.community-top5').scrollIntoViewIfNeeded()
  results.communityTop5SavedFavorited = await top5Icons(page)
  await ctx.close()
}

{
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
          category: 'parve',
          authorName: 'Shiran Balori',
          savedAt: new Date().toISOString(),
        },
      ]),
    )
  }, { id: RECIPE_ID })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await openMyAreaPanel(page, 'שמורים')
  await page.waitForTimeout(1200)

  const savedBtn = page.locator('.saved-card__remove-btn').first()
  results.savedRemoveBtn = {
    exists: (await savedBtn.count()) > 0,
    text: (await savedBtn.innerText().catch(() => '')).trim(),
  }

  if (await savedBtn.count()) {
    await savedBtn.click()
    await page.waitForTimeout(400)
    const remaining = await page.evaluate(() => {
      const raw = localStorage.getItem('food-for-any-mood-community-saves')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.length : 0
    })
    results.savedRemoveWorks = remaining === 0
  }

  await ctx.close()
}

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await page.addInitScript(({ id }) => {
    localStorage.setItem(
      'food-for-any-mood-favorites',
      JSON.stringify({
        version: 1,
        recipes: [
          {
            id,
            isCommunity: true,
            name: 'עוגת גזר',
            title: 'עוגת גזר',
            category: 'parve',
            savedAt: new Date().toISOString(),
          },
        ],
      }),
    )
  }, { id: RECIPE_ID })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await openMyAreaPanel(page, 'מועדפים')

  const favBtn = page.locator('.favorite-card__remove').first()
  results.favoriteRemoveBtn = {
    exists: (await favBtn.count()) > 0,
    text: (await favBtn.innerText().catch(() => '')).trim(),
  }

  if (await favBtn.count()) {
    await favBtn.click()
    await page.waitForTimeout(400)
    const remaining = await page.evaluate(() => {
      const raw = localStorage.getItem('food-for-any-mood-favorites')
      if (!raw) return 0
      const parsed = JSON.parse(raw)
      const list = Array.isArray(parsed) ? parsed : parsed.recipes
      return Array.isArray(list) ? list.length : 0
    })
    results.favoriteRemoveWorks = remaining === 0
  }

  await ctx.close()
}

await browser.close()

const pass = {
  layout: results.communityLayout?.ok === true,
  listTitle: results.communityLayout?.listTitle === 'מתכוני הקהילה',
  homeIconsAlways: results.homeTop5Clean?.likeExists && results.homeTop5Clean?.saveExists,
  communityIconsAlways: results.communityTop5Clean?.likeExists && results.communityTop5Clean?.saveExists,
  homeOutline: results.homeTop5Clean?.likeText === '♡' && results.homeTop5Clean?.saveText === '🔖',
  savedActiveIcons:
    results.communityTop5SavedFavorited?.likeExists &&
    results.communityTop5SavedFavorited?.saveExists,
  noUploadStrip: !results.uploadStripCollapsed?.exists || results.uploadStripCollapsed?.height === 0,
  savedBtn: results.savedRemoveBtn?.text === 'הסר משמורים' && results.savedRemoveWorks === true,
  favBtn: results.favoriteRemoveBtn?.text === 'הסר מאהובים' && results.favoriteRemoveWorks === true,
}

console.log(JSON.stringify({ results, pass }, null, 2))
console.log('\nALL PASS:', Object.values(pass).every(Boolean))
