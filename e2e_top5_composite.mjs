import { chromium } from 'playwright'
import fs from 'fs'

const files = [
  ['Home desktop', 'e2e_ss_top5/01_home_desktop.png'],
  ['Home mobile', 'e2e_ss_top5/02_home_mobile.png'],
  ['Community desktop', 'e2e_ss_top5/03_community_desktop.png'],
  ['Community mobile', 'e2e_ss_top5/04_community_mobile.png'],
]

const sections = files
  .map(([label, path]) => {
    const b64 = fs.readFileSync(path).toString('base64')
    return `<div style="padding:16px;border-bottom:2px solid #ddd">
      <h2 style="margin:0 0 12px;font-size:18px">${label}</h2>
      <img src="data:image/png;base64,${b64}" style="max-width:100%;height:auto;display:block" />
    </div>`
  })
  .join('')

const html = `<!doctype html><html><body style="margin:0;background:#fff;font-family:sans-serif">${sections}</body></html>`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1320, height: 800 } })
await page.setContent(html, { waitUntil: 'load' })
await page.screenshot({ path: 'e2e_ss_top5/all_top5_screenshots.png', fullPage: true })
await browser.close()
console.log('saved e2e_ss_top5/all_top5_screenshots.png')
