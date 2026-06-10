import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { DAILY_QUIZ_QUESTIONS } from '../src/data/dailyQuizQuestions.js'
import { ALL_QUIZ_IDS, computeNextQuizAssignment } from '../src/utils/dailyQuiz/quizRotation.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

function verifyQuestionBank() {
  const ids = DAILY_QUIZ_QUESTIONS.map((question) => question.id)
  assert.equal(ids.length, 100, `Expected 100 questions, got ${ids.length}`)
  assert.equal(new Set(ids).size, 100, 'Question IDs must be unique')

  for (const question of DAILY_QUIZ_QUESTIONS) {
    assert.ok(question.question?.he && question.question?.en, `Missing bilingual question: ${question.id}`)
    assert.equal(question.options?.he?.length, 4, `Expected 4 Hebrew options: ${question.id}`)
    assert.equal(question.options?.en?.length, 4, `Expected 4 English options: ${question.id}`)
    assert.ok(question.correctIndex >= 0 && question.correctIndex <= 3, `Invalid correctIndex: ${question.id}`)
    assert.ok(question.explanation?.he && question.explanation?.en, `Missing explanation: ${question.id}`)
  }

  assert.equal(ALL_QUIZ_IDS.length, 100)
  console.log('PASS: exactly 100 unique bilingual Daily Quiz questions')
}

function verifyRotationLogic() {
  let usedQuizIds = []
  let cycleNumber = 1
  const seen = new Set()

  for (let day = 0; day < 100; day += 1) {
    const month = String(Math.floor(day / 28) + 1).padStart(2, '0')
    const dateDay = String((day % 28) + 1).padStart(2, '0')
    const dateKey = `2026-${month}-${dateDay}`
    const assignment = computeNextQuizAssignment(dateKey, usedQuizIds, cycleNumber)
    assert.ok(!seen.has(assignment.quizId), `Repeat before cycle complete on ${dateKey}: ${assignment.quizId}`)
    seen.add(assignment.quizId)
    usedQuizIds = assignment.usedQuizIds
    cycleNumber = assignment.cycleNumber
  }

  assert.equal(seen.size, 100)
  assert.equal(usedQuizIds.length, 100)

  const day101 = computeNextQuizAssignment('2026-04-11', usedQuizIds, cycleNumber)
  assert.equal(day101.cycleNumber, cycleNumber + 1)
  assert.equal(day101.usedQuizIds.length, 1)
  console.log('PASS: no repeats until all 100 questions are used; cycle resets afterward')
}

function verifyUnchangedQuizBehavior() {
  const serviceSource = readFileSync(join(root, 'src', 'services', 'dailyQuizService.js'), 'utf8')
  const modalSource = readFileSync(join(root, 'src', 'components', 'dailyQuiz', 'DailyQuizModal.jsx'), 'utf8')

  assert.match(serviceSource, /POINT_AWARDS\.QUIZ_CORRECT/)
  assert.match(serviceSource, /applyQuizParticipationStreak/)
  assert.match(serviceSource, /applyQuizCorrectStreak/)
  assert.match(serviceSource, /throw new Error\('ALREADY_ANSWERED'\)/)
  assert.match(modalSource, /submitDailyQuizAnswer/)
  assert.match(modalSource, /fetchUserQuizAnswerToday/)
  assert.match(modalSource, /resolveTodayQuiz/)
  assert.doesNotMatch(modalSource, /generateDailyQuiz\(/)
  console.log('PASS: Daily Quiz UI wiring, scoring, streaks, and one-answer-per-day logic unchanged')
}

async function verifySupabaseMigration() {
  loadEnv()
  const url = process.env.VITE_SUPABASE_URL?.trim()
  const key = process.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) {
    console.warn('SKIP: Supabase env vars missing — cannot verify remote migration')
    return false
  }

  const supabase = createClient(url, key)
  const checks = []

  for (const table of ['daily_quiz_schedule', 'daily_quiz_rotation', 'daily_quiz_answers']) {
    const { error } = await supabase.from(table).select('*').limit(1)
    checks.push({ name: table, ok: !error, error: error?.message })
  }

  const { error: rpcError } = await supabase.rpc('assign_daily_quiz', {
    p_quiz_date: '2099-01-01',
    p_quiz_id: 'basil-origin',
    p_cycle_number: 1,
    p_used_quiz_ids: ['basil-origin'],
  })
  checks.push({ name: 'assign_daily_quiz RPC', ok: !rpcError, error: rpcError?.message })

  const failed = checks.filter((check) => !check.ok)
  if (failed.length) {
    for (const check of failed) {
      console.error(`FAIL: ${check.name} — ${check.error}`)
    }
    return false
  }

  const { data: rotation } = await supabase
    .from('daily_quiz_rotation')
    .select('id, cycle_number, used_quiz_ids')
    .eq('id', 'global')
    .maybeSingle()

  assert.ok(rotation, 'daily_quiz_rotation global row missing')
  assert.equal(rotation.id, 'global')
  console.log('PASS: Supabase migration objects exist (tables + assign_daily_quiz RPC)')
  return true
}

async function main() {
  verifyQuestionBank()
  verifyRotationLogic()
  verifyUnchangedQuizBehavior()
  const migrated = await verifySupabaseMigration()
  if (!migrated) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error)
  process.exit(1)
})
