/**
 * Apply Daily Quiz Supabase migrations.
 *
 * Option A — direct Postgres (recommended for local/CI):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@... node scripts/apply-daily-quiz-migration.mjs
 *
 * Option B — Supabase Management API:
 *   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=hlnveltecvxcysvromxn node scripts/apply-daily-quiz-migration.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF?.trim() || 'hlnveltecvxcysvromxn'
const SQL_FILES = [
  join(root, 'supabase', 'daily-quiz.sql'),
  join(root, 'supabase', 'daily-quiz-rotation.sql'),
]

function loadSql(path) {
  return readFileSync(path, 'utf8')
}

async function applyViaPg(dbUrl) {
  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    for (const file of SQL_FILES) {
      const sql = loadSql(file)
      console.log(`Running ${file}...`)
      await client.query(sql)
      console.log(`OK: ${file}`)
    }
  } finally {
    await client.end()
  }
}

async function applyViaManagementApi(token) {
  for (const file of SQL_FILES) {
    const sql = loadSql(file)
    console.log(`Running ${file} via Management API...`)
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      },
    )
    const body = await response.text()
    if (!response.ok) {
      throw new Error(`Management API failed (${response.status}): ${body}`)
    }
    console.log(`OK: ${file}`)
  }
}

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim()
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()

  if (dbUrl) {
    await applyViaPg(dbUrl)
    console.log('Migration complete (Postgres).')
    return
  }

  if (accessToken) {
    await applyViaManagementApi(accessToken)
    console.log('Migration complete (Management API).')
    return
  }

  console.error(
    'Missing credentials. Set SUPABASE_DB_URL (Postgres connection string) or SUPABASE_ACCESS_TOKEN.',
  )
  process.exit(1)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
