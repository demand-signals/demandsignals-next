'use client'

import { useState, type ReactNode, type CSSProperties } from 'react'

const baseStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(104, 197, 173, 0.12)',
  borderRadius: 18,
  padding: '32px',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
}

const hoverStyle: CSSProperties = {
  transform: 'translateY(-4px)',
  boxShadow: '0 20px 60px rgba(104, 197, 173, 0.1), 0 0 0 1px rgba(104, 197, 173, 0.18)',
  borderColor: 'rgba(104, 197, 173, 0.3)',
}

export function GlassCard({
  children, style, hoverGlow = true,
}: {
  children: ReactNode; style?: CSSProperties; hoverGlow?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...baseStyle,
        ...(hovered && hoverGlow ? hoverStyle : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
