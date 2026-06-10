import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://127.0.0.1:5173'
const OUT = 'e2e_ss_top5_actual'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

async function inspect(page, label) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  const home = await page.evaluate(() => {
    const el = document.querySelector('.community-top5')
    if (!el) return { found: false }
    return {
      found: true,
      layout: el.dataset.top5Layout,
      heading: document.querySelector('#community-top5-title')?.textContent?.trim(),
      tileCount: el.querySelectorAll('.community-top5__tile').length,
      rankCount: el.querySelectorAll('.community-top5__rank').length,
      authorVisible: [...el.querySelectorAll('.community-top5__author')].map((n) => {
        const s = getComputedStyle(n)
        return { text: n.textContent?.trim(), display: s.display, fontSize: s.fontSize }
      }),
      actionCount: el.querySelectorAll('.community-top5__action').length,
      emptyText: el.querySelector('.community-top5__empty')?.textContent?.trim() ?? null,
      cssHref: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
    }
  })

  console.log(`\n=== ${label} HOME ===`)
  console.log(JSON.stringify(home, null, 2))

  if (home.found) {
    await page.locator('.community-top5').first().screenshot({ path: `${OUT}/${label}_home.png` })
  }

  // community page
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

  const community = await page.evaluate(() => {
    const el = document.querySelector('.community-top5')
    if (!el) return { found: false }
    return {
      found: true,
      layout: el.dataset.top5Layout,
      tileCount: el.querySelectorAll('.community-top5__tile').length,
      rankCount: el.querySelectorAll('.community-top5__rank').length,
      actionCount: el.querySelectorAll('.community-top5__action').length,
      emptyText: el.querySelector('.community-top5__empty')?.textContent?.trim() ?? null,
    }
  })

  console.log(`\n=== ${label} COMMUNITY ===`)
  console.log(JSON.stringify(community, null, 2))

  if (community.found) {
    await page.locator('.community-top5').first().screenshot({ path: `${OUT}/${label}_community.png` })
  }
}

const browser = await chromium.launch({ headless: true })

const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
const page1 = await ctx1.newPage()
await inspect(page1, 'desktop')
await ctx1.close()

const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' })
const page2 = await ctx2.newPage()
await inspect(page2, 'mobile')
await ctx2.close()

await browser.close()
