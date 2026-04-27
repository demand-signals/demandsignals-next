'use client'

// ── ConvertButton ───────────────────────────────────────────────────
// Status-aware Link to /admin/sow/[id]/convert. Replaces the previous
// modal trigger — the modal version was unmounting on every keystroke
// because the parent SOW page re-rendered. A dedicated route fixes both
// the closing and the broken number-input UX.

import Link from 'next/link'

interface SowSummaryLite {
  id: string
  status: string
}

const labelByStatus: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Convert SOW to Project',   color: '#FF6B2B' },
  sent:     { label: 'Convert SOW to Project',   color: '#FF6B2B' },
  viewed:   { label: 'Convert SOW to Project',   color: '#FF6B2B' },
  accepted: { label: 'Re-run Project Setup',     color: '#68c5ad' },
  declined: { label: 'Force Convert (override)', color: '#dc2626' },
  void:     { label: 'Force Convert (override)', color: '#dc2626' },
}

export function ConvertButton({ sow }: { sow: SowSummaryLite }) {
  const meta = labelByStatus[sow.status] ?? labelByStatus.draft

  function handleClick(e: React.MouseEvent) {
    if (sow.status === 'declined' || sow.status === 'void') {
      if (!confirm(`SOW status is ${sow.status}. Are you sure you want to force-convert?`)) {
        e.preventDefault()
      }
    }
  }

  return (
    <Link
      href={`/admin/sow/${sow.id}/convert`}
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
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {meta.label}
    </Link>
  )
}
