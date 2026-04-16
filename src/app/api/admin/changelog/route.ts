import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Hardcoded fallback sources (used if Supabase table doesn't exist yet)
const FALLBACK_SOURCES = [
  { id: 'openai', name: 'OpenAI', url: 'https://platform.openai.com/docs/changelog', type: 'html' as const, active: true },
  { id: 'anthropic', name: 'Anthropic', url: 'https://docs.anthropic.com/en/docs/about-claude/models', type: 'html' as const, active: true },
  { id: 'claude-code', name: 'Claude Code', url: 'https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md', type: 'html' as const, active: true },
  { id: 'google-gemini', name: 'Google Gemini', url: 'https://ai.google.dev/gemini-api/docs/changelog', type: 'html' as const, active: true },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://api-docs.deepseek.com/updates', type: 'html' as const, active: true },
]

interface ChangelogSourceData {
  id: string
  name: string
  url: string
  type: 'html' | 'rss'
  active: boolean
}

async function readSources(): Promise<ChangelogSourceData[]> {
  const { data, error } = await supabaseAdmin
    .from('changelog_sources')
    .select('id, name, url, type, active')
    .order('created_at', { ascending: true })

  if (error) {
    // Table doesn't exist yet — return fallback
    console.warn('[changelog-api] Supabase read failed, using fallback:', error.message)
    return FALLBACK_SOURCES
  }

  return data as ChangelogSourceData[]
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  try {
    const sources = await readSources()
    return NextResponse.json({ sources })
  } catch (err) {
    console.error('[changelog-api] GET error:', err)
    return NextResponse.json({ sources: FALLBACK_SOURCES })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { id, name, url, type, active } = body as ChangelogSourceData

    if (!id || !name || !url || !type) {
      return NextResponse.json({ error: 'Missing required fields: id, name, url, type' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('changelog_sources')
      .insert({ id, name, url, type, active: active ?? true })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Source "${id}" already exists` }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sources = await readSources()
    return NextResponse.json({ success: true, sources })
  } catch (err) {
    console.error('[changelog-api] POST error:', err)
    return NextResponse.json({ error: 'Failed to add source' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { id, name, url, type, active } = body as ChangelogSourceData

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (url !== undefined) updates.url = url
    if (type !== undefined) updates.type = type
    if (active !== undefined) updates.active = active

    const { error } = await supabaseAdmin
      .from('changelog_sources')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sources = await readSources()
    return NextResponse.json({ success: true, sources })
  } catch (err) {
    console.error('[changelog-api] PUT error:', err)
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing required query param: id' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('changelog_sources')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sources = await readSources()
    return NextResponse.json({ success: true, sources })
  } catch (err) {
    console.error('[changelog-api] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 })
  }
}
