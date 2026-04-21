import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRetainerMenu } from '@/lib/retainer'
import EditorClient from './EditorClient'

export const dynamic = 'force-dynamic'

export default async function RetainerPlanEditor({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, slug, name, description, price_cents, tier, sort_order, active')
    .eq('id', id)
    .single()

  if (!plan) notFound()

  const { data: itemsRaw } = await supabaseAdmin
    .from('subscription_plan_items')
    .select('service_id, quantity')
    .eq('plan_id', id)

  const menu = await getRetainerMenu()

  return <EditorClient plan={plan} items={itemsRaw ?? []} menu={menu} />
}
