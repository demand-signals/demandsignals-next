'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Kanban, Monitor, Upload, Bot, LogOut, ChevronDown, Target
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const PROSPECTING_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/prospects', label: 'Prospects', icon: Users },
  { href: '/admin/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/admin/demos', label: 'Demos', icon: Monitor },
  { href: '/admin/import', label: 'Import', icon: Upload },
]

const OTHER_ITEMS = [
  { href: '/admin/agents', label: 'Agents', icon: Bot },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [prospectingOpen, setProspectingOpen] = useState(true)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin-login')
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-slate-200">
        <Link href="/admin" className="text-lg font-bold text-slate-800">
          DSIG <span className="text-[var(--teal)] font-normal text-sm">admin</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {/* Prospecting dropdown */}
        <button
          onClick={() => setProspectingOpen(!prospectingOpen)}
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-3">
            <Target className="w-4 h-4 text-[var(--teal)]" />
            Prospecting
          </span>
          <ChevronDown className={cn(
            'w-4 h-4 text-slate-400 transition-transform duration-200',
            prospectingOpen && 'rotate-180'
          )} />
        </button>

        {prospectingOpen && (
          <div className="ml-3 space-y-0.5">
            {PROSPECTING_ITEMS.map(({ href, label, icon: Icon }) => {
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
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </div>
        )}

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
