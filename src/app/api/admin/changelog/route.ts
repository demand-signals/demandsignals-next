import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data', 'changelog-sources.json')

interface ChangelogSourceData {
  id: string
  name: string
  url: string
  type: 'html' | 'rss'
  active: boolean
}

async function readSources(): Promise<ChangelogSourceData[]> {
  const raw = await fs.readFile(DATA_PATH, 'utf-8')
  return JSON.parse(raw)
}

async function writeSources(sources: ChangelogSourceData[]): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(sources, null, 2) + '\n', 'utf-8')
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const sources = await readSources()
  return NextResponse.json({ sources })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { id, name, url, type, active } = body as ChangelogSourceData

  if (!id || !name || !url || !type) {
    return NextResponse.json({ error: 'Missing required fields: id, name, url, type' }, { status: 400 })
  }

  const sources = await readSources()

  if (sources.some(s => s.id === id)) {
    return NextResponse.json({ error: `Source with id "${id}" already exists` }, { status: 409 })
  }

  sources.push({ id, name, url, type, active: active ?? true })
  await writeSources(sources)

  return NextResponse.json({ success: true, sources })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { id, name, url, type, active } = body as ChangelogSourceData

  if (!id) {
    return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
  }

  const sources = await readSources()
  const idx = sources.findIndex(s => s.id === id)

  if (idx === -1) {
    return NextResponse.json({ error: `Source with id "${id}" not found` }, { status: 404 })
  }

  sources[idx] = {
    ...sources[idx],
    ...(name !== undefined && { name }),
    ...(url !== undefined && { url }),
    ...(type !== undefined && { type }),
    ...(active !== undefined && { active }),
  }

  await writeSources(sources)

  return NextResponse.json({ success: true, sources })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing required query param: id' }, { status: 400 })
  }

  const sources = await readSources()
  const filtered = sources.filter(s => s.id !== id)

  if (filtered.length === sources.length) {
    return NextResponse.json({ error: `Source with id "${id}" not found` }, { status: 404 })
  }

  await writeSources(filtered)

  return NextResponse.json({ success: true, sources: filtered })
}
