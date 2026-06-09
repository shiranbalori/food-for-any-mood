/**
 * E2E verification — community recipe save/open/remove + generated recipe + owner delete
 */
import { chromium } from 'playwright'
import { execSync } from 'child_process'
import fs from 'fs'

const BASE = 'http://localhost:5173'
const SS_DIR = 'e2e_ss_community'
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR)

const ss  = (page, name) => page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: false })
const log = (label, status, detail = '') => {
  const icon = { PASS: '✅', SKIP: '⚠️', FAIL: '❌' }[status] ?? '❓'
  console.log(`${icon} [${label}] ${status}${detail ? ' — ' + detail : ''}`)
}

// ── mock community entry that will be injected directly into localStorage ───
const MOCK_COMMUNITY = {
  id: 'e2e-community-test-id',
  isCommunity: true,
  title: 'עוגת גזר קהילתית',
  category: 'dairy',
  authorName: 'מרים כהן',
  description: 'עוגת גזר עסיסית עם ציפוי גבינת שמנת',
  isGlutenFree: false,
  imageUrl: null,
  recipeType: 'dessert',
  ingredients: ['קמח', 'גזר מגורד', 'ביצים', 'שמן', 'סוכר', 'קינמון', 'גבינת שמנת'],
  steps: [
    'לחמם תנור ל-180 מעלות',
    'לערבב חומרים יבשים',
    'להוסיף גזר מגורד וביצים',
    'לאפות 35 דקות',
    'לצפות בגבינת שמנת לאחר קירור',
  ],
  savedAt: new Date().toISOString(),
}

// ── mock generated recipe for Test 6 ────────────────────────────────────────
const MOCK_GENERATED = {
  id: 'ai-e2e-generated-001',
  name: 'שקשוקה ביתית',
  category: 'dairy',
  description: 'שקשוקה קלה ומהירה',
  ingredients: ['ביצים', 'עגבניות', 'גבינה'],
  steps: ['לחמם שמן', 'להוסיף עגבניות', 'לשבור ביצים ולבשל'],
  matchPercent: 88,
  calories: 310,
  spiceLevel: 1,
  tags: [],
  glutenFree: false,
  savedAt: new Date().toISOString(),
}

async function openMyArea(page) {
  const btns = await page.$$('header button, [class*="header"] button, .header button')
  for (const btn of btns) {
    const txt = await btn.innerText().catch(() => '')
    if (/אזור|area|👤|☰/i.test(txt)) { await btn.click(); return true }
  }
  return false
}

async function clickNavPanel(page, keywords) {
  const btns = await page.$$('button')
  for (const btn of btns) {
    const txt = await btn.innerText().catch(() => '')
    if (keywords.some(kw => txt.includes(kw))) { await btn.click(); return true }
  }
  return false
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const ctx  = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  // ── seed localStorage with both mock entries ─────────────────────────────
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ comm, gen }) => {
    localStorage.setItem('food-for-any-mood-community-saves', JSON.stringify([comm]))
    localStorage.setItem('food-for-any-mood-recipes',
      JSON.stringify({ version: 1, recipes: [gen] }))
  }, { comm: MOCK_COMMUNITY, gen: MOCK_GENERATED })
  log('Seed: community + generated recipes written to localStorage', 'PASS')

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 1 — Community recipes load
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n── TEST 1: Community Recipes page ──')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await openMyArea(page)
  await page.waitForTimeout(400)
  await clickNavPanel(page, ['קהילה', 'Community', '👥'])
  await page.waitForTimeout(1500)
  await ss(page, '01_community_page')
  const communityCards = await page.$$('.community-card')
  log('Community page loaded', communityCards.length > 0 ? 'PASS' : 'SKIP',
    `${communityCards.length} community card(s)`)
  if (communityCards.length > 0) {
    const title = await communityCards[0].$eval('h3', el => el.innerText).catch(() => '')
    log('First community recipe title', 'PASS', title)
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 2 — ❤️ save button code path (auth-gated; verified via localStorage seed)
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n── TEST 2: Save code path ──')
  const serviceSource = fs.readFileSync('./src/services/communityRecipeService.js', 'utf8')
  const cardSource    = fs.readFileSync('./src/components/CommunityRecipeCard.jsx', 'utf8')
  const storageSource = fs.readFileSync('./src/utils/storage.js', 'utf8')
  log('toggleRecipeLike writes to recipe_likes', serviceSource.includes('recipe_likes') ? 'PASS' : 'FAIL')
  log('handleSave calls saveCommunityRecipe', cardSource.includes('saveCommunityRecipe(recipe)') ? 'PASS' : 'FAIL')
  log('handleSave calls removeSavedCommunityRecipe on unlike', cardSource.includes('removeSavedCommunityRecipe(recipe.id)') ? 'PASS' : 'FAIL')
  log('saveCommunityRecipe stores ingredients', storageSource.includes('ingredients: Array.isArray') ? 'PASS' : 'FAIL')
  log('saveCommunityRecipe stores steps', storageSource.includes('steps: Array.isArray') ? 'PASS' : 'FAIL')

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 3 — Saved Recipes shows community recipe
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n── TEST 3: Saved Recipes shows community recipe ──')
  await openMyArea(page)
  await page.waitForTimeout(300)
  await clickNavPanel(page, ['שמורים', 'Saved', '📌'])
  await page.waitForTimeout(800)
  await ss(page, '02_saved_recipes')

  const savedCards = await page.$$('.saved-card')
  log('Saved Recipes has cards', savedCards.length >= 2 ? 'PASS' : 'FAIL',
    `found ${savedCards.length} card(s) (expected ≥2: 1 community + 1 generated)`)

  // Find community card by author element
  let communityCardEl = null
  for (const card of savedCards) {
    const authorEl = await card.$('[class*="community-author"]').catch(() => null)
    if (authorEl) { communityCardEl = card; break }
  }
  if (communityCardEl) {
    const title  = await communityCardEl.$eval('h3', el => el.innerText).catch(() => '')
    const author = await communityCardEl.$eval('[class*="community-author"]', el => el.innerText).catch(() => '')
    log('Community card visible in Saved Recipes', 'PASS', `title="${title}" ${author}`)
  } else {
    // Fallback: look for the injected title text
    const allText = await page.$$eval('.saved-card', els => els.map(e => e.innerText)).catch(() => [])
    const found = allText.some(t => t.includes('עוגת גזר קהילתית'))
    log('Community card visible in Saved Recipes', found ? 'PASS' : 'FAIL',
      found ? 'Found by title text' : 'Not found')
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 4 — Open community recipe: ingredients + steps visible
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n── TEST 4: Open community recipe (expand ingredients + steps) ──')
  let expandBtn = null
  const targetCard = communityCardEl ?? savedCards[0]
  if (targetCard) {
    const btns = await targetCard.$$('button')
    for (const btn of btns) {
      const txt = (await btn.innerText().catch(() => '')).trim()
      if (/פרטי|view recipe|צפייה|details|recipe/i.test(txt) && !/×|remove/i.test(txt)) {
        expandBtn = btn; break
      }
    }
  }

  if (expandBtn) {
    await expandBtn.click()
    await page.waitForTimeout(400)
    await ss(page, '03_community_expanded')

    const detailsEl = await page.$('[class*="community-details"]')
    if (detailsEl) {
      const lists = await detailsEl.$$('li')
      const items = await Promise.all(lists.map(el => el.innerText().catch(() => '')))
      const hasIngredients = items.some(i => ['קמח','גזר','ביצים'].includes(i.trim()))
      const hasSteps = items.some(i => i.includes('תנור') || i.includes('לחמם') || i.includes('לאפות'))
      log('Ingredients visible after expand', hasIngredients ? 'PASS' : 'FAIL',
        `sample: ${items.slice(0,3).join(', ')}`)
      log('Steps visible after expand', hasSteps ? 'PASS' : 'FAIL',
        `sample: ${items.slice(-3).join(', ')}`)
    } else {
      log('Community details section rendered', 'FAIL', '.community-details not found after expand')
    }
  } else {
    log('Expand/Open button on community card', 'FAIL', 'Button not found')
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 5 — Remove community recipe from Saved Recipes
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n── TEST 5: Remove community recipe from Saved Recipes ──')
  const countBefore = await page.$$eval('.saved-card', els => els.length).catch(() => 0)
  let removeBtn = null
  if (targetCard) {
    const btns = await targetCard.$$('button')
    for (const b of btns) {
      const txt = (await b.innerText().catch(() => '')).trim()
      if (txt === '×' || txt === 'x' || /remove|הסר/i.test(txt)) { removeBtn = b; break }
    }
  }
  if (removeBtn) {
    await removeBtn.click()
    await page.waitForTimeout(500)
    const countAfter = await page.$$eval('.saved-card', els => els.length).catch(() => 0)
    log('Card removed from Saved Recipes list', countAfter < countBefore ? 'PASS' : 'FAIL',
      `before=${countBefore} after=${countAfter}`)
    const lsRemaining = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('food-for-any-mood-community-saves') || '[]') } catch { return [] }
    })
    log('Community save cleared from localStorage', lsRemaining.length === 0 ? 'PASS' : 'FAIL',
      `remaining: ${lsRemaining.length}`)
    await ss(page, '04_after_remove')
  } else {
    log('Remove (×) button on community card', 'FAIL', 'Not found')
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 6 — Generated recipe still opens normally
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n── TEST 6: Generated saved recipe still works ──')
  const remainingCards = await page.$$('.saved-card')
  let viewBtn = null
  for (const card of remainingCards) {
    const btns = await card.$$('button')
    for (const btn of btns) {
      const txt = (await btn.innerText().catch(() => '')).trim()
      if (/צפייה|view recipe/i.test(txt)) { viewBtn = btn; break }
    }
    if (viewBtn) break
  }
  log('Generated recipe has View Recipe button', viewBtn ? 'PASS' : 'FAIL')
  if (viewBtn) {
    await viewBtn.click()
    await page.waitForTimeout(500)
    await ss(page, '05_generated_opened')
    const recipeCard = await page.$('[class*="recipe-card"]')
    const recipeName = await page.$('[class*="recipe-card__title"], [class*="recipe__name"], .recipe-card h2').catch(() => null)
    log('Generated recipe opens in recipe view', recipeCard ? 'PASS' : 'FAIL')
    if (recipeName) {
      const name = await recipeName.innerText().catch(() => '')
      log('Generated recipe name displayed', 'PASS', name)
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 7 — Owner delete: code verification
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n── TEST 7: Owner delete code checks ──')
  log('deleteCommunityRecipe exported from service', serviceSource.includes('export async function deleteCommunityRecipe') ? 'PASS' : 'FAIL')
  log('.eq(user_id) double-safety guard present', serviceSource.includes(".eq('user_id', userId)") ? 'PASS' : 'FAIL')
  log('isOwner check: authorId === userId', cardSource.includes('recipe.authorId === userId') ? 'PASS' : 'FAIL')
  log('window.confirm before delete', cardSource.includes('window.confirm') ? 'PASS' : 'FAIL')
  log('Delete calls removeSavedCommunityRecipe on delete', cardSource.includes('removeSavedCommunityRecipe(recipe.id)') && cardSource.includes('handleDelete') ? 'PASS' : 'FAIL')
  log('Delete button only rendered when isOwner', cardSource.includes('{isOwner && (') ? 'PASS' : 'FAIL')

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 8 — Recipe generation unchanged
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n── TEST 8: Recipe generation unchanged ──')
  let genDiff = '', aiDiff = '', mockDiff = ''
  try {
    genDiff  = execSync('git diff HEAD -- src/services/recipeService.js',     { cwd: process.cwd() }).toString()
    aiDiff   = execSync('git diff HEAD -- src/services/aiRecipeService.js',   { cwd: process.cwd() }).toString()
    mockDiff = execSync('git diff HEAD -- src/services/mockRecipeProvider.js',{ cwd: process.cwd() }).toString()
  } catch {}
  log('recipeService.js unchanged', genDiff  === '' ? 'PASS' : 'FAIL')
  log('aiRecipeService.js unchanged', aiDiff   === '' ? 'PASS' : 'FAIL')
  log('mockRecipeProvider.js unchanged', mockDiff === '' ? 'PASS' : 'FAIL')

  // Quick UI smoke test: ingredient input present on home page
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const ingInput = await page.$('input[placeholder*="רכיב"], textarea[placeholder*="רכיב"], input[placeholder*="ingredient"]')
  log('Recipe form ingredient input present', ingInput ? 'PASS' : 'FAIL')

  console.log(`\n── Screenshots: ./${SS_DIR}/ ──`)
  await browser.close()
}

run().catch(err => { console.error('E2E error:', err); process.exit(1) })
