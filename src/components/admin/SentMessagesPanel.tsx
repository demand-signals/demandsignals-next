'use client'

// ── SentMessagesPanel ────────────────────────────────────────────────
// Collapsible log of outbound messages (email + SMS) sent to a
// prospect/client, with the actual content + link that was sent. Reads
// the activities feed (outbound sends log Recipient / Message / Link in body).

import { useEffect, useState } from 'react'
import { Mail, MessageSquare, ExternalLink, Loader2, ChevronDown, Check, X } from 'lucide-react'

interface ActivityRow {
  id: string
  type: string
  channel: string | null
  direction: string | null
  subject: string | null
  body: string | null
  status: string | null
  created_at: string
}

interface ParsedMsg {
  id: string
  channel: 'email' | 'sms' | 'other'
  subject: string
  recipient: string
  content: string
  link: string
  status: string
  at: string
}

function parse(a: ActivityRow): ParsedMsg {
  const body = a.body ?? ''
  const grab = (label: string) => {
    const m = body.match(new RegExp(`${label}:\\s*(.+)`))
    return m ? m[1].trim() : ''
  }
  const channel = a.channel === 'email' ? 'email' : a.channel === 'sms' ? 'sms' : 'other'
  return {
    id: a.id,
    channel,
    subject: a.subject ?? a.type,
    recipient: grab('Recipient'),
    content: grab('Message') || grab('Subject'),
    link: grab('Link'),
    status: a.status ?? '',
    at: a.created_at,
  }
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function SentMessagesPanel({ prospectId }: { prospectId: string }) {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/activities?prospect_id=${prospectId}`)
      .then((r) => r.json())
      .then((d) => setRows((d.data ?? d.activities ?? []) as ActivityRow[]))
      .finally(() => setLoading(false))
  }, [prospectId])

  // Outbound email/SMS sends only.
  const sends = rows
    .filter((a) => (a.direction === 'outbound' || !a.direction) && (a.channel === 'email' || a.channel === 'sms'))
    .map(parse)

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sent Messages {!loading && sends.length > 0 && <span className="text-slate-400">({sends.length})</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </summary>

      <div className="px-4 pb-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
        ) : sends.length === 0 ? (
          <p className="text-sm text-slate-400">No messages sent yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sends.map((m) => (
              <div key={m.id} className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  {m.channel === 'email' ? <Mail className="h-4 w-4 text-blue-500" /> : <MessageSquare className="h-4 w-4 text-teal-500" />}
                  <span className="font-medium text-slate-800">{m.subject}</span>
                  {m.status === 'sent' ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600"><Check className="h-3 w-3" /> sent</span>
                  ) : m.status === 'failed' ? (
                    <span className="inline-flex items-center gap-0.5 text-xs text-red-600"><X className="h-3 w-3" /> failed</span>
                  ) : null}
                  <span className="ml-auto text-xs text-slate-400">{fmt(m.at)}</span>
                </div>
                <div className="mt-1 pl-6 text-xs text-slate-500 space-y-0.5">
                  {m.recipient && <div>To: {m.recipient}</div>}
                  {m.content && <div className="text-slate-600">{m.content}</div>}
                  {m.link && (
                    <a href={m.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-600 hover:underline break-all">
                      {m.link} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  )
}
