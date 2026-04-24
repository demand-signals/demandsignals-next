import { redirect } from 'next/navigation'

// Merged into /admin/service-plans — see feat(plans) commit
export default function SubscriptionPlansRedirect() {
  redirect('/admin/service-plans')
}
