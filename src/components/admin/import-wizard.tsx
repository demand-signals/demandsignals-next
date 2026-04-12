'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, FileText, Eye, Download, CheckCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ImportRow = Record<string, string>

type ImportResult = {
  imported: number
  skipped: number
  errors: string[]
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: ImportRow = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

function parseJSON(text: string): ImportRow[] {
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
    if (parsed.prospects && Array.isArray(parsed.prospects)) return parsed.prospects
    return []
  } catch {
    return []
  }
}

function parseInput(text: string, fileName?: string): ImportRow[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parseJSON(trimmed)
  }
  if (fileName?.endsWith('.json')) {
    return parseJSON(trimmed)
  }
  return parseCSV(trimmed)
}

export function ImportWizard() {
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState<string | undefined>()
  const [preview, setPreview] = useState<ImportRow[] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function loadFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      setRawText(text)
      setPreview(null)
      setResult(null)
      setParseError(null)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  function handlePreview() {
    setParseError(null)
    const rows = parseInput(rawText, fileName)
    if (rows.length === 0) {
      setParseError('Could not parse any rows. Check CSV headers or JSON format.')
      return
    }
    setPreview(rows.slice(0, 5))
  }

  async function handleImport() {
    const rows = parseInput(rawText, fileName)
    if (rows.length === 0) {
      setParseError('Nothing to import.')
      return
    }
    setImporting(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: rows }),
      })
      const json = await res.json()
      if (!res.ok) {
        setParseError(json.error ?? 'Import failed')
      } else {
        setResult(json)
      }
    } catch (err) {
      setParseError('Network error during import.')
    } finally {
      setImporting(false)
    }
  }

  const rowCount = parseInput(rawText, fileName).length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-[var(--teal)] bg-[var(--teal)]/5'
            : 'border-white/15 hover:border-white/30 hover:bg-white/3'
        )}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-white/40" />
        <p className="text-white/60 text-sm">
          Drop a <strong className="text-white/80">CSV</strong> or <strong className="text-white/80">JSON</strong> file here,
          or <span className="text-[var(--teal)]">click to browse</span>
        </p>
        {fileName && (
          <div className="mt-3 flex items-center justify-center gap-2 text-white/70 text-sm">
            <FileText className="w-4 h-4" />
            {fileName}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Paste Area */}
      <div className="space-y-2">
        <label className="text-sm text-white/60 font-medium">Or paste JSON / CSV directly</label>
        <textarea
          value={rawText}
          onChange={e => { setRawText(e.target.value); setPreview(null); setResult(null); setParseError(null) }}
          rows={8}
          placeholder={'[{"business_name": "Example Dental", "city": "Folsom", ...}]'}
          className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-3 font-mono placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[var(--teal)] resize-y"
        />
        {rawText && (
          <p className="text-white/40 text-xs">
            {rowCount} row{rowCount !== 1 ? 's' : ''} detected
          </p>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {parseError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePreview}
          disabled={!rawText.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-sm text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Eye className="w-4 h-4" />
          Preview (first 5 rows)
        </button>

        <button
          onClick={handleImport}
          disabled={!rawText.trim() || importing}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--teal)] text-white font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <Download className="w-4 h-4" />
          {importing ? 'Importing…' : `Import${rowCount > 0 ? ` (${rowCount})` : ''}`}
        </button>

        {(rawText || result) && (
          <button
            onClick={() => { setRawText(''); setFileName(undefined); setPreview(null); setResult(null); setParseError(null) }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors ml-auto"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Preview Table */}
      {preview && preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-white/50 font-medium">Preview — first {preview.length} rows</p>
          <div className="rounded-xl border border-white/10 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  {Object.keys(preview[0]).slice(0, 10).map(col => (
                    <th key={col} className="px-3 py-2 text-left text-white/50 font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Object.keys(preview[0]).slice(0, 10).map(col => (
                      <td key={col} className="px-3 py-2 text-white/70 whitespace-nowrap max-w-[160px] truncate">
                        {String(row[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Result */}
      {result && (
        <div className="rounded-xl border border-white/10 p-5 space-y-4 bg-white/3">
          <div className="flex items-center gap-2 text-green-400 font-medium">
            <CheckCircle className="w-5 h-5" />
            Import Complete
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-green-500/10 p-3">
              <div className="text-2xl font-bold text-green-400">{result.imported}</div>
              <div className="text-xs text-white/50 mt-1">Imported</div>
            </div>
            <div className="rounded-lg bg-yellow-500/10 p-3">
              <div className="text-2xl font-bold text-yellow-400">{result.skipped}</div>
              <div className="text-xs text-white/50 mt-1">Skipped</div>
            </div>
            <div className="rounded-lg bg-red-500/10 p-3">
              <div className="text-2xl font-bold text-red-400">{result.errors.length}</div>
              <div className="text-xs text-white/50 mt-1">Errors</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-white/50 font-medium">Errors</p>
              <ul className="space-y-1 text-xs text-red-400/80">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i} className="truncate">{e}</li>
                ))}
                {result.errors.length > 20 && (
                  <li className="text-white/40">…and {result.errors.length - 20} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
