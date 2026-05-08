import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import { generateCliToken } from '@/lib/cli-auth'

// /api/admin/cli-tokens
//   POST  → create a new CLI token (returns plaintext ONCE)
//   GET   → list ALL tokens (multi-admin shared visibility per spec)
//
// Spec: docs/superpowers/specs/2026-05-08-cli-tokens-design.md
// Plan: docs/superpowers/plans/2026-05-08-cli-tokens-plan.md Task 6

const CreateBodySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  expires_at: z.string().datetime().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = CreateBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const generated = await generateCliToken()

  const { data: row, error } = await supabaseAdmin
    .from('cli_tokens')
    .insert({
      name: parsed.data.name,
      prefix: generated.prefix,
      last4: generated.last4,
      token_hash: generated.hash,
      created_by: auth.admin.id,
      expires_at: parsed.data.expires_at ?? null,
    })
    .select('id, name, prefix, last4, expires_at, created_at, created_by')
    .single()

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create token' },
      { status: 500 },
    )
  }

  // Return plaintext ONCE. After this response, the value is unrecoverable.
  return NextResponse.json({
    token: row,
    plaintext: generated.plaintext,
  })
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  // Multi-admin shared visibility: every admin sees every token.
  const { data: tokens, error } = await supabaseAdmin
    .from('cli_tokens')
    .select(
      'id, name, prefix, last4, created_at, expires_at, last_used_at, revoked_at, revoked_by, revoked_reason, created_by',
    )
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Join admin names for display
  const adminIds = Array.from(
    new Set(
      (tokens ?? [])
        .flatMap((t) => [t.created_by, t.revoked_by])
        .filter((v): v is string => !!v),
    ),
  )
  let adminMap = new Map<string, { display_name: string | null; email: string | null }>()
  if (adminIds.length > 0) {
    const { data: admins } = await supabaseAdmin
      .from('admin_users')
      .select('id, display_name, email')
      .in('id', adminIds)
    adminMap = new Map((admins ?? []).map((a) => [a.id, { display_name: a.display_name, email: a.email }]))
  }

  return NextResponse.json({
    tokens: (tokens ?? []).map((t) => ({
      ...t,
      created_by_admin: adminMap.get(t.created_by) ?? null,
      revoked_by_admin: t.revoked_by ? adminMap.get(t.revoked_by) ?? null : null,
    })),
  })
}
