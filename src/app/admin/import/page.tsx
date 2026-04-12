import { ImportWizard } from '@/components/admin/import-wizard'

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Import Prospects</h1>
      <ImportWizard />
    </div>
  )
}
