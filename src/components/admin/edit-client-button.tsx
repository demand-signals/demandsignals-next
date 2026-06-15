'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil } from 'lucide-react'
import { ProspectEditModal } from './prospect-edit-modal'
import type { Prospect, Demo, Deal } from '@/types/database'

type FullProspect = Prospect & { demos?: Demo[]; deals?: Deal[] }

export function EditClientButton({ prospectId }: { prospectId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FullProspect | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function open() {
    setErr(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/full`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `Failed to load (${res.status})`)
      }
      const j = await res.json()
      setData({ ...j.prospect, demos: j.demos, deals: j.deals })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  function close() {
    setData(null)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600 disabled:opacity-50"
      >
        {loading
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Pencil className="w-3 h-3" />}
        Edit details
      </button>
      {err && <span className="text-xs text-red-500 ml-2">{err}</span>}
      {data && <ProspectEditModal prospect={data} onClose={close} />}
    </>
  )
}
