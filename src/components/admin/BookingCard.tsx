'use client'

import { useState } from 'react'
import { CheckCircle2, ExternalLink, Calendar, Loader2 } from 'lucide-react'
import { RescheduleModal } from './RescheduleModal'

interface Booking {
  id: string
  start_at: string
  end_at: string
  attendee_email: string
  attendee_phone: string | null
  google_meet_link: string | null
  status: string
}

interface Props {
  booking: Booking
  onChange: () => void
}

function formatPt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'America/Los_Angeles',
  }) + ' PT'
}

export function BookingCard({ booking, onChange }: Props) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function cancel() {
    if (!confirm('Cancel this booking? An email will be sent to the prospect.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin cancelled' }),
      })
      if (res.ok) onChange()
      else alert((await res.json()).error ?? 'Cancel failed')
    } finally { setBusy(false) }
  }

  return (
    <>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-emerald-900 font-bold">Meeting booked</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-200 rounded-full text-emerald-900 font-mono">
                {booking.status}
              </span>
            </div>
            <p className="text-emerald-900 text-sm mt-1">{formatPt(booking.start_at)}</p>
            <p className="text-emerald-700 text-xs mt-1">
              {booking.attendee_email}
              {booking.attendee_phone && ` · ${booking.attendee_phone}`}
            </p>
            {booking.google_meet_link && (
              <a
                href={booking.google_meet_link}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                {booking.google_meet_link.replace('https://', '')}
              </a>
            )}
          </div>
          {booking.status === 'confirmed' && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setRescheduleOpen(true)}
                disabled={busy}
                className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-md text-xs font-medium disabled:opacity-50"
              >
                <Calendar className="w-3 h-3 inline mr-1" />
                Reschedule
              </button>
              <button
                onClick={cancel}
                disabled={busy}
                className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-900 rounded-md text-xs font-medium disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancel'}
              </button>
            </div>
          )}
        </div>
      </div>
      {rescheduleOpen && (
        <RescheduleModal
          bookingId={booking.id}
          onClose={() => setRescheduleOpen(false)}
          onRescheduled={() => { setRescheduleOpen(false); onChange() }}
        />
      )}
    </>
  )
}
