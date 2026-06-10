import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const BASE = 'http://127.0.0.1:5173'
const env = readFileSync('.env', 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim()
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim()
const sb = createClient(url, key)
const { data: recipes } = await sb.from('community_recipes').select('id,title').limit(1)
const recipeId = recipes?.[0]?.id

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

await page.addInitScript(({ id }) => {
  localStorage.setItem(
    'food-for-any-mood-favorites',
    JSON.stringify({
      version: 1,
      recipes: [{ id, isCommunity: true, title: 'test', name: 'test' }],
    }),
  )
  localStorage.setItem(
    'food-for-any-mood-community-saves',
    JSON.stringify([{ id, isCommunity: true, title: 'test', savedAt: new Date().toISOString() }]),
  )
}, { id: recipeId })

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const report = await page.evaluate(() => {
  const tile = document.querySelector('.community-top5__tile')
  const actions = tile?.querySelector('.community-top5__actions')
  const like = tile?.querySelector('.community-top5__action--like')
  const save = tile?.querySelector('.community-top5__action--save')
  const author = tile?.querySelector('.community-top5__author')
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
    }
  }
  return {
    hasActionsContainer: !!actions,
    hasLike: !!like,
    hasSave: !!save,
    likeStyle: style(like),
    saveStyle: style(save),
    authorStyle: style(author),
    actionsStyle: style(actions),
  }
})

console.log(JSON.stringify(report, null, 2))
await browser.close()
