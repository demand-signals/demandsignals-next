// Auto-generated payment terms for SOWs and Invoices.
//
// Terms are generated from the actual structure of the document (deposit %,
// recurring cadence, TIK, discount, due date) so the prose matches the math.
// Admin can edit the auto-generated text — once they do, regeneration is opt-in
// (the UI offers a "Regenerate from terms" button) so we never overwrite custom
// language silently.

export interface SowTermsInputs {
  oneTimeCents: number
  monthlyCents: number
  quarterlyCents: number
  annualCents: number
  depositPct: number     // 0–100
  depositCents: number
  tradeCents: number
  discountCents: number
  netDays?: number       // default 14
}

export interface InvoiceTermsInputs {
  totalCents: number
  dueDate: string | null         // ISO date string
  tradeCents: number
  discountCents: number
  lateFeeCents: number
  lateFeeGraceDays: number
  netDays?: number               // default 14 if no dueDate
}

function dollars(cents: number): string {
  if (cents <= 0) return '$0'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

function plural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

// ── SOW payment terms ───────────────────────────────────────────────
//
// Builds prose like:
//   "25% deposit ($1,500) on acceptance. Balance of $4,500 due on delivery,
//    net 14. Trade-in-kind credit of $1,000 applied. Recurring services billed
//    monthly per cadence."
//
// Returns empty string if there's nothing meaningful to say (no items).

export function buildSowPaymentTerms(inputs: SowTermsInputs): string {
  const {
    oneTimeCents,
    monthlyCents,
    quarterlyCents,
    annualCents,
    depositPct,
    depositCents,
    tradeCents,
    discountCents,
    netDays = 14,
  } = inputs

  const cashTotal = Math.max(0, oneTimeCents - discountCents - tradeCents)
  const balance = Math.max(0, cashTotal - depositCents)
  const hasOneTime = oneTimeCents > 0
  const hasRecurring =
    monthlyCents > 0 || quarterlyCents > 0 || annualCents > 0

  if (!hasOneTime && !hasRecurring && tradeCents === 0) return ''

  const sentences: string[] = []

  if (hasOneTime) {
    if (depositPct > 0 && depositCents > 0) {
      sentences.push(
        `${depositPct}% deposit (${dollars(depositCents)}) due on acceptance.`,
      )
      if (balance > 0) {
        sentences.push(
          `Balance of ${dollars(balance)} due on delivery, net ${netDays}.`,
        )
      }
    } else if (cashTotal > 0) {
      sentences.push(
        `${dollars(cashTotal)} due on delivery, net ${netDays}.`,
      )
    }
  }

  if (discountCents > 0) {
    sentences.push(`Discount of ${dollars(discountCents)} applied to one-time total.`)
  }

  if (tradeCents > 0) {
    sentences.push(
      `Trade-in-kind credit of ${dollars(tradeCents)} applied; client delivers agreed services in lieu of cash for that portion.`,
    )
  }

  if (hasRecurring) {
    const recurringParts: string[] = []
    if (monthlyCents > 0) recurringParts.push(`${dollars(monthlyCents)}/mo`)
    if (quarterlyCents > 0) recurringParts.push(`${dollars(quarterlyCents)}/qtr`)
    if (annualCents > 0) recurringParts.push(`${dollars(annualCents)}/yr`)
    sentences.push(
      `Recurring services billed ${recurringParts.join(' + ')} per deliverable start trigger; auto-charged via card on file.`,
    )
  }

  return sentences.join(' ')
}

// ── Invoice payment terms ───────────────────────────────────────────
//
// Builds prose like:
//   "Total $1,500 due by May 15, 2026 (net 14). Trade-in-kind credit of $500
//    applied. Late fee of $50 applies after 7 days past due."
//
// Returns empty string for $0 invoices (nothing to say).

export function buildInvoicePaymentTerms(inputs: InvoiceTermsInputs): string {
  const {
    totalCents,
    dueDate,
    tradeCents,
    discountCents,
    lateFeeCents,
    lateFeeGraceDays,
    netDays = 14,
  } = inputs

  if (totalCents <= 0) return ''

  const sentences: string[] = []

  if (dueDate) {
    const formatted = formatDueDate(dueDate)
    sentences.push(`Total ${dollars(totalCents)} due by ${formatted}.`)
  } else {
    sentences.push(
      `Total ${dollars(totalCents)} due net ${netDays} from issue date.`,
    )
  }

  if (discountCents > 0) {
    sentences.push(`Discount of ${dollars(discountCents)} already applied.`)
  }

  if (tradeCents > 0) {
    sentences.push(
      `Trade-in-kind credit of ${dollars(tradeCents)} applied; client delivers agreed services in lieu of cash for that portion.`,
    )
  }

  if (lateFeeCents > 0 && lateFeeGraceDays >= 0) {
    sentences.push(
      `Late fee of ${dollars(lateFeeCents)} applies after ${lateFeeGraceDays} ${plural(lateFeeGraceDays, 'day', 'days')} past due.`,
    )
  }

  return sentences.join(' ')
}

function formatDueDate(iso: string): string {
  // Accepts 'YYYY-MM-DD' or full ISO. Returns a human-readable date in the
  // server's locale (en-US). Avoids importing date-fns; this is good enough.
  const datePart = iso.length >= 10 ? iso.slice(0, 10) : iso
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
