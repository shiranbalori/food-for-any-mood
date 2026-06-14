/**
 * One-off live browser trace — exact UI flow, captures console + network.
 * Not a unit test; mirrors user clicks only.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const logs = []
const network = []

function pushLog(type, text) {
  logs.push({ type, text })
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  page.on('console', (msg) => {
    const text = msg.text()
    if (
      text.includes('[aiRecipeService]') ||
      text.includes('Payload:') ||
      text.includes('RAW_GEMINI') ||
      text.includes('PARSED_RECIPE') ||
      text.includes('RENDERED_RECIPE') ||
      text.includes('recipePossible') ||
      text.includes('Category/type mismatch') ||
      text.includes('Mock fallback') ||
      text.includes('pre-return') ||
      text.includes('Validation failed') ||
      text.includes('Generate response')
    ) {
      pushLog(msg.type(), text)
    }
  })

  page.on('requestfinished', async (req) => {
    const url = req.url()
    if (!url.includes('generate-recipe')) return
    const res = await req.response().catch(() => null)
    let body = null
    try {
      body = res ? await res.text() : null
    } catch {
      body = '(unreadable)'
    }
    network.push({
      url,
      method: req.method(),
      status: res?.status(),
      requestBody: req.postData(),
      responseBody: body,
    })
  })

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })

  // Category: חלבי
  await page.locator('.category-card').filter({ hasText: 'חלבי' }).click()

  // Log active recipe type chip
  const activeType = await page.locator('.category-selector__type-chip--active').innerText().catch(() => '?')
  pushLog('info', `[trace] active recipeType chip: ${activeType.trim()}`)

  await page.locator('#ingredients').fill('קמח, גבינה, חלב')
  await page.locator('.recipe-form__submit').click()

  await page.waitForFunction(() => !document.querySelector('.loading-overlay'), null, { timeout: 120000 }).catch(() => {})
  await page.waitForTimeout(2000)

  const errorText = await page.locator('.app__backend-notice--error').first().innerText().catch(() => '')
  const recipeTitle = await page.locator('.recipe-card h2').first().innerText().catch(() => '')

  console.log('\n=== UI OUTCOME ===')
  console.log('error shown:', errorText || '(none)')
  console.log('recipe title:', recipeTitle || '(none)')

  console.log('\n=== NETWORK (generate-recipe) ===')
  if (network.length === 0) {
    console.log('(no generate-recipe request reached network — backend fetch failed or blocked)')
  } else {
    for (const n of network) {
      console.log('URL:', n.url)
      console.log('REQUEST:', n.requestBody)
      console.log('STATUS:', n.status)
      console.log('RESPONSE:', n.responseBody?.slice?.(0, 3000) ?? n.responseBody)
    }
  }

  console.log('\n=== CONSOLE TRACE (filtered) ===')
  for (const l of logs) {
    console.log(`[${l.type}] ${l.text}`)
  }

  await browser.close()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
