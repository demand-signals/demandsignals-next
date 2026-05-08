import Link from 'next/link'
import { LogOut } from 'lucide-react'

interface PortalNavProps {
  businessName: string | null
  ownerName: string | null
}

export function PortalNav({ businessName, ownerName }: PortalNavProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/portal" className="flex items-center gap-3">
          <span className="text-lg font-bold text-slate-900 tracking-tight">
            Demand Signals
          </span>
          <span className="hidden sm:inline-block text-xs text-slate-400 uppercase tracking-wider">
            Client portal
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/portal" className="text-slate-600 hover:text-slate-900">Dashboard</Link>
          <Link href="/portal/projects" className="text-slate-600 hover:text-slate-900">Projects</Link>
          <Link href="/portal/invoices" className="text-slate-600 hover:text-slate-900">Invoices</Link>
          <Link href="/portal/account" className="text-slate-600 hover:text-slate-900">Account</Link>
        </nav>

        <div className="flex items-center gap-3">
          {businessName && (
            <div className="hidden sm:block text-right">
              <div className="text-xs text-slate-400">Signed in as</div>
              <div className="text-sm font-medium text-slate-700">
                {ownerName ?? businessName}
              </div>
            </div>
          )}
          <a
            href="/auth/signout"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </a>
        </div>
      </div>

      {/* Mobile nav row */}
      <nav className="md:hidden flex items-center gap-4 px-6 pb-3 text-sm overflow-x-auto">
        <Link href="/portal" className="text-slate-600 hover:text-slate-900 whitespace-nowrap">Dashboard</Link>
        <Link href="/portal/projects" className="text-slate-600 hover:text-slate-900 whitespace-nowrap">Projects</Link>
        <Link href="/portal/invoices" className="text-slate-600 hover:text-slate-900 whitespace-nowrap">Invoices</Link>
        <Link href="/portal/account" className="text-slate-600 hover:text-slate-900 whitespace-nowrap">Account</Link>
      </nav>
    </header>
  )
}
