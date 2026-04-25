'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConvertModal, type SowSummary } from './ConvertModal'

const labelByStatus: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Convert SOW to Project',   color: '#FF6B2B' },
  sent:     { label: 'Convert SOW to Project',   color: '#FF6B2B' },
  viewed:   { label: 'Convert SOW to Project',   color: '#FF6B2B' },
  accepted: { label: 'Re-run Project Setup',     color: '#68c5ad' },
  declined: { label: 'Force Convert (override)', color: '#dc2626' },
  void:     { label: 'Force Convert (override)', color: '#dc2626' },
}

export function ConvertButton({ sow }: { sow: SowSummary }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const meta = labelByStatus[sow.status] ?? labelByStatus.draft

  function handleClick() {
    if (sow.status === 'declined' || sow.status === 'void') {
      if (!confirm(`SOW status is ${sow.status}. Are you sure you want to force-convert?`)) return
    }
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={handleClick}
        style={{
          padding: '8px 16px',
          background: meta.color,
          color: '#fff',
          border: 0,
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {meta.label}
      </button>
      {open && (
        <ConvertModal
          sow={sow}
          onClose={() => setOpen(false)}
          onConverted={(result) => {
            setOpen(false)
            const invoiceList = result.installments
              .filter((i) => i.invoice_number)
              .map((i) => i.invoice_number)
              .join(', ')
            const subList = result.subscriptions
              .map((s) => `${s.id.slice(0, 8)} (${s.status})`)
              .join(', ')
            alert(
              `Project created: ${result.project_id}\n` +
                `Invoices: ${invoiceList || '(none yet)'}\n` +
                `Subscriptions: ${subList || '(none)'}\n` +
                `TIK ledger: ${result.trade_credit_id ? 'opened' : '(none)'}\n\n` +
                `Reloading…`,
            )
            router.refresh()
          }}
        />
      )}
    </>
  )
}
