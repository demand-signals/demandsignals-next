'use client'

import { motion, useReducedMotion, useAnimation, useInView, type Variants } from 'framer-motion'
import { type ReactNode, type CSSProperties, useRef, useEffect } from 'react'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 30 },
  down: { x: 0, y: -30 },
  left: { x: 30, y: 0 },
  right: { x: -30, y: 0 },
  none: { x: 0, y: 0 },
}

// Googlebot WRS executes JS but doesn't scroll — whileInView never
// fires for below-fold content, leaving it at opacity:0. This timeout
// forces the animation to complete so crawlers index visible text.
const SEO_FALLBACK_MS = 4000

export function ScrollReveal({
  children, direction = 'up', delay = 0, duration = 0.6, once = true, style,
}: {
  children: ReactNode; direction?: Direction; delay?: number
  duration?: number; once?: boolean; style?: CSSProperties
}) {
  const reduced = useReducedMotion()
  const controls = useAnimation()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once, margin: '-60px' })
  const revealed = useRef(false)

  const { x, y } = offsets[direction]

  useEffect(() => {
    if (inView && !revealed.current) {
      revealed.current = true
      controls.start({
        opacity: 1, x: 0, y: 0,
        transition: { duration, delay, ease: [0.25, 0.1, 0.25, 1] },
      })
    }
  }, [inView, controls, duration, delay])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!revealed.current) {
        revealed.current = true
        controls.start({ opacity: 1, x: 0, y: 0, transition: { duration: 0 } })
      }
    }, SEO_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [controls])

  if (reduced) return <div data-motion="scroll-reveal" style={style}>{children}</div>

  return (
    <motion.div
      ref={ref}
      data-motion="scroll-reveal"
      initial={{ opacity: 0, x, y }}
      animate={controls}
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

export function StaggerContainer({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  const reduced = useReducedMotion()
  const controls = useAnimation()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const revealed = useRef(false)

  useEffect(() => {
    if (inView && !revealed.current) {
      revealed.current = true
      controls.start('visible')
    }
  }, [inView, controls])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!revealed.current) {
        revealed.current = true
        controls.start('visible')
      }
    }, SEO_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [controls])

  if (reduced) return <div data-motion="stagger-container" style={style} className={className}>{children}</div>

  return (
    <motion.div
      ref={ref}
      data-motion="stagger-container"
      initial="hidden"
      animate={controls}
      variants={containerVariants}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const reduced = useReducedMotion()
  if (reduced) return <div data-motion="stagger-item" style={style}>{children}</div>

  return (
    <motion.div data-motion="stagger-item" variants={itemVariants} style={style}>
      {children}
    </motion.div>
  )
}
