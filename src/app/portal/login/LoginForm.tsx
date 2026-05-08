'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setErr('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/login/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      // Always 200 from server (no enumeration). Just navigate.
      if (!res.ok) {
        setErr('Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      router.push(`/portal/login/sent?email=${encodeURIComponent(trimmed)}`)
    } catch {
      setErr('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
          Email
        </span>
        <input
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
      </label>
      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {err}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--teal)] text-white text-sm font-semibold hover:bg-[var(--teal-dark)] disabled:opacity-60"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Send sign-in link
      </button>
    </form>
  )
}
