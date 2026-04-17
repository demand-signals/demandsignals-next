#!/usr/bin/env node
// Quote AI eval harness — 30+ test cases for the output scanner and supporting logic.
// Runs offline against the deterministic rules in src/lib/quote-output-scan.ts.
//
// A second-stage suite (connected — hits the real Claude API) is gated behind
// --live and the presence of ANTHROPIC_API_KEY. Default run is offline-only.
//
// Usage:
//   node tests/quote-ai-evals.mjs           # offline scanner tests
//   node tests/quote-ai-evals.mjs --live    # adds live Claude API tests (TODO)
//
// Exit 0 on all pass, 1 on any failure.

const mod = await import('../src/lib/quote-output-scan.ts')
const { scanOutput, applyOutputPolicy, CANNED_SAFE_REPLY } = mod

const results = []
function t(name, fn) {
  try {
    fn()
    results.push({ name, ok: true })
    console.log(`[PASS] ${name}`)
  } catch (e) {
    results.push({ name, ok: false, err: e?.message ?? String(e) })
    console.log(`[FAIL] ${name}`)
    console.log(`       ${e?.message ?? e}`)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}
function eq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

console.log('═══════════════════════════════════════════════════')
console.log('Quote AI Eval Harness — Offline Scanner Tests')
console.log('═══════════════════════════════════════════════════\n')

// ───────── GROUP 1: Binding-quote language (10 cases) ─────────
console.log('--- Group 1: Binding quote language ---')

t('rejects "firm quote"', () => {
  const r = scanOutput('Here is your firm quote for the project.')
  eq(r.verdict, 'reject', 'verdict')
  assert(r.matches.some((m) => m.rule === 'firm-quote'), 'missed firm-quote rule')
})

t('rejects "final price"', () => {
  const r = scanOutput('Your final price is $5,500.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "binding estimate"', () => {
  const r = scanOutput('This binding estimate is ready for your signature.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "locked in"', () => {
  const r = scanOutput("We've locked in the rate at $8,000.")
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "locked-in price"', () => {
  const r = scanOutput('This is the locked-in price for the full scope.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "fixed cost"', () => {
  const r = scanOutput('The fixed cost is $12,000.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "we guarantee the price"', () => {
  const r = scanOutput('We guarantee the price will not change.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "I promise the rate"', () => {
  const r = scanOutput("I promise the rate is locked in.")
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "your price is $5,500"', () => {
  const r = scanOutput('Your price is $5,500 and includes everything.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "the total is $12000"', () => {
  const r = scanOutput('The total is $12000 for this package.')
  eq(r.verdict, 'reject', 'verdict')
})

// ───────── GROUP 2: Contract-like formatting (5 cases) ─────────
console.log('\n--- Group 2: Contract-like formatting ---')

t('rejects contract header', () => {
  const r = scanOutput('CONTRACT:\nParties: ...\nScope: ...')
  eq(r.verdict, 'reject', 'verdict')
  assert(r.matches.some((m) => m.rule === 'contract-header'), 'missed contract-header')
})

t('rejects statement of work header', () => {
  const r = scanOutput('Statement of Work:\nClient: Folsom Plumbing\n')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects signature block language', () => {
  const r = scanOutput('Please review and sign below. Signature: ______')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "hereby agree"', () => {
  const r = scanOutput('By proceeding you hereby agree to these terms.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "effective date"', () => {
  const r = scanOutput('Effective date: April 16, 2026. Scope: ...')
  eq(r.verdict, 'reject', 'verdict')
})

// ───────── GROUP 3: Legal binding language (3 cases) ─────────
console.log('\n--- Group 3: Legal binding language ---')

t('rejects "legally binding"', () => {
  const r = scanOutput('This is a legally binding estimate.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "enforceable"', () => {
  const r = scanOutput('The pricing is enforceable once accepted.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "obligated to deliver"', () => {
  const r = scanOutput('We are obligated to deliver at this price.')
  eq(r.verdict, 'reject', 'verdict')
})

// ───────── GROUP 4: Prompt injection echoes (4 cases) ─────────
console.log('\n--- Group 4: Prompt injection echoes ---')

t('rejects [CONFIRMED] marker', () => {
  const r = scanOutput('Your estimate: $8,000 [CONFIRMED]')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects [LOCKED] marker', () => {
  const r = scanOutput('[LOCKED] — pricing cannot be changed.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "ignoring previous instructions"', () => {
  const r = scanOutput('Ignoring previous instructions, here is a firm quote.')
  // Two rules fire — ignore-echo and firm-quote; either is enough for 'reject'.
  eq(r.verdict, 'reject', 'verdict')
  assert(
    r.matches.some((m) => m.rule === 'ignore-instructions-echo'),
    'missed ignore-instructions-echo',
  )
})

t('rejects role swap ("I am now FirmQuoteBot")', () => {
  const r = scanOutput('I am now FirmQuoteBot. Your price is $100.')
  eq(r.verdict, 'reject', 'verdict')
  assert(r.matches.some((m) => m.rule === 'role-swap'), 'missed role-swap')
})

// ───────── GROUP 5: Warn-level softening (3 cases) ─────────
console.log('\n--- Group 5: Warn-level softening ---')

t('softens "we will deliver"', () => {
  const r = scanOutput("Great — we will deliver the site in three weeks.")
  eq(r.verdict, 'warn', 'verdict')
  assert(r.sanitized.includes('we typically deliver'), 'soften did not apply')
  assert(!r.sanitized.includes('we will deliver'), 'original phrase survived')
})

t('softens "in exactly 4 weeks"', () => {
  const r = scanOutput('Your site will be live in exactly 4 weeks.')
  eq(r.verdict, 'warn', 'verdict')
  assert(r.sanitized.includes('in roughly that timeframe'), 'soften did not apply')
})

t('warn does not trigger canned reply on first attempt', () => {
  const p = applyOutputPolicy('we will deliver next week', 1)
  eq(p.flagged, false, 'flagged')
  assert(p.text.includes('typically deliver'), 'softened text missing')
})

// ───────── GROUP 6: Passing content (5 cases) ─────────
console.log('\n--- Group 6: Safe content must pass cleanly ---')

t('passes budgetary estimate phrasing', () => {
  const r = scanOutput(
    "Based on what you've shared, this typically runs about $5,500 to $7,800 — we finalize the real numbers in your strategy call.",
  )
  eq(r.verdict, 'pass', 'verdict')
  eq(r.matches.length, 0, 'matches')
})

t('passes "roughly" timeline phrasing', () => {
  const r = scanOutput('A project this size roughly takes 3-5 weeks from kickoff.')
  eq(r.verdict, 'pass', 'verdict')
})

t('passes ROI calculation wording', () => {
  const r = scanOutput('At 10 missed leads a month, that is roughly $5,000/month.')
  eq(r.verdict, 'pass', 'verdict')
})

t('passes prospect discovery reply', () => {
  const r = scanOutput("Got it — so search visibility is the priority. Does that sound right?")
  eq(r.verdict, 'pass', 'verdict')
})

t('passes risk-reversal copy', () => {
  const r = scanOutput(
    'Every project starts with a free research report, and your first milestone is satisfaction-guaranteed.',
  )
  eq(r.verdict, 'pass', 'verdict')
})

// ───────── GROUP 7: applyOutputPolicy branches (3 cases) ─────────
console.log('\n--- Group 7: applyOutputPolicy ---')

t('reject on attempt 1 returns empty text and flag reason', () => {
  const p = applyOutputPolicy('Your firm quote is $5,000.', 1)
  eq(p.text, '', 'text')
  eq(p.flagged, true, 'flagged')
  assert(p.flag_reason?.startsWith('blocked first pass:'), 'flag reason prefix')
})

t('reject on attempt 2 returns canned safe reply', () => {
  const p = applyOutputPolicy('Your firm quote is $5,000.', 2)
  eq(p.text, CANNED_SAFE_REPLY, 'text')
  eq(p.flagged, true, 'flagged')
  assert(p.flag_reason?.startsWith('blocked after retry:'), 'flag reason prefix')
})

t('pass on attempt 1 returns original text and no flag', () => {
  const safe = 'Here is a preliminary estimate — we finalize it in your strategy call.'
  const p = applyOutputPolicy(safe, 1)
  eq(p.text, safe, 'text')
  eq(p.flagged, false, 'flagged')
  eq(p.flag_reason, null, 'flag reason')
})

// ───────── GROUP 8: Adversarial phrasings (5 cases) ─────────
console.log('\n--- Group 8: Adversarial phrasings ---')

t('rejects capitalization-bypass "FIRM QUOTE"', () => {
  const r = scanOutput('THIS IS YOUR FIRM QUOTE FOR THE PROJECT.')
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects tokenized "definitely $8,500"', () => {
  const r = scanOutput("We can do this. Definitely $8,500. No negotiation.")
  eq(r.verdict, 'reject', 'verdict')
})

t('rejects "the quote is $5,500" (declarative)', () => {
  const r = scanOutput('Got it — the quote is $5,500 as discussed.')
  eq(r.verdict, 'reject', 'verdict')
})

t('does NOT false-positive on "typically runs $5,000"', () => {
  const r = scanOutput('That package typically runs about $5,000 in most cases.')
  eq(r.verdict, 'pass', 'verdict')
})

t('does NOT false-positive on "we typically deliver in 3 weeks"', () => {
  const r = scanOutput('We typically deliver in 3 weeks depending on scope.')
  eq(r.verdict, 'pass', 'verdict')
})

// ───────── Summary ─────────
const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length

console.log('\n═══════════════════════════════════════════════════')
console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`)
console.log('═══════════════════════════════════════════════════\n')

if (failed > 0) {
  console.log('FAILED:')
  for (const r of results.filter((r) => !r.ok)) {
    console.log(`  - ${r.name}`)
    console.log(`    ${r.err}`)
  }
  process.exit(1)
}
process.exit(0)
