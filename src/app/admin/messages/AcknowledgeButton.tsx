'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  notificationId: string
}

export function AcknowledgeButton({ notificationId }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleAck() {
    setBusy(true)
    const res = await fetch(`/api/admin/messages/${notificationId}/acknowledge`, {
      method: 'POST',
    })
    setBusy(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Failed: ${data.error ?? res.statusText}`)
      return
    }
    router.refresh()
  }

  return (
    <button
      onClick={handleAck}
      disabled={busy}
      style={{
        padding: '6px 14px',
        background: '#16a34a',
        color: '#fff',
        border: 0,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {busy ? '…' : '✓ Ack'}
    </button>
  )
}
