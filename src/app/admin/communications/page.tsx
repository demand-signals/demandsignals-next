'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, MessageSquare, Mail, Send, Inbox, AlertCircle, CheckCircle2, MousePointerClick, Eye } from 'lucide-react'

interface TimelineItem {
  id: string
  channel: 'email' | 'sms' | 'inquiry'
  direction: 'inbound' | 'outbound'
  occurred_at: string
  prospect_id: string | null
  prospect_name: string | null
  subject: string | null
  body_preview: string | null
  status: string | null
  meta: Record<string, any>
}

const STATUS_COLOR: Record<string, string> = {
  sent: 'bg-slate-100 text-slate-600',
  delivered: 'bg-blue-100 text-blue-700',
  opened: 'bg-emerald-100 text-emerald-700',
  clicked: 'bg-purple-100 text-purple-700',
  bounced: 'bg-red-100 text-red-700',
  complained: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  received: 'bg-teal-100 text-teal-700',
  delivery_delayed: 'bg-amber-100 text-amber-700',
  page_visit: 'bg-indigo-100 text-indigo-700',
}

function statusIcon(status: string | null) {
  switch (status) {
    case 'opened': return <Eye className="w-3 h-3" />
    case 'clicked': return <MousePointerClick className="w-3 h-3" />
    case 'delivered': return <CheckCircle2 className="w-3 h-3" />
    case 'bounced':
    case 'complained':
    case 'failed': return <AlertCircle className="w-3 h-3" />
    default: return null
  }
}

function ChannelIcon({ channel, direction }: { channel: TimelineItem['channel']; direction: TimelineItem['direction'] }) {
  const Icon = channel === 'email' ? Mail : channel === 'sms' ? Send : Inbox
  const color = direction === 'inbound' ? 'text-teal-500' : channel === 'sms' ? 'text-purple-500' : 'text-blue-500'
  return <Icon className={`w-4 h-4 ${color} shrink-0`} />
}

export default function CommunicationsPage() {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'sms' | 'inquiry'>('all')

  useEffect(() => {
    fetch('/api/admin/communications')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = channelFilter === 'all' ? items : items.filter((i) => i.channel === channelFilter)

  const counts = {
    all: items.length,
    email: items.filter((i) => i.channel === 'email').length,
    sms: items.filter((i) => i.channel === 'sms').length,
    inquiry: items.filter((i) => i.channel === 'inquiry').length,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[var(--teal)]" />
          Communications
        </h1>
      </div>

      {/* Channel filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'email', 'sms', 'inquiry'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setChannelFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              channelFilter === c
                ? 'bg-[var(--teal)] text-white border-[var(--teal)]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c === 'all' ? 'All channels' : c.charAt(0).toUpperCase() + c.slice(1)} ·{' '}
            <span className="tabular-nums">{counts[c]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      ) : filtered.length === 0 ? (
        <div className="text-center p-16 text-slate-400">
          No {channelFilter === 'all' ? 'communications' : channelFilter + ' activity'} yet.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <li key={item.id} className="px-4 py-3 hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <ChannelIcon channel={item.channel} direction={item.direction} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {item.subject ?? '(no subject)'}
                      </span>
                      {item.status && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${
                            STATUS_COLOR[item.status] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {statusIcon(item.status)}
                          {item.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {item.body_preview && (
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{item.body_preview}</div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{new Date(item.occurred_at).toLocaleString()}</span>
                      {item.prospect_name && item.prospect_id && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/admin/prospects/${item.prospect_id}`}
                            className="text-teal-600 hover:underline"
                          >
                            {item.prospect_name}
                          </Link>
                        </>
                      )}
                      {item.meta.invoice_id && (
                        <>
                          <span>·</span>
                          <Link href={`/admin/invoices/${item.meta.invoice_id}`} className="text-teal-600 hover:underline">
                            Invoice
                          </Link>
                        </>
                      )}
                      {item.meta.sow_document_id && (
                        <>
                          <span>·</span>
                          <Link href={`/admin/sow/${item.meta.sow_document_id}`} className="text-teal-600 hover:underline">
                            SOW
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
