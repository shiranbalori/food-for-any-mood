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

const report = await page.evaluate(() => {
  const tile = document.querySelector('.community-top5__tile')
  const like = tile?.querySelector('.community-top5__action--like')
  const save = tile?.querySelector('.community-top5__action--save')
  const section = document.querySelector('.community-top5')

  const hitTest = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const top = document.elementFromPoint(cx, cy)
    return {
      cx,
      cy,
      rect: { top: r.top, left: r.left, w: r.width, h: r.height },
      topTag: top?.tagName,
      topClass: top?.className,
      isSelf: top === el || el.contains(top),
    }
  }

  const ancestors = (el) => {
    const list = []
    let node = el
    while (node) {
      const s = getComputedStyle(node)
      list.push({
        tag: node.tagName,
        class: node.className?.slice?.(0, 80),
        overflow: s.overflow,
        overflowX: s.overflowX,
        zIndex: s.zIndex,
        opacity: s.opacity,
        pointerEvents: s.pointerEvents,
      })
      node = node.parentElement
    }
    return list
  }

  return {
    sectionLayout: section?.dataset.top5Layout,
    sectionParent: section?.parentElement?.className,
    likeHit: hitTest(like),
    saveHit: hitTest(save),
    likeAncestors: ancestors(like),
    tileRect: tile?.getBoundingClientRect(),
    sectionRect: section?.getBoundingClientRect(),
    mainOverflow: getComputedStyle(document.querySelector('main') || document.body).overflow,
  }
})

console.log(JSON.stringify(report, null, 2))
await browser.close()
