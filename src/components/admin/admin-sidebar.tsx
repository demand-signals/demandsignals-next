'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Kanban, Monitor, Upload, Bot, LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/prospects', label: 'Prospects', icon: Users },
  { href: '/admin/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/admin/demos', label: 'Demos', icon: Monitor },
  { href: '/admin/import', label: 'Import', icon: Upload },
  { href: '/admin/agents', label: 'Agents', icon: Bot },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin-login')
  }

  return (
    <aside className="w-64 bg-[#1a1f2e] border-r border-white/10 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-white/15">
        <Link href="/admin" className="text-lg font-bold text-white">
          DSIG <span className="text-[var(--teal)] font-normal text-sm">admin</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
                  ? 'bg-[var(--teal)]/20 text-[var(--teal)] font-medium'
                  : 'text-white/80 hover:text-white hover:bg-white/8'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/8 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
