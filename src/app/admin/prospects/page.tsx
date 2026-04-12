import { ProspectTable } from '@/components/admin/prospect-table'

export default function ProspectsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Prospects</h1>
      <ProspectTable />
    </div>
  )
}
