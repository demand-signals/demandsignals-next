'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { type ReactNode, type CSSProperties } from 'react'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 30 },
  down: { x: 0, y: -30 },
  left: { x: 30, y: 0 },
  right: { x: -30, y: 0 },
  none: { x: 0, y: 0 },
}

export function ScrollReveal({
  children, direction = 'up', delay = 0, duration = 0.6, once = true, style,
}: {
  children: ReactNode; direction?: Direction; delay?: number
  duration?: number; once?: boolean; style?: CSSProperties
}) {
  const reduced = useReducedMotion()
  if (reduced) return <div style={style}>{children}</div>

  const { x, y } = offsets[direction]
  return (
    <motion.div
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
}

export function StaggerContainer({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const reduced = useReducedMotion()
  if (reduced) return <div style={style}>{children}</div>

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={containerVariants}
      style={style}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const reduced = useReducedMotion()
  if (reduced) return <div style={style}>{children}</div>

  return (
    <motion.div variants={itemVariants} style={style}>
      {children}
    </motion.div>
  )
}
