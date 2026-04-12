'use client'

import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color: string
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-start gap-4">
      <div
        className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}26` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white leading-tight">{value}</div>
        <div className="text-sm text-white/50 mt-0.5">{label}</div>
      </div>
    </div>
  )
}
