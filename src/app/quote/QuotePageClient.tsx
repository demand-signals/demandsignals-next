'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Phone, Send, Loader2, Lock, Unlock, Sparkles, X } from 'lucide-react'
import RetainerStep from '@/components/quote/RetainerStep'
import { MeetingConfirmedPanel } from '@/components/quote/MeetingConfirmedPanel'

// ============================================================
// Types
// ============================================================
interface SessionPublic {
  id: string
  share_token: string
  status: string
  business_name: string | null
  business_type?: string | null
  business_location?: string | null
  phone_verified: boolean
  phone_last_four: string | null
  selected_items: SelectedItem[]
  estimate_low: number | null
  estimate_high: number | null
  monthly_low: number | null
  monthly_high: number | null
  accuracy_pct: number
  build_path: string | null
  missed_leads_monthly: number | null
  avg_customer_value: number | null
  handoff_offered: boolean
  booking_id?: string | null
  attendee_email?: string | null
  booking_start_at?: string | null
  booking_meet_link?: string | null
}

interface SelectedItem {
  id: string
  quantity: number
  narrowing_answers?: Record<string, unknown>
}

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  text: string
  createdAt: number
}

interface PriceItem {
  id: string
  name: string
  benefit: string
  aiBadge: string
  quantity: number
  quantityLabel: string | null
  category: string
  isFree: boolean
  locked: boolean
  oneTimeLow?: number
  oneTimeHigh?: number
  monthlyLow?: number
  monthlyHigh?: number
}

interface PricesPayload {
  locked: boolean
  items: PriceItem[]
  totals?: {
    upfront_low: number
    upfront_high: number
    monthly_low: number
    monthly_high: number
    timeline_weeks_low: number
    timeline_weeks_high: number
    accuracy_pct: number
  }
  monthly_plan?: {
    monthlyPaymentLow: number
    monthlyPaymentHigh: number
    depositLow: number
    depositHigh: number
    savingsLow: number
    savingsHigh: number
  }
  milestone_plan?: {
    eligible: boolean
    milestones: Array<{ label: string; low: number; high: number; dueAt: string }>
  }
  roi?: {
    monthlyLostCents: number
    annualLostCents: number
    recoverableMonthlyCents: number
    recoverableAnnualCents: number
    paybackMonths: number | null
    firstYearRoiPct: number | null
    display: 'full' | 'partial' | 'none'
    captureRatePct: number
  } | null
}

// ============================================================
// Utilities
// ============================================================
function formatCents(cents: number): string {
  if (!cents || cents < 0) return '$0'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

function formatRange(low: number | null | undefined, high: number | null | undefined): string {
  if (!low && !high) return '—'
  if (low === high) return formatCents(low ?? 0)
  return `${formatCents(low ?? 0)}–${formatCents(high ?? 0)}`
}

function detectDevice(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

// Display order for the configurator. Prospects intuitively expect:
//   1. The foundation — the website/app they're actually getting
//   2. Extra pages bolted onto it
//   3. Features / integrations (portals, APIs, custom)
//   4. SEO / discoverability (local SEO, long-tails, GBP, citations)
//   5. Content & social
//   6. AI / automation
//   7. Ongoing monthly services
//   8. Hosting
//   9. Research/strategy deliverables (usually free/bonus)
// Lower number = higher position on the list.
function categoryOrder(category: string | undefined): number {
  const ordering: Record<string, number> = {
    'your-website': 10,
    'existing-site': 10,
    'features-integrations': 20,
    'get-found': 30,
    'content-social': 40,
    'ai-automation': 50,
    'monthly-services': 60,
    'hosting': 70,
    'research-strategy': 80,
    'team-rates': 90,
  }
  return ordering[category ?? ''] ?? 99
}

// ============================================================
// Main component
// ============================================================
export default function QuotePageClient() {
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [session, setSession] = useState<SessionPublic | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prices, setPrices] = useState<PricesPayload | null>(null)
  const [sending, setSending] = useState(false)
  const [booting, setBooting] = useState(true)
  const [bootError, setBootError] = useState<string | null>(null)
  const [showPhoneGate, setShowPhoneGate] = useState(false)
  const [showEmailPlan, setShowEmailPlan] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Pulse the Unlock button when the AI thinks the prospect has invested enough
  // to be receptive. Never auto-opens the modal — prospect must click.
  const [unlockNudge, setUnlockNudge] = useState(false)
  // Soft-save card visible when the AI has sensed hesitation and called offer_soft_save.
  // Non-blocking, stays in the configurator, respectful off-ramp.
  const [softSaveOffered, setSoftSaveOffered] = useState(false)
  // Budget cap hit — disable input, stop echoing canned reply, show escalation card.
  const [budgetExceeded, setBudgetExceeded] = useState(false)
  const [paymentMode, setPaymentMode] = useState<'upfront' | 'monthly' | 'milestone'>('upfront')
  const [retainerComplete, setRetainerComplete] = useState(false)

  // ── Bootstrap: create session on mount ──────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Resume path: if the /quote/s/[token] ShareActions stashed a resume
        // session token, use it directly — skip the create-session POST so
        // the existing context (scope, research, business info) is preserved.
        const params = new URLSearchParams(window.location.search)
        const resumedToken = typeof window !== 'undefined'
          ? sessionStorage.getItem('dsig_quote_session_token')
          : null
        if (resumedToken && params.get('resumed') === '1') {
          sessionStorage.removeItem('dsig_quote_session_token')
          const getRes = await fetch('/api/quote/session', {
            method: 'GET',
            headers: { 'x-session-token': resumedToken },
          })
          if (getRes.ok) {
            const data = await getRes.json()
            if (!cancelled) {
              setSessionToken(resumedToken)
              setSession(data.session)
              setMessages([
                {
                  id: 'ai-resume',
                  role: 'ai',
                  text: "Picking up where we left off. Anything you'd like to adjust before we move forward?",
                  createdAt: Date.now(),
                },
              ])
            }
            if (!cancelled) setBooting(false)
            return
          }
          // If the GET failed (expired token), fall through to create a new session.
        }

        const res = await fetch('/api/quote/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referrer: document.referrer || undefined,
            utm_source: params.get('utm_source') ?? undefined,
            utm_medium: params.get('utm_medium') ?? undefined,
            utm_campaign: params.get('utm_campaign') ?? undefined,
            device: detectDevice(),
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            browser_language: navigator.language,
          }),
        })
        if (res.status === 429) {
          // Rate-limited by IP. Surface friendly alt-contact paths instead
          // of the generic boot error. Read the body which includes fallback URLs.
          const data = await res.json().catch(() => ({}))
          if (!cancelled) {
            setBootError(
              data.error ??
                "You've started several sessions recently. Please text us at (916) 542-2423 or email DemandSignals@gmail.com to continue.",
            )
          }
          return
        }
        if (!res.ok) throw new Error(`session create failed: ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setSessionToken(data.session_token)
        setSession(data.session)
        // Seed with the AI's opening message.
        setMessages([
          {
            id: 'ai-opener',
            role: 'ai',
            text: "Hey — happy to help you rough out what your project could look like. Let's start with the basics — what's your business name and where are you located?",
            createdAt: Date.now(),
          },
        ])
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'failed to start session'
        if (!cancelled) setBootError(msg)
      } finally {
        if (!cancelled) setBooting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Poll prices whenever selections or verification state change ─────
  const fetchPrices = useCallback(async () => {
    if (!sessionToken) return
    try {
      const res = await fetch('/api/quote/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({}),
      })
      if (!res.ok) return
      const data = (await res.json()) as PricesPayload
      setPrices(data)
    } catch {
      /* silent */
    }
  }, [sessionToken])

  useEffect(() => {
    if (!sessionToken) return
    fetchPrices()
  }, [sessionToken, session?.selected_items?.length, session?.phone_verified, fetchPrices])

  // ── Fire research subagent the first time we have business_name + location ─────
  // The subagent looks up GBP + scans the site in the background.
  // Idempotent on the server — safe to call even if triggered twice.
  const researchFiredRef = useRef(false)
  useEffect(() => {
    if (!sessionToken) return
    if (researchFiredRef.current) return
    if (!session?.business_name || !session?.business_location) return
    researchFiredRef.current = true
    fetch('/api/quote/research/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
      body: JSON.stringify({}),
    }).catch(() => {
      // Fire and forget. If the kick fails, the AI simply never gets findings and
      // the experience degrades gracefully to the pre-research flow.
      researchFiredRef.current = false
    })
  }, [sessionToken, session?.business_name, session?.business_location])

  // ── Send a chat message ──────────────────────────────
  async function sendMessage(text: string) {
    if (!sessionToken || !text.trim() || sending) return
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      createdAt: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)
    try {
      const res = await fetch('/api/quote/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({ message: text.trim() }),
      })
      const data = await res.json()
      if (data.budget_violation) {
        // Show the message ONCE. Subsequent budget hits return the same
        // message, but we suppress the duplicate client-side and also disable
        // the input + surface the escalation card. Never echo the same line.
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'ai' && last.text === data.message) return prev
          return [
            ...prev,
            { id: `ai-bv-${Date.now()}`, role: 'ai', text: data.message, createdAt: Date.now() },
          ]
        })
        if (data.disable_input) setBudgetExceeded(true)
        if (data.escalated) setSoftSaveOffered(true)
        return
      }
      if (data.session) {
        setSession((prev) => (prev ? { ...prev, ...data.session } : prev))
      }
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: 'ai', text: data.message ?? '…', createdAt: Date.now() },
      ])
      // Re-fetch prices after any tool calls fired
      if (data.tools && data.tools.length > 0) {
        fetchPrices()
      }
      // When the AI signals "ready for phone unlock", pulse the Unlock button.
      // We do NOT auto-open the modal — prospects click when they want pricing.
      // That keeps the flow voluntary: as they answer questions, locked items
      // stack up, curiosity grows, and they choose to unlock. Hard gate = panic.
      const toolNames: string[] = (data.tools ?? []).map((t: { name: string }) => t.name)
      if (toolNames.includes('request_phone_verify') && !session?.phone_verified) {
        setUnlockNudge(true)
      }
      // AI sensed hesitation and offered the soft save (bookmark this URL or email it).
      // Non-blocking card in the configurator. Stays visible for the rest of the session.
      if (toolNames.includes('offer_soft_save')) {
        setSoftSaveOffered(true)
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'ai',
          text: "Sorry — I hit a snag. Could you say that again? If this keeps happening, you can book a call directly and we'll pick it up there.",
          createdAt: Date.now(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  // ── Phone verification success ───────────────────────
  function onPhoneVerified(lastFour: string) {
    setSession((prev) => (prev ? { ...prev, phone_verified: true, phone_last_four: lastFour } : prev))
    setShowPhoneGate(false)
    setMessages((prev) => [
      ...prev,
      {
        id: `ai-pv-${Date.now()}`,
        role: 'ai',
        text: 'Got it — phone verified. Your budgetary prices just unlocked. Let me walk you through the numbers.',
        createdAt: Date.now(),
      },
    ])
    fetchPrices()
  }

  // ── Early boot states ───────────────────────────────
  if (booting) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--teal)]" />
      </div>
    )
  }

  if (bootError || !sessionToken) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Let's get you to a human.</h2>
          <p className="text-slate-600 mb-6">{bootError ?? "The estimator couldn't start a new session right now — no problem, three faster ways to reach us below."}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="sms:+19165422423" className="border border-slate-300 rounded-lg py-3 px-4 font-medium text-slate-700 hover:border-[var(--teal)] hover:text-[var(--teal)]">
              💬 Text us
              <div className="text-xs font-normal text-slate-500">(916) 542-2423</div>
            </a>
            <a href="mailto:DemandSignals@gmail.com" className="border border-slate-300 rounded-lg py-3 px-4 font-medium text-slate-700 hover:border-[var(--teal)] hover:text-[var(--teal)]">
              ✉️ Email us
              <div className="text-xs font-normal text-slate-500">DemandSignals@gmail.com</div>
            </a>
            <a
              href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3yjIRXePILfG3aDwDq7N_ZdQIEOxi0HioY6NFF1vzE7PfH-xYXGVOW95ZNJ0BZj5d4-uUVJNPK?gv=true"
              target="_blank"
              rel="noopener"
              className="bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white rounded-lg py-3 px-4 font-medium"
            >
              📅 Book a call
              <div className="text-xs font-normal opacity-90">30 mins, no pressure</div>
            </a>
          </div>
        </div>
      </div>
    )
  }

  const itemCount = prices?.items.length ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop: two columns. Mobile: chat full width + floating pill. */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Get a Budgetary Estimate</h1>
          <p className="text-slate-600 mt-1">
            Chat with our AI project advisor. Human-led strategy, AI-powered execution.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          {/* ───── Chat column ───── */}
          <Chat
            messages={messages}
            sending={sending}
            onSend={sendMessage}
            phoneVerified={!!session?.phone_verified}
            disabled={budgetExceeded}
          />

          {/* ───── Configurator column (desktop) ───── */}
          <div className="hidden lg:block">
            <Configurator
              session={session}
              prices={prices}
              paymentMode={paymentMode}
              onPaymentModeChange={setPaymentMode}
              onPhoneGateOpen={() => setShowPhoneGate(true)}
              onEmailPlanOpen={() => setShowEmailPlan(true)}
              nudge={unlockNudge}
              softSaveOffered={softSaveOffered}
              sessionToken={sessionToken}
              retainerComplete={retainerComplete}
              onRetainerComplete={() => setRetainerComplete(true)}
            />
          </div>
        </div>
      </div>

      {/* ───── Mobile: floating "View Estimate" pill ───── */}
      {!drawerOpen && itemCount > 0 && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-[var(--teal)] text-white rounded-full shadow-lg font-semibold flex items-center gap-2"
        >
          View Estimate
          <span className="bg-white/20 rounded-full px-2 text-sm">{itemCount}</span>
          {session?.phone_verified && prices?.totals ? (
            <span className="text-sm font-normal">
              {formatRange(prices.totals.upfront_low, prices.totals.upfront_high)}
            </span>
          ) : (
            <Lock className="w-4 h-4" />
          )}
        </button>
      )}

      {/* ───── Mobile drawer ───── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setDrawerOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 top-8 bg-white rounded-t-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDrawerOpen(false)}
              className="sticky top-0 right-0 float-right m-2 p-2 rounded-full bg-slate-100"
              aria-label="Close estimate drawer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4">
              <Configurator
                session={session}
                prices={prices}
                paymentMode={paymentMode}
                onPaymentModeChange={setPaymentMode}
                onPhoneGateOpen={() => {
                  setDrawerOpen(false)
                  setShowPhoneGate(true)
                }}
                onEmailPlanOpen={() => {
                  setDrawerOpen(false)
                  setShowEmailPlan(true)
                }}
                nudge={unlockNudge}
                softSaveOffered={softSaveOffered}
                sessionToken={sessionToken}
                retainerComplete={retainerComplete}
                onRetainerComplete={() => setRetainerComplete(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ───── Phone verification modal ───── */}
      {showPhoneGate && (
        <PhoneVerifyCard
          sessionToken={sessionToken}
          onClose={() => setShowPhoneGate(false)}
          onVerified={onPhoneVerified}
        />
      )}

      {/* ───── Email-me-plan modal (lower-commitment alternative) ───── */}
      {showEmailPlan && (
        <EmailPlanCard
          sessionToken={sessionToken}
          onClose={() => setShowEmailPlan(false)}
          onSent={() => {
            setShowEmailPlan(false)
            setMessages((prev) => [
              ...prev,
              {
                id: `ai-ep-${Date.now()}`,
                role: 'ai',
                text: "Got it — I'll send the plan to your inbox within a day. The team will follow up with any questions.",
                createdAt: Date.now(),
              },
            ])
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Chat component
// ============================================================
function Chat({
  messages,
  sending,
  onSend,
  phoneVerified,
  disabled = false,
}: {
  messages: ChatMessage[]
  sending: boolean
  onSend: (text: string) => void
  phoneVerified: boolean
  disabled?: boolean
}) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll the CHAT CONTAINER only (scrollTop on the ref) — never scrollTo
  // because that can bubble up to the window scroll on some layouts.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, sending])

  // Keep focus in the input across renders, including while the AI is thinking.
  // We never disable the input — just stop submit while sending. This way the
  // user can type their next message while the AI finishes replying.
  // Exception: budget cap hit → disabled, don't force focus on a disabled element.
  useEffect(() => {
    if (!sending && !disabled) inputRef.current?.focus()
  }, [sending, disabled])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || sending) return
    onSend(draft)
    setDraft('')
    // Refocus on next microtask so the setDraft rerender completes first.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[min(calc(100vh-220px),800px)] min-h-[500px] mb-8">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[var(--teal)]" />
        <span className="font-semibold text-slate-800">DSIG AI Project Advisor</span>
        {phoneVerified && (
          <span className="ml-auto text-xs text-emerald-600 flex items-center gap-1">
            <Unlock className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[var(--teal)] text-white'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              thinking…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3 flex gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            disabled
              ? "Chat closed — team's been notified"
              : sending
                ? 'Thinking…'
                : 'Type your reply…'
          }
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)] disabled:bg-slate-50 disabled:cursor-not-allowed"
          aria-label="Chat message"
          autoComplete="off"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending || disabled}
          className="bg-[var(--teal)] text-white px-4 rounded-lg disabled:opacity-40 flex items-center gap-1 text-sm font-medium"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>

      <div className="px-5 py-2 text-[10px] text-slate-400 border-t border-slate-100">
        Budgetary estimate — not a binding quote. Final scope and pricing are confirmed in your Statement of Work.
      </div>
    </div>
  )
}

// ============================================================
// Configurator component
// ============================================================
function Configurator({
  session,
  prices,
  paymentMode,
  onPaymentModeChange,
  onPhoneGateOpen,
  onEmailPlanOpen,
  nudge,
  softSaveOffered,
  sessionToken,
  retainerComplete,
  onRetainerComplete,
}: {
  session: SessionPublic | null
  prices: PricesPayload | null
  paymentMode: 'upfront' | 'monthly' | 'milestone'
  onPaymentModeChange: (m: 'upfront' | 'monthly' | 'milestone') => void
  onPhoneGateOpen: () => void
  onEmailPlanOpen: () => void
  nudge: boolean
  softSaveOffered: boolean
  sessionToken: string
  retainerComplete: boolean
  onRetainerComplete: () => void
}) {
  const items = prices?.items ?? []
  const verified = session?.phone_verified ?? false

  return (
    <aside className="bg-white rounded-2xl shadow-sm border border-slate-200 lg:sticky lg:top-4">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">
            {session?.business_name ?? 'Your Project'}
          </h3>
          {prices?.totals && (
            <span className="text-xs text-slate-500">
              Detail: {prices.totals.accuracy_pct}%
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">Project Estimate</p>
      </div>

      <div className="p-5 space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-8">
            Tell us a bit about your business and recommendations will appear here.
          </div>
        ) : (
          // Sort items by logical project order so the foundation (website, pages)
          // shows FIRST, then features, then ongoing services. Prospects intuitively
          // expect "the site" to be the first line item — they find it confusing when
          // content/SEO extras stack above their actual website.
          [...items].sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category)).map((item) => (
            <div key={item.id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-800">
                    {item.name}
                    {item.quantity > 1 && item.quantityLabel && (
                      <span className="text-slate-400 font-normal">
                        {' '}× {item.quantity} {item.quantityLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{item.benefit}</div>
                  <div className="text-[10px] text-[var(--teal)] mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {item.aiBadge}
                  </div>
                </div>
                <div className="text-right">
                  {item.locked ? (
                    <Lock className="w-4 h-4 text-slate-300" />
                  ) : (
                    <div className="text-sm font-semibold text-slate-800">
                      {item.oneTimeLow || item.oneTimeHigh
                        ? formatRange(item.oneTimeLow, item.oneTimeHigh)
                        : item.monthlyLow || item.monthlyHigh
                          ? `${formatRange(item.monthlyLow, item.monthlyHigh)}/mo`
                          : item.isFree
                            ? 'Free'
                            : '—'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Soft-save card — appears when AI sensed hesitation. Non-blocking.
          Respectful off-ramp: bookmark this link, or email it to yourself. */}
      {softSaveOffered && session && (
        <div className="px-5 pb-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
            <div className="font-semibold text-amber-900 mb-1">Your plan is saved</div>
            <div className="text-amber-800 mb-2">
              Scan with your phone to bookmark, or use the options below.
            </div>
            <div className="flex gap-3 items-start">
              <SoftSaveQr shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/quote/s/${session.share_token}`} />
              <div className="flex-1 flex flex-wrap gap-2 content-start">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/quote/s/${session.share_token}`
                    navigator.clipboard.writeText(url).catch(() => {
                      window.prompt('Copy this URL:', url)
                    })
                  }}
                  className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded px-2 py-1 text-[11px] font-medium"
                >
                  📋 Copy link
                </button>
                <button
                  onClick={onEmailPlanOpen}
                  className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded px-2 py-1 text-[11px] font-medium"
                >
                  ✉️ Email it to me
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone gate CTA — shown when ANY item is staged but not verified.
          Voluntary unlock: prospect clicks when they want to see prices.
          Pulses when the AI signals they've built enough scope to be receptive.
          "Email me the plan" is a secondary, lower-commitment path for prospects
          who won't verify phone — captures email, team delivers the plan within 24-48h. */}
      {items.length >= 1 && !verified && (
        <div className="px-5 pb-4 space-y-2">
          <button
            onClick={onPhoneGateOpen}
            className={`w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition ${nudge ? 'ring-4 ring-[var(--teal)]/40 animate-pulse' : ''}`}
          >
            <Phone className="w-4 h-4" />
            Unlock Budgetary Prices
          </button>
          {items.length >= 2 && (
            <button
              onClick={onEmailPlanOpen}
              className="w-full border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2"
            >
              ✉️ Email me the plan instead
            </button>
          )}
          <p className="text-[10px] text-slate-400 text-center">
            Quick cell verification. No spam, magic link for easy return.
          </p>
        </div>
      )}

      {/* Totals */}
      {verified && prices?.totals && (
        <div className="border-t border-slate-100 p-5 space-y-3">
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => onPaymentModeChange('upfront')}
              className={`flex-1 py-1.5 rounded-md ${paymentMode === 'upfront' ? 'bg-[var(--teal)] text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Upfront
            </button>
            <button
              onClick={() => onPaymentModeChange('monthly')}
              className={`flex-1 py-1.5 rounded-md ${paymentMode === 'monthly' ? 'bg-[var(--teal)] text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Monthly
            </button>
            {prices.milestone_plan?.eligible && (
              <button
                onClick={() => onPaymentModeChange('milestone')}
                className={`flex-1 py-1.5 rounded-md ${paymentMode === 'milestone' ? 'bg-[var(--teal)] text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Milestones
              </button>
            )}
          </div>

          {paymentMode === 'upfront' && (
            <div>
              {/*
                Under 70% detail we show a midpoint with "starting around" framing
                so the prospect doesn't see a scary high-end number. As they share
                more specifics (service count, page count, integrations), narrowing
                factors tighten the range and the full spread reveals above 70%.
              */}
              {prices.totals.accuracy_pct < 70 ? (
                <>
                  <div className="text-xs text-slate-500">Starting around</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCents(Math.round((prices.totals.upfront_low + prices.totals.upfront_high) / 2))}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Tightens as we learn more about your scope
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-slate-500">Build total</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatRange(prices.totals.upfront_low, prices.totals.upfront_high)}
                  </div>
                </>
              )}
              {prices.totals.monthly_high > 0 && (
                <div className="text-xs text-slate-600 mt-1">
                  + {formatRange(prices.totals.monthly_low, prices.totals.monthly_high)}/mo ongoing
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Timeline: {prices.totals.timeline_weeks_low}-{prices.totals.timeline_weeks_high} weeks
              </div>
            </div>
          )}

          {paymentMode === 'monthly' && prices.monthly_plan && (
            <div>
              <div className="text-xs text-slate-500">12-month plan</div>
              <div className="text-2xl font-bold text-slate-900">
                {formatRange(prices.monthly_plan.monthlyPaymentLow, prices.monthly_plan.monthlyPaymentHigh)}/mo
              </div>
              <div className="text-xs text-slate-600 mt-1">
                + {formatRange(prices.monthly_plan.depositLow, prices.monthly_plan.depositHigh)} deposit at kickoff
              </div>
              <div className="text-[10px] text-slate-500 mt-2">
                Upfront saves you ~{formatRange(prices.monthly_plan.savingsLow, prices.monthly_plan.savingsHigh)}
              </div>
            </div>
          )}

          {paymentMode === 'milestone' && prices.milestone_plan?.eligible && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500">4 milestone payments</div>
              {prices.milestone_plan.milestones.map((m) => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-slate-700">{m.label}</span>
                  <span className="font-medium text-slate-900">{formatRange(m.low, m.high)}</span>
                </div>
              ))}
              <div className="text-[10px] text-slate-500 pt-1">Each milestone is individually satisfaction-guaranteed.</div>
            </div>
          )}

          {/* ROI context */}
          {prices.roi && prices.roi.display !== 'none' && (
            <div className="bg-emerald-50 rounded-lg p-3 text-xs">
              <div className="font-semibold text-emerald-900 mb-1">ROI Context</div>
              <div className="text-emerald-800">
                Recoverable at ~{prices.roi.captureRatePct}% capture: ~{formatCents(prices.roi.recoverableMonthlyCents)}/mo
                {prices.roi.display === 'full' && prices.roi.paybackMonths && (
                  <> · Payback ~{prices.roi.paybackMonths.toFixed(1)} mo</>
                )}
              </div>
              <div className="text-[10px] text-emerald-700 mt-1">
                (Stated loss: {formatCents(prices.roi.monthlyLostCents)}/mo — we project DSIG captures roughly a quarter of that in year one.)
              </div>
            </div>
          )}

          {/* Risk reversal */}
          <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-3">
            Every project starts with a free research report. First milestone satisfaction-guaranteed.
          </div>

          {/* Retainer selection — shown after scope is priced, before terminal CTAs */}
          {!retainerComplete && (
            <RetainerStep
              sessionToken={sessionToken}
              onContinue={onRetainerComplete}
            />
          )}

          {/* CTAs — shown after retainer step is complete.
              When the AI has booked a real meeting, replace the CTAs
              with a MeetingConfirmedPanel showing time + meet link. */}
          {retainerComplete && (
            session?.booking_id && session?.booking_start_at ? (
              <div className="pt-2">
                <MeetingConfirmedPanel
                  startAt={session.booking_start_at}
                  meetLink={session.booking_meet_link ?? null}
                  attendeeEmail={session.attendee_email ?? null}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3yjIRXePILfG3aDwDq7N_ZdQIEOxi0HioY6NFF1vzE7PfH-xYXGVOW95ZNJ0BZj5d4-uUVJNPK?gv=true"
                  target="_blank"
                  rel="noopener"
                  className="col-span-2 bg-[var(--teal)] text-white rounded-lg py-2.5 text-sm font-semibold text-center"
                >
                  Book a Strategy Call
                </a>
                <button
                  onClick={() => alert('Research CTA coming soon')}
                  className="col-span-2 border border-slate-200 text-slate-700 rounded-lg py-2 text-sm font-medium"
                >
                  Start With a Free Research Report
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Always-visible alt contact — prospects who don't want to verify still have paths */}
      <div className="px-5 pb-4 border-t border-slate-100 pt-3 space-y-2">
        <div className="flex flex-wrap gap-3 justify-center text-xs">
          <a
            href="sms:+19165422423"
            className="text-slate-600 hover:text-[var(--teal)] flex items-center gap-1"
          >
            💬 Text (916) 542-2423
          </a>
          <a
            href="mailto:DemandSignals@gmail.com"
            className="text-slate-600 hover:text-[var(--teal)] flex items-center gap-1"
          >
            ✉️ Email us
          </a>
        </div>
        <div className="text-[10px] text-slate-400 text-center">
          Budgetary estimate — not a binding quote.
        </div>
      </div>
    </aside>
  )
}

// ============================================================
// Phone verification modal
// ============================================================
function PhoneVerifyCard({
  sessionToken,
  onClose,
  onVerified,
}: {
  sessionToken: string
  onClose: () => void
  onVerified: (lastFour: string) => void
}) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    if (!consent) {
      setError('Please confirm consent to receive SMS.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/sms/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({ phone, tcpa_consent: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not send code.')
        return
      }
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCheck() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/sms/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Verification failed.')
        return
      }
      if (!data.approved) {
        setError(data.error ?? "That code didn't match.")
        return
      }
      onVerified(data.phone_last_four ?? phone.slice(-4))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Phone verification"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-slate-900">Unlock Your Estimate</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'phone' ? (
          <>
            <p className="text-sm text-slate-600 mb-4">
              Enter your cell to unlock pricing and receive a magic link to return anytime.
            </p>
            <label className="block text-sm mb-1 text-slate-700">Cell phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(916) 555-1234"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              autoFocus
            />
            <label className="flex items-start gap-2 text-xs text-slate-600 mb-3">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I agree to receive SMS about my estimate from Demand Signals. Reply STOP to opt out, HELP for help.
                Msg &amp; data rates may apply.
              </span>
            </label>
            {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
            <button
              onClick={handleSend}
              disabled={busy || !phone || !consent}
              className="w-full bg-[var(--teal)] text-white rounded-lg py-2.5 font-semibold disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send Code'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-4">
              Enter the 6-digit code sent to {phone}.
            </p>
            <label className="block text-sm mb-1 text-slate-700">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="123456"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-lg tracking-widest text-center mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
              autoFocus
            />
            {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
            <button
              onClick={handleCheck}
              disabled={busy || code.length < 4}
              className="w-full bg-[var(--teal)] text-white rounded-lg py-2.5 font-semibold disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <button
              onClick={() => setStep('phone')}
              className="w-full mt-2 text-xs text-slate-500 underline"
            >
              Wrong number?
            </button>
          </>
        )}

        <div className="text-[10px] text-slate-400 mt-4 text-center">
          Budgetary estimate — not a binding quote.
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Email-me-plan modal — lower-commitment alternative to phone verify.
// Prospect enters email; team follows up within 24-48h.
// Does NOT unlock pricing in the UI (phone verify still required for that).
// ============================================================
function EmailPlanCard({
  sessionToken,
  onClose,
  onSent,
}: {
  sessionToken: string
  onClose: () => void
  onSent: () => void
}) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/quote/email-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not save your email. Please try again.')
        return
      }
      onSent()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Email the plan"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-slate-900">Send Me The Plan</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Drop your email and we&apos;ll send over your full plan within a day. No phone required.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm mb-1 text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            autoFocus
            required
          />
          {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="w-full bg-[var(--teal)] text-white rounded-lg py-2.5 font-semibold disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send It'}
          </button>
        </form>
        <div className="text-[10px] text-slate-400 mt-4 text-center">
          Budgetary estimate — not a binding quote.
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Small QR code for the soft-save card. Renders on a canvas client-side.
// Uses the `qrcode` library, which tree-shakes to ~20KB.
// ============================================================
function SoftSaveQr({ shareUrl }: { shareUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!canvasRef.current || !shareUrl) return
    // Dynamic import keeps this out of the initial bundle
    import('qrcode').then((QR) => {
      if (canvasRef.current) {
        QR.toCanvas(canvasRef.current, shareUrl, {
          width: 96,
          margin: 1,
          color: { dark: '#92400e', light: '#fffbeb' }, // amber-900 on amber-50
          errorCorrectionLevel: 'M',
        }).catch(() => {
          // Silent fallback — prospects still have Copy link + Email buttons.
        })
      }
    }).catch(() => {
      // Silent fallback
    })
  }, [shareUrl])
  return (
    <canvas
      ref={canvasRef}
      width={96}
      height={96}
      className="rounded border border-amber-200"
      aria-label="QR code to your saved plan — scan to open on your phone"
    />
  )
}
