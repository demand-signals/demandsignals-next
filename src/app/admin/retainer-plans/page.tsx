import { redirect } from 'next/navigation'

export default function RetainerPlansRedirect() {
  redirect('/admin/service-plans?filter=retainers')
}
