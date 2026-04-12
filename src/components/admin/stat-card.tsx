'use client'

import { useRouter } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color: string
  href?: string
}

export function StatCard({ label, value, icon: Icon, color, href }: StatCardProps) {
  const router = useRouter()

  return (
    <div
      onClick={href ? () => router.push(href) : undefined}
      className={cn(
        'bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4 shadow-sm transition-all',
        href && 'cursor-pointer hover:border-slate-300 hover:shadow-md active:scale-[0.98]'
      )}
    >
      <div
        className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}1a` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800 leading-tight">{value}</div>
        <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}
