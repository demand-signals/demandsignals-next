'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Kanban, Monitor, Upload, Bot, LogOut,
  ChevronDown, Target, MapPin, FileText, BarChart3, Layers, LineChart,
  Newspaper, Receipt, CreditCard, Repeat, ScrollText, DollarSign, Settings, CalendarClock,
  FolderKanban, FileCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: React.ElementType }

const PROSPECTING_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/prospects', label: 'Prospects', icon: Users },
  { href: '/admin/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/admin/quotes', label: 'Quotes', icon: Receipt },
  { href: '/admin/demos', label: 'Demos', icon: Monitor },
  { href: '/admin/import', label: 'Import', icon: Upload },
]

const CONTENT_ITEMS: NavItem[] = [
  { href: '/admin/long-tails', label: 'Long-Tails', icon: MapPin },
  { href: '/admin/blog', label: 'Blog Posts', icon: FileText },
  { href: '/admin/changelog', label: 'ChangeLog', icon: Newspaper },
]

const INSIGHTS_ITEMS: NavItem[] = [
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

const FINANCE_ITEMS: NavItem[] = [
  { href: '/admin/services', label: 'Services Catalog', icon: Layers },
  { href: '/admin/invoices', label: 'Invoices', icon: CreditCard },
  { href: '/admin/receipts', label: 'Receipts', icon: FileCheck },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: Repeat },
  { href: '/admin/subscription-plans', label: 'Plans', icon: DollarSign },
  { href: '/admin/retainer-plans', label: 'Retainer Plans', icon: CalendarClock },
  { href: '/admin/sow', label: 'SOWs', icon: ScrollText },
  { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
]

const OTHER_ITEMS: NavItem[] = [
  { href: '/admin/agents', label: 'Agents', icon: Bot },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

function NavGroup({
  label,
  icon: Icon,
  items,
  open,
  onToggle,
  pathname,
}: {
  label: string
  icon: React.ElementType
  items: NavItem[]
  open: boolean
  onToggle: () => void
  pathname: string
}) {
  return (
    <>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-[var(--teal)]" />
          {label}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-slate-400 transition-transform duration-200',
          open && 'rotate-180'
        )} />
      </button>

      {open && (
        <div className="ml-3 space-y-0.5">
          {items.map(({ href, label, icon: ItemIcon }) => {
            const active = href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-[var(--teal)]/10 text-[var(--teal)] font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <ItemIcon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [prospectingOpen, setProspectingOpen] = useState(true)
  const [contentOpen, setContentOpen] = useState(true)
  const [insightsOpen, setInsightsOpen] = useState(true)
  const [financeOpen, setFinanceOpen] = useState(true)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin-login')
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-slate-200">
        <Link href="/admin" className="text-lg font-bold text-slate-800">
          DSIG <span className="text-[var(--teal)] font-semibold text-xs tracking-wider uppercase">Admin Portal</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Prospecting */}
        <NavGroup
          label="Prospecting"
          icon={Target}
          items={PROSPECTING_ITEMS}
          open={prospectingOpen}
          onToggle={() => setProspectingOpen(!prospectingOpen)}
          pathname={pathname}
        />

        {/* Content */}
        <div className="pt-2 border-t border-slate-100 mt-2">
          <NavGroup
            label="Content"
            icon={Layers}
            items={CONTENT_ITEMS}
            open={contentOpen}
            onToggle={() => setContentOpen(!contentOpen)}
            pathname={pathname}
          />
        </div>

        {/* Insights */}
        <div className="pt-2 border-t border-slate-100 mt-2">
          <NavGroup
            label="Insights"
            icon={LineChart}
            items={INSIGHTS_ITEMS}
            open={insightsOpen}
            onToggle={() => setInsightsOpen(!insightsOpen)}
            pathname={pathname}
          />
        </div>

        {/* Finance */}
        <div className="pt-2 border-t border-slate-100 mt-2">
          <NavGroup
            label="Finance"
            icon={DollarSign}
            items={FINANCE_ITEMS}
            open={financeOpen}
            onToggle={() => setFinanceOpen(!financeOpen)}
            pathname={pathname}
          />
        </div>

        {/* Standalone items */}
        <div className="pt-2 border-t border-slate-100 mt-2">
          {OTHER_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-[var(--teal)]/10 text-[var(--teal)] font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
