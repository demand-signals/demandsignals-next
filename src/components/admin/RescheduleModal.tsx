'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  bookingId: string
  onClose: () => void
  onRescheduled: () => void
}

interface Slot { id: string; display_label: string; start_at: string }

export function RescheduleModal({ bookingId, onClose, onRescheduled }: Props) {
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/bookings/available-slots?count=6')
        const data = await res.json()
        if (data.ok) setSlots(data.slots)
        else setErr(data.error ?? 'Failed to load slots')
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'failed')
      }
    })()
  }, [])

  async function pick(slot: Slot) {
    setBusy(slot.id); setErr(null)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot_id: slot.id }),
      })
      const data = await res.json()
      if (res.ok) onRescheduled()
      else setErr(data.error ?? 'Reschedule failed')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="font-bold text-lg mb-4">Reschedule meeting</h2>
        {!slots && !err && <Loader2 className="w-5 h-5 animate-spin" />}
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        {slots && (
          <div className="space-y-2">
            {slots.length === 0 && <p className="text-sm text-slate-500">No available slots in the next 14 days.</p>}
            {slots.map((s) => (
              <button
                key={s.id}
                onClick={() => pick(s)}
                disabled={busy !== null}
                className="w-full text-left p-3 border border-slate-200 hover:border-emerald-400 rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                {s.display_label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600">Cancel</button>
        </div>
      </div>
    </div>
  )
}
