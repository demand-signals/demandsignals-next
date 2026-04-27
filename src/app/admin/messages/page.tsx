// ── /admin/messages ─────────────────────────────────────────────────
// System Messages (Command Center). Surfaces the system_notifications
// table — every subsystem failure, fallback event, bounce/complaint, and
// any other operational signal the admin should know about.
//
// Per spec deferred-to-#1.5: this is the minimal Project #1.5 add-on UI.
// Full per-prospect / per-document timeline UI lands in Project #2 or #3.

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AcknowledgeButton } from './AcknowledgeButton'

type SeverityFilter = 'all' | 'unread' | 'critical' | 'error' | 'warning' | 'info'

interface SystemNotification {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  source: string
  title: string
  body: string | null
  context: Record<string, unknown>
  acknowledged_at: string | null
  acknowledged_by: string | null
  emailed_at: string | null
  created_at: string
}

const SEVERITY_STYLES: Record<SystemNotification['severity'], { bg: string; color: string; icon: string }> = {
  info:     { bg: '#dbeafe', color: '#1e40af', icon: 'ℹ' },
  warning:  { bg: '#fef3c7', color: '#92400e', icon: '⚠' },
  error:    { bg: '#fee2e2', color: '#991b1b', icon: '✕' },
  critical: { bg: '#fecaca', color: '#7f1d1d', icon: '🚨' },
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default async function SystemMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: rawFilter } = await searchParams
  const filter: SeverityFilter = ['all', 'unread', 'critical', 'error', 'warning', 'info'].includes(
    rawFilter ?? '',
  )
    ? (rawFilter as SeverityFilter)
    : 'unread'

  // Build query based on filter
  let query = supabaseAdmin
    .from('system_notifications')
    .select('id, severity, source, title, body, context, acknowledged_at, acknowledged_by, emailed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (filter === 'unread') {
    query = query.is('acknowledged_at', null)
  } else if (filter !== 'all') {
    query = query.eq('severity', filter)
  }

  const { data: notifications, error } = await query

  // Also fetch unread counts per severity for the filter pill badges
  const { data: severityCounts } = await supabaseAdmin
    .from('system_notifications')
    .select('severity')
    .is('acknowledged_at', null)

  const counts: Record<string, number> = { all: 0, unread: 0, info: 0, warning: 0, error: 0, critical: 0 }
  for (const row of (severityCounts ?? []) as Array<{ severity: SystemNotification['severity'] }>) {
    counts.unread = (counts.unread ?? 0) + 1
    counts[row.severity] = (counts[row.severity] ?? 0) + 1
  }

  const list = (notifications ?? []) as SystemNotification[]

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>System Messages</h1>
        <p style={{ color: '#5d6780', fontSize: 14 }}>
          Subsystem failures, fallback events, bounces, complaints, and other operational signals.
        </p>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(
          [
            { key: 'unread', label: 'Unread' },
            { key: 'all', label: 'All' },
            { key: 'critical', label: 'Critical' },
            { key: 'error', label: 'Error' },
            { key: 'warning', label: 'Warning' },
            { key: 'info', label: 'Info' },
          ] as const
        ).map((opt) => {
          const active = filter === opt.key
          const count = counts[opt.key as keyof typeof counts]
          return (
            <Link
              key={opt.key}
              href={`/admin/messages?filter=${opt.key}`}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: active ? '#1d2330' : '#f4f6f9',
                color: active ? '#fff' : '#5d6780',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid ' + (active ? '#1d2330' : '#e2e8f0'),
              }}
            >
              {opt.label}
              {opt.key !== 'all' && count > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    padding: '0 6px',
                    background: active ? 'rgba(255,255,255,0.2)' : '#fff',
                    borderRadius: 999,
                    fontSize: 11,
                  }}
                >
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {error && (
        <div style={{ padding: 16, background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 16 }}>
          Failed to load notifications: {error.message}
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#f4f6f9', borderRadius: 8, color: '#5d6780' }}>
          No notifications match this filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((n) => {
            const sev = SEVERITY_STYLES[n.severity]
            const isAck = !!n.acknowledged_at
            return (
              <div
                key={n.id}
                style={{
                  padding: 16,
                  border: '1px solid ' + (isAck ? '#e2e8f0' : sev.color + '33'),
                  borderLeft: '4px solid ' + sev.color,
                  borderRadius: 8,
                  background: isAck ? '#fafbfc' : '#fff',
                  opacity: isAck ? 0.65 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: sev.bg,
                          color: sev.color,
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {sev.icon} {n.severity}
                      </span>
                      <span style={{ fontSize: 12, color: '#5d6780', fontWeight: 600 }}>{n.source}</span>
                      <span style={{ fontSize: 12, color: '#94a0b8' }}>·</span>
                      <span style={{ fontSize: 12, color: '#94a0b8' }}>{fmtDateTime(n.created_at)}</span>
                      {n.emailed_at && (
                        <>
                          <span style={{ fontSize: 12, color: '#94a0b8' }}>·</span>
                          <span style={{ fontSize: 11, color: '#5d6780' }} title={`Email alert sent ${fmtDateTime(n.emailed_at)}`}>
                            ✉ alerted
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1d2330', marginBottom: 4 }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <pre
                        style={{
                          fontSize: 12,
                          color: '#5d6780',
                          background: '#f4f6f9',
                          padding: 8,
                          borderRadius: 4,
                          margin: '4px 0 8px',
                          maxHeight: 120,
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {n.body}
                      </pre>
                    )}
                    {Object.keys(n.context).length > 0 && (
                      <details style={{ fontSize: 11, color: '#5d6780' }}>
                        <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Context</summary>
                        <pre style={{ background: '#f4f6f9', padding: 8, borderRadius: 4, marginTop: 4, overflow: 'auto' }}>
                          {JSON.stringify(n.context, null, 2)}
                        </pre>
                      </details>
                    )}
                    {isAck && (
                      <div style={{ fontSize: 11, color: '#94a0b8', marginTop: 4 }}>
                        ✓ Acknowledged {fmtDateTime(n.acknowledged_at!)}
                      </div>
                    )}
                  </div>
                  {!isAck && <AcknowledgeButton notificationId={n.id} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a0b8' }}>
        Showing newest 200. Older notifications remain in DB.
      </div>
    </div>
  )
}
