'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const BOOKING_URL = 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3yjIRXePILfG3aDwDq7N_ZdQIEOxi0HioY6NFF1vzE7PfH-xYXGVOW95ZNJ0BZj5d4-uUVJNPK?gv=true'
const DSIG_PHONE = '(916) 542-2423'
const DSIG_PHONE_TEL = '+19165422423'

export function ShareActions({
  shareToken,
  businessName,
  phoneVerified,
}: {
  shareToken: string
  businessName: string
  phoneVerified: boolean
}) {
  const router = useRouter()
  const [resuming, setResuming] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [emailMode, setEmailMode] = useState(false)
  const [email, setEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  async function handleResume() {
    setResuming(true)
    setResumeError(null)
    try {
      const res = await fetch('/api/quote/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: shareToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResumeError(data.error ?? 'Could not resume the conversation.')
        setResuming(false)
        return
      }
      // Stash the new session token in sessionStorage so /quote picks it up
      // instead of creating a brand-new blank session.
      if (data.session_token) {
        sessionStorage.setItem('dsig_quote_session_token', data.session_token)
      }
      router.push('/quote?resumed=1')
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : 'Network error.')
      setResuming(false)
    }
  }

  async function handleEmailSend() {
    if (!email.trim()) return
    setEmailBusy(true)
    setEmailError(null)
    try {
      // The email-plan endpoint needs a live session_token, but share-page
      // visitors don't have one. Easiest path: resume the session first,
      // THEN hit email-plan with the new session_token. Hidden from user.
      const resumeRes = await fetch('/api/quote/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: shareToken }),
      })
      const resumeData = await resumeRes.json()
      if (!resumeRes.ok || !resumeData.session_token) {
        setEmailError(resumeData.error ?? 'Could not save your email.')
        setEmailBusy(false)
        return
      }
      const sendRes = await fetch('/api/quote/email-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': resumeData.session_token,
        },
        body: JSON.stringify({ email: email.trim() }),
      })
      const sendData = await sendRes.json()
      if (!sendRes.ok) {
        setEmailError(sendData.error ?? 'Could not save your email.')
        setEmailBusy(false)
        return
      }
      setEmailSent(true)
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : 'Network error.')
    } finally {
      setEmailBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Primary: Book a strategy call (orange) */}
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener"
          className="rounded-xl py-4 px-5 font-semibold text-center text-white transition-opacity hover:opacity-90"
          style={{ background: '#FF6B2B' }}
        >
          Book a strategy call
          <div className="text-xs font-normal opacity-90 mt-0.5">
            30 mins with Hunter — no pressure
          </div>
        </a>

        {/* Secondary: Resume the conversation (teal) */}
        <button
          onClick={handleResume}
          disabled={resuming}
          className="rounded-xl py-4 px-5 font-semibold text-center text-white disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: 'var(--teal, #68c5ad)' }}
        >
          {resuming ? 'Loading…' : 'Resume this conversation'}
          <div className="text-xs font-normal opacity-90 mt-0.5">
            Pick up where you left off — your plan carries over
          </div>
        </button>

        {/* Tertiary: Text */}
        <a
          href={`sms:${DSIG_PHONE_TEL}?body=${encodeURIComponent(`Hey — it's ${businessName}. Just saw my estimate. Can we talk?`)}`}
          className="border border-slate-300 hover:border-[var(--teal)] hover:text-[var(--teal)] text-slate-700 rounded-xl py-4 px-5 font-semibold text-center transition-colors"
        >
          Text us
          <div className="text-xs font-normal text-slate-500 mt-0.5">
            {DSIG_PHONE}
          </div>
        </a>

        {/* Tertiary: Email the plan */}
        <button
          onClick={() => setEmailMode((v) => !v)}
          disabled={emailSent}
          className="border border-slate-300 hover:border-[var(--teal)] hover:text-[var(--teal)] disabled:opacity-70 text-slate-700 rounded-xl py-4 px-5 font-semibold text-center transition-colors"
        >
          {emailSent ? 'Plan sent to your email' : 'Email me the full plan'}
          {!emailSent && (
            <div className="text-xs font-normal text-slate-500 mt-0.5">
              Pricing, scope, timeline
            </div>
          )}
        </button>
      </div>

      {emailMode && !emailSent && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@work-email.com"
            className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            autoFocus
          />
          <button
            onClick={handleEmailSend}
            disabled={!email.trim() || emailBusy}
            className="bg-[var(--teal)] hover:bg-[var(--teal-dark)] disabled:opacity-50 text-white rounded-md px-4 text-sm font-semibold"
          >
            {emailBusy ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}

      {emailError && <div className="text-xs text-red-600">{emailError}</div>}
      {resumeError && <div className="text-xs text-red-600">{resumeError}</div>}

      {!phoneVerified && (
        <p className="text-xs text-center pt-2" style={{ color: '#94a0b8' }}>
          Full pricing unlocks when you verify your phone in the live conversation.
        </p>
      )}
    </div>
  )
}
