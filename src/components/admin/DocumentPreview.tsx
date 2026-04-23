'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  src: string  // URL to the preview endpoint
  title: string
}

export default function DocumentPreview({ src, title }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(src)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.text()
      })
      .then(setHtml)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [src])

  if (error) return <div className="text-sm text-red-600">Preview error: {error}</div>
  if (!html) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>

  return (
    <iframe
      title={title}
      srcDoc={html}
      className="w-full border border-slate-200 rounded-xl bg-white"
      style={{ height: '90vh' }}
    />
  )
}
