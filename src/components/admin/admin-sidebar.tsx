'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Upload, Bot, LogOut,
  Target, MapPin, FileText, BarChart3, Layers, LineChart,
  Newspaper, Receipt, CreditCard, Repeat, ScrollText, Settings,
  FolderKanban, FileCheck, FileMinus, Coins, UserCheck, MessageSquare, Zap,
  Clock, UserCog, Shield, Eye, ExternalLink, Bell,
  ChevronRight, ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  soon?: boolean
  external?: boolean
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'PROSPECTING',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/pipeline', label: 'Pipeline', icon: Target },
      { href: '/admin/prospects', label: 'Prospects', icon: Users },
      { href: '/admin/quotes', label: 'Budgetary Quotes', icon: FileText },
      { href: '/admin/import', label: 'Import Prospects', icon: Upload },
    ],
  },
  {
    title: 'ONBOARDING',
    items: [
      { href: '/admin/demos', label: 'Demo Sites', icon: Layers },
      { href: '/admin/sow', label: 'Statements of Work', icon: ScrollText },
    ],
  },
  {
    title: 'CLIENTS',
    items: [
      { href: '/admin/clients', label: 'Manage Clients', icon: UserCheck },
      { href: '/admin/communications', label: 'Communications', icon: MessageSquare },
      { href: '/admin/automations', label: 'Automations', icon: Zap, soon: true },
    ],
  },
  {
    title: 'PROJECTS',
    items: [
      { href: '/admin/projects/dashboard', label: 'Project Dashboard', icon: LineChart, soon: true },
      { href: '/admin/projects', label: 'Manage Projects', icon: FolderKanban },
      { href: '/admin/timekeeping', label: 'Timekeeping', icon: Clock, soon: true },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { href: '/admin/invoices', label: 'Invoices', icon: Receipt },
      { href: '/admin/receipts', label: 'Receipts', icon: FileCheck },
      { href: '/admin/credit-memos', label: 'Credit Memos', icon: FileMinus },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: Repeat },
      { href: '/admin/trade-credits', label: 'Trade Credits', icon: Coins, soon: true },
      { href: '/admin/finance-reports', label: 'Reports', icon: BarChart3, soon: true },
    ],
  },
  {
    title: 'SERVICES',
    items: [
      { href: '/admin/services', label: 'Service Catalog', icon: Layers },
      { href: '/admin/service-plans', label: 'Service Plans', icon: CreditCard },
    ],
  },
  {
    title: 'CONTENT',
    items: [
      { href: '/admin/long-tails', label: 'Long-Tail Pages', icon: MapPin },
      { href: '/admin/blog', label: 'Blog Posts', icon: Newspaper },
      { href: '/admin/changelog', label: 'ChangeLog Posts', icon: FileText },
    ],
  },
  {
    title: 'AGENTS',
    items: [
      { href: '/admin/agents', label: 'Prospecting Agent', icon: Bot },
      { href: '/admin/agents/scoring', label: 'Scoring Agent', icon: Bot, soon: true },
      { href: '/admin/agents/research', label: 'Research Agent', icon: Bot, soon: true },
      { href: '/admin/agents/outreach', label: 'Outreach Agent', icon: Bot, soon: true },
    ],
  },
  {
    title: 'INSIGHTS',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      {
        href: 'https://us.posthog.com/project/demandsignals',
        label: 'PostHog',
        icon: Eye,
        external: true,
      },
    ],
  },
  {
    title: 'ADMIN',
    items: [
      { href: '/admin/messages', label: 'System Messages', icon: Bell },
      { href: '/admin/users', label: 'Users', icon: UserCog, soon: true },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/security', label: 'Security', icon: Shield, soon: true },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  function toggleGroup(title: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin-login')
  }

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-slate-200">
        <Link href="/admin" className="text-lg font-bold text-slate-800">
          DSIG{' '}
          <span className="text-[var(--teal)] font-semibold text-xs tracking-wider uppercase">
            Admin Portal
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-1">
        {NAV_GROUPS.map((group) => {
          const isOpen = openGroups.has(group.title)
          return (
            <div key={group.title}>
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold tracking-widest text-[var(--orange)] uppercase hover:opacity-80 transition-opacity"
              >
                <span>{group.title}</span>
                {isOpen
                  ? <ChevronDown className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />
                }
              </button>
              {isOpen && (
                <div className="space-y-0.5 mb-2">
                  {group.items.map(({ href, label, icon: Icon, soon, external }) => {
                    const active =
                      !soon &&
                      !external &&
                      (href === '/admin'
                        ? pathname === '/admin'
                        : pathname.startsWith(href))

                    const baseClasses = cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
                      soon
                        ? 'opacity-50 cursor-default text-slate-500'
                        : active
                          ? 'bg-[var(--teal)]/10 text-[var(--teal)] font-medium'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                    )

                    const children = (
                      <>
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 whitespace-nowrap">{label}</span>
                        {soon && (
                          <span className="text-[9px] font-semibold tracking-wide text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            soon
                          </span>
                        )}
                        {external && !soon && (
                          <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                        )}
                      </>
                    )

                    if (soon) {
                      return (
                        <button
                          key={href}
                          className={baseClasses}
                          onClick={(e) => e.preventDefault()}
                          tabIndex={-1}
                          aria-disabled="true"
                        >
                          {children}
                        </button>
                      )
                    }

                    if (external) {
                      return (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={baseClasses}
                        >
                          {children}
                        </a>
                      )
                    }

                    return (
                      <Link key={href} href={href} className={baseClasses}>
                        {children}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
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
