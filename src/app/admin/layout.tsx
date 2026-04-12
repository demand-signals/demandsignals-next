import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { QueryProvider } from '@/components/query-provider'

export const metadata = {
  title: 'Admin — Demand Signals',
  robots: 'noindex, nofollow',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AdminSidebar />
        <main className="flex-1 p-6 overflow-auto text-slate-800">
          {children}
        </main>
      </div>
    </QueryProvider>
  )
}
