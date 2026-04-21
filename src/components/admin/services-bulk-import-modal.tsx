'use client'

// ── Services Catalog Bulk Import Modal ──────────────────────────────
// Admin pastes CSV or JSON, we UPSERT into services_catalog. Shows
// per-row results after submission. No file upload — paste-only keeps
// the UI fast and the threat surface small.

import { useState } from 'react'
import { Loader2, Upload, Copy, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

type Format = 'csv' | 'json'

interface RowResult {
  index: number
  id: string | null
  status: 'inserted' | 'updated' | 'skipped' | 'error'
  error?: string
}

interface ImportResponse {
  total: number
  inserted: number
  updated: number
  errors: number
  results: RowResult[]
}

// Minimum columns required. Extras are accepted + passed through.
const CSV_HEADER_ORDER = [
  'id',
  'name',
  'category',
  'description',
  'pricing_type',
  'display_price_cents',
  'base_range_low_cents',
  'base_range_high_cents',
  'monthly_range_low_cents',
  'monthly_range_high_cents',
  'timeline_weeks_low',
  'timeline_weeks_high',
  'included_with_paid_project',
]

const CSV_EXAMPLE = `id,name,category,description,pricing_type,display_price_cents
local-seo-premium,Local SEO Premium,get-found,Enhanced local SEO with multi-city targeting,monthly,150000
podcast-production,Podcast Production,content-social,Full podcast production + editing + distribution,monthly,200000`

const JSON_EXAMPLE = `{
  "services": [
    {
      "id": "local-seo-premium",
      "name": "Local SEO Premium",
      "category": "get-found",
      "description": "Enhanced local SEO with multi-city targeting",
      "pricing_type": "monthly",
      "display_price_cents": 150000,
      "monthly_range_low_cents": 120000,
      "monthly_range_high_cents": 180000
    }
  ]
}`

export function BulkImportModal({ onClose }: { onClose: (imported: boolean) => void }) {
  const [format, setFormat] = useState<Format>('csv')
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  function parseCsv(text: string): Record<string, unknown>[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) throw new Error('CSV needs a header row + at least one data row')

    // Simple CSV parser — handles quoted fields with commas. Not RFC 4180
    // perfect but handles real-world spreadsheet paste cleanly.
    function parseLine(line: string): string[] {
      const out: string[] = []
      let cur = ''
      let inQuote = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"' && line[i + 1] === '"') {
          cur += '"'
          i++
          continue
        }
        if (c === '"') {
          inQuote = !inQuote
          continue
        }
        if (c === ',' && !inQuote) {
          out.push(cur)
          cur = ''
          continue
        }
        cur += c
      }
      out.push(cur)
      return out
    }

    const headers = parseLine(lines[0]).map((h) => h.trim())
    const rows: Record<string, unknown>[] = []
    for (let i = 1; i < lines.length; i++) {
      const cells = parseLine(lines[i])
      const row: Record<string, unknown> = {}
      headers.forEach((h, idx) => {
        let val: unknown = cells[idx]?.trim() ?? ''
        // Number coercion for known numeric columns.
        if (
          /_cents$|_low$|_high$|timeline_weeks_(low|high)|sort_order/.test(h) &&
          typeof val === 'string' &&
          val.length > 0
        ) {
          const n = parseInt(val, 10)
          if (!isNaN(n)) val = n
        }
        // Boolean coercion.
        if (h === 'included_with_paid_project' || h === 'active') {
          val = String(val).toLowerCase() === 'true'
        }
        if (val === '' || val === undefined) val = null
        row[h] = val
      })
      rows.push(row)
    }
    return rows
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      let services: Record<string, unknown>[]
      if (format === 'csv') {
        services = parseCsv(input)
      } else {
        const parsed = JSON.parse(input)
        services = parsed.services ?? parsed
        if (!Array.isArray(services)) {
          throw new Error('JSON must be { "services": [...] } or a bare array of service objects')
        }
      }

      const res = await fetch('/api/admin/services-catalog/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services }),
      })
      const data: ImportResponse = await res.json()
      if (!res.ok) {
        throw new Error((data as unknown as { error?: string }).error ?? 'Import failed')
      }
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  function loadExample() {
    setInput(format === 'csv' ? CSV_EXAMPLE : JSON_EXAMPLE)
  }

  function reset() {
    setInput('')
    setResult(null)
    setError(null)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={() => onClose(result !== null && result.inserted + result.updated > 0)}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Bulk Import Services</h2>
          <button
            onClick={() => onClose(result !== null && result.inserted + result.updated > 0)}
            className="text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Paste CSV or JSON to UPSERT multiple services at once. Existing IDs are updated;
          new IDs are inserted.
        </p>

        {!result && (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('csv')}
                className={`px-3 py-1.5 text-sm rounded ${
                  format === 'csv' ? 'bg-teal-500 text-white' : 'bg-slate-100'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-3 py-1.5 text-sm rounded ${
                  format === 'json' ? 'bg-teal-500 text-white' : 'bg-slate-100'
                }`}
              >
                JSON
              </button>
              <button
                onClick={loadExample}
                className="ml-auto px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Load example
              </button>
            </div>

            {format === 'csv' && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded p-2">
                <div className="font-semibold mb-1">CSV columns (in any order, comma-separated):</div>
                <div className="font-mono">{CSV_HEADER_ORDER.join(', ')}</div>
                <div className="mt-1 text-[11px]">
                  Required: <b>id, name, category, display_price_cents</b>. Prices in cents
                  (500000 = $5,000).
                </div>
              </div>
            )}
            {format === 'json' && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded p-2">
                Shape:{' '}
                <code className="font-mono">
                  &#123; &quot;services&quot;: [&#123; id, name, category, display_price_cents, ... &#125;, ...] &#125;
                </code>
              </div>
            )}

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={format === 'csv' ? CSV_EXAMPLE : JSON_EXAMPLE}
              className="w-full border border-slate-300 rounded px-3 py-2 font-mono text-xs h-64 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => onClose(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || input.trim().length === 0}
                className="bg-teal-500 text-white rounded-lg px-5 py-2 text-sm font-bold hover:bg-teal-600 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Import
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="bg-slate-50 rounded p-3 text-center">
                <div className="text-xs text-slate-500 uppercase">Total</div>
                <div className="text-2xl font-bold">{result.total}</div>
              </div>
              <div className="bg-emerald-50 rounded p-3 text-center">
                <div className="text-xs text-emerald-700 uppercase">Inserted</div>
                <div className="text-2xl font-bold text-emerald-900">{result.inserted}</div>
              </div>
              <div className="bg-blue-50 rounded p-3 text-center">
                <div className="text-xs text-blue-700 uppercase">Updated</div>
                <div className="text-2xl font-bold text-blue-900">{result.updated}</div>
              </div>
              <div className={`rounded p-3 text-center ${result.errors > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                <div className={`text-xs uppercase ${result.errors > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                  Errors
                </div>
                <div className={`text-2xl font-bold ${result.errors > 0 ? 'text-red-900' : ''}`}>
                  {result.errors}
                </div>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded text-xs">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-slate-500 uppercase">
                    <th className="text-left px-3 py-2 w-16">Row</th>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2 w-24">Status</th>
                    <th className="text-left px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r) => (
                    <tr key={r.index} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 text-slate-500">{r.index + 1}</td>
                      <td className="px-3 py-1.5 font-mono">{r.id ?? '—'}</td>
                      <td className="px-3 py-1.5">
                        {r.status === 'inserted' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> new
                          </span>
                        )}
                        {r.status === 'updated' && (
                          <span className="inline-flex items-center gap-1 text-blue-700">
                            <RefreshCw className="w-3 h-3" /> updated
                          </span>
                        )}
                        {r.status === 'error' && (
                          <span className="inline-flex items-center gap-1 text-red-700">
                            <XCircle className="w-3 h-3" /> error
                          </span>
                        )}
                        {r.status === 'skipped' && (
                          <span className="text-slate-500">skipped</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{r.error ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={reset}
                className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded"
              >
                Import more
              </button>
              <button
                onClick={() => onClose(result.inserted + result.updated > 0)}
                className="bg-teal-500 text-white rounded-lg px-5 py-2 text-sm font-bold hover:bg-teal-600"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
