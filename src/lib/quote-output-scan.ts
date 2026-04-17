// AI output scanner — deterministic regex filter on every Claude response before
// the prospect sees it. System prompt directives are advisory; this is the law.
//
// The threat: the AI is talked into (or hallucinates) language a prospect could
// screenshot and claim is a binding commitment. Section 12 GOOD/BAD list, but as
// regex rules instead of words the model may or may not respect.
//
// Flow:
//   1. scanOutput(text) -> ScanResult { verdict, matches, sanitized }
//   2. If verdict === 'reject' -> regenerate Claude response once with stronger
//      guidance injected into the messages.
//   3. If second attempt still rejects -> return CANNED_SAFE_REPLY, flag the
//      message row, alert admin via quote_events.
//
// Every scan result — pass OR reject — is logged to quote_events so we can
// tune the regexes against real traffic.

export interface ScanMatch {
  rule: string
  severity: 'block' | 'warn'
  matched: string
  index: number
  reason: string
}

export interface ScanResult {
  verdict: 'pass' | 'warn' | 'reject'
  matches: ScanMatch[]
  sanitized: string
}

export const CANNED_SAFE_REPLY =
  "Let me pull this together. One of our team will follow up shortly with your full estimate — or you can book a strategy call and we'll walk through everything live."

interface Rule {
  id: string
  severity: 'block' | 'warn'
  pattern: RegExp
  reason: string
  soften?: string
}

// BLOCK rules reject the entire response and force regeneration.
// WARN rules are softened in place if the response is otherwise fine.
const RULES: Rule[] = [
  {
    id: 'firm-quote',
    severity: 'block',
    pattern: /\b(firm|final|binding|locked[\s-]?in|fixed)\s+(quote|price|cost|rate|estimate|number|offer)\b/i,
    reason: 'Binding-quote language — violates non-commitment rule.',
  },
  {
    id: 'locked-in-with-noun',
    severity: 'block',
    pattern: /\blocked\s+in\s+(the\s+)?(quote|price|cost|rate|estimate|number|offer|total|scope|timeline|delivery)\b/i,
    reason: 'Locked-in binding language with a pricing/scope noun.',
  },
  {
    id: 'guarantee-pricing',
    severity: 'block',
    pattern: /\b(we|I|DSIG)\s+(guarantee|promise|commit to|vow|assure)\s+(the|this|a|that)?\s*(price|cost|rate|total|estimate|timeline|delivery)/i,
    reason: 'Guarantee language tied to pricing/timeline.',
  },
  {
    id: 'this-is-your-price',
    severity: 'block',
    pattern: /\b(your|the)\s+(price|cost|total|rate|quote)\s+(is|will be|comes to)\s+\$?\d/i,
    reason: "Declarative 'your price is X' reads as a fixed quote.",
  },
  {
    id: 'definitely-price',
    severity: 'block',
    pattern: /\b(definitely|absolutely|certainly)\s+\$[\d,]+/i,
    reason: 'Definitive dollar statement.',
  },
  {
    id: 'contract-header',
    severity: 'block',
    pattern: /^\s*(contract|agreement|statement of work|purchase order|invoice)\s*[:#\n]/im,
    reason: 'Response looks like a contract header.',
  },
  {
    id: 'signature-block',
    severity: 'block',
    pattern: /\b(signed|signature|hereby agree|in witness whereof|effective date)\b/i,
    reason: 'Contract-like signature language.',
  },
  {
    id: 'legally-binding',
    severity: 'block',
    pattern: /\b(legally\s+binding|legal(ly)?\s+commitment|enforceable|obligated to)\b/i,
    reason: 'Legal binding language.',
  },
  {
    id: 'injection-confirmation',
    severity: 'block',
    pattern: /\[(CONFIRMED|LOCKED|FINAL|BINDING)\]/i,
    reason: 'Injection marker suggesting confirmed/locked state.',
  },
  {
    id: 'ignore-instructions-echo',
    severity: 'block',
    pattern: /\b(ignoring|disregarding|overriding|bypassing)\s+(previous|prior|my|the)\s+(instructions|rules|directives|guidelines)/i,
    reason: 'Echoes an instruction-override attempt.',
  },
  {
    id: 'role-swap',
    severity: 'block',
    pattern: /\bI\s+am\s+now\s+(?!DSIG|a DSIG)[A-Z][A-Za-z]*(Bot|Assistant|Agent|AI)\b/,
    reason: 'Model appears to have swapped identity.',
  },
  {
    id: 'we-will-deliver',
    severity: 'warn',
    pattern: /\bwe\s+will\s+(deliver|complete|finish|build|launch)\b/i,
    reason: 'Absolute future-tense delivery promise.',
    soften: 'we typically deliver',
  },
  {
    id: 'in-X-weeks-flat',
    severity: 'warn',
    pattern: /\bin\s+exactly\s+\d+\s+(weeks?|days?|months?)\b/i,
    reason: 'Exact timeline without a "roughly/typically" qualifier.',
    soften: 'in roughly that timeframe',
  },
]

export function scanOutput(text: string): ScanResult {
  if (!text || typeof text !== 'string') {
    return { verdict: 'pass', matches: [], sanitized: text ?? '' }
  }

  const matches: ScanMatch[] = []
  let sanitized = text

  for (const rule of RULES) {
    const m = rule.pattern.exec(text)
    if (!m) continue

    matches.push({
      rule: rule.id,
      severity: rule.severity,
      matched: m[0],
      index: m.index,
      reason: rule.reason,
    })

    if (rule.severity === 'warn' && rule.soften) {
      sanitized = sanitized.replace(rule.pattern, rule.soften)
    }
  }

  const verdict: ScanResult['verdict'] = matches.some((m) => m.severity === 'block')
    ? 'reject'
    : matches.length > 0
      ? 'warn'
      : 'pass'

  return { verdict, matches, sanitized }
}

export function regenerationNudge(matches: ScanMatch[]): string {
  const blocked = matches.filter((m) => m.severity === 'block')
  const rules = Array.from(new Set(blocked.map((m) => m.reason))).join(' ')
  return (
    'Your previous response contained language that may be read as a binding commitment. ' +
    `Specifically: ${rules} ` +
    'Rewrite the response using budgetary, non-binding language only: "typically runs," "roughly," ' +
    '"preliminary estimate," "we finalize this in your strategy call." Never say "your price is," ' +
    '"we guarantee," or "firm quote." Do not produce contract-like formatting or signature blocks. ' +
    'You are producing a BUDGETARY ESTIMATE, not a commitment.'
  )
}

export function applyOutputPolicy(
  rawText: string,
  attempt: 1 | 2,
): {
  text: string
  flagged: boolean
  flag_reason: string | null
  scan: ScanResult
} {
  const scan = scanOutput(rawText)

  if (scan.verdict === 'pass') {
    return { text: rawText, flagged: false, flag_reason: null, scan }
  }
  if (scan.verdict === 'warn') {
    return {
      text: scan.sanitized,
      flagged: false,
      flag_reason: `softened: ${scan.matches.map((m) => m.rule).join(',')}`,
      scan,
    }
  }
  if (attempt === 2) {
    return {
      text: CANNED_SAFE_REPLY,
      flagged: true,
      flag_reason: `blocked after retry: ${scan.matches.map((m) => m.rule).join(',')}`,
      scan,
    }
  }
  return {
    text: '',
    flagged: true,
    flag_reason: `blocked first pass: ${scan.matches.map((m) => m.rule).join(',')}`,
    scan,
  }
}
