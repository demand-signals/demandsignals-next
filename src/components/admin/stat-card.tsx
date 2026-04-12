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
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4 shadow-sm">
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
