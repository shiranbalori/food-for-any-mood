/**
 * Browser E2E — recipe generation for 4 category/ingredient cases (real UI).
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'

const CASES = [
  { label: 'dairy', categoryLabel: 'חלבי', ingredients: 'קמח, גבינה, חלב' },
  { label: 'meat', categoryLabel: 'בשרי', ingredients: 'בשר טחון, תפוחי אדמה, בצל' },
  { label: 'vegan', categoryLabel: 'טבעוני', ingredients: 'עדשים, גזר, בצל' },
  { label: 'any', categoryLabel: 'ללא העדפה', ingredients: 'לימון, סוכר, קמח' },
]

async function selectCategory(page, label) {
  const card = page.locator('.category-card').filter({ hasText: label })
  await card.click()
}

async function generateRecipe(page, categoryLabel, ingredients) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await selectCategory(page, categoryLabel)
  await page.locator('#ingredients').fill(ingredients)
  await page.locator('.recipe-form__submit').click()
  await page.waitForFunction(
    () => !document.querySelector('.loading-overlay'),
    null,
    { timeout: 120000 },
  ).catch(() => {})
  await page.waitForTimeout(800)
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  let passed = 0
  for (const c of CASES) {
    await generateRecipe(page, c.categoryLabel, c.ingredients)

    const errorEl = page.locator('.app__backend-notice--error')
    const errorVisible = await errorEl.first().isVisible().catch(() => false)
    const errorText = errorVisible ? (await errorEl.first().innerText()).trim() : ''

    const recipeCard = page.locator('.recipe-card h2')
    const titleVisible = await recipeCard.first().isVisible().catch(() => false)
    const title = titleVisible ? (await recipeCard.first().innerText()).trim() : ''

    const ok = titleVisible && !errorText.includes('לא הצלחנו')
    console.log(ok ? '✅' : '❌', c.label, ok ? title : errorText || 'no recipe shown')
    if (ok) passed += 1
  }

  await browser.close()
  console.log(`\n${passed}/${CASES.length} browser UI cases`)
  process.exit(passed === CASES.length ? 0 : 1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
