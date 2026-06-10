import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'

async function audit(page, label, setup) {
  if (setup) await setup(page)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const report = await page.evaluate(() => {
    const section = document.querySelector('.community-top5')
    if (!section) return { found: false }

    const tile = section.querySelector('.community-top5__tile')
    const rank = section.querySelector('.community-top5__rank')
    const author = section.querySelector('.community-top5__author')
    const actions = section.querySelector('.community-top5__actions')
    const like = section.querySelector('.community-top5__action--like')
    const save = section.querySelector('.community-top5__action--save')
    const card = section.querySelector('.community-top5__card')
    const grid = section.querySelector('.community-top5__grid')
    const strip = section.querySelector('.community-top5__strip')

    const style = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      return {
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        width: s.width,
        height: s.height,
        overflow: s.overflow,
        fontSize: s.fontSize,
      }
    }

    return {
      layout: section.dataset.top5Layout,
      title: section.querySelector('#community-top5-title')?.textContent?.trim(),
      structure: {
        hasGrid: !!grid,
        hasStrip: !!strip,
        hasCard: !!card,
        hasTile: !!tile,
        tileCount: section.querySelectorAll('.community-top5__tile').length,
      },
      rank: rank
        ? { text: rank.textContent?.trim(), html: rank.outerHTML, style: style(rank) }
        : null,
      author: author
        ? { text: author.textContent?.trim(), style: style(author) }
        : null,
      actions: actions
        ? {
            childButtons: actions.querySelectorAll('button').length,
            style: style(actions),
          }
        : null,
      like: like ? { style: style(like), html: like.outerHTML } : null,
      save: save ? { style: style(save), html: save.outerHTML } : null,
      tileHtml: tile?.outerHTML?.slice(0, 1200) ?? null,
      sectionHtml: section.outerHTML.slice(0, 2000),
    }
  })

  console.log(`\n===== ${label} =====`)
  console.log(JSON.stringify(report, null, 2))
}

const browser = await chromium.launch({ headless: true })

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await audit(page, 'CLEAN (no localStorage)', async (p) => {
    await p.addInitScript(() => {
      localStorage.clear()
    })
  })
  await ctx.close()
}

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
  const page = await ctx.newPage()
  await audit(page, 'LIKED+SAVED in localStorage', async (p) => {
    await p.addInitScript(() => {
      localStorage.clear()
      // simulate user already liked/saved the one weekly recipe
      localStorage.setItem(
        'food-for-any-mood-favorites',
        JSON.stringify([
          {
            id: 'PLACEHOLDER',
            isCommunity: true,
            title: 'עוגת גזר',
            authorName: 'Shiran Balori',
          },
        ]),
      )
    })
  })
  await ctx.close()
}

await browser.close()
