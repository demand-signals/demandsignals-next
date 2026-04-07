'use client'

import { getIcon } from '@/lib/icons'

export function FeatureIcon({ emoji }: { emoji: string }) {
  const Icon = getIcon(emoji)
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: 'rgba(104, 197, 173, 0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    }}>
      {Icon ? <Icon size={24} strokeWidth={1.5} color="var(--teal)" /> : <span style={{ fontSize: '1.5rem' }}>{emoji}</span>}
    </div>
  )
}
