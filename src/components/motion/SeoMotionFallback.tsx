'use client'

import { useEffect } from 'react'

// Googlebot WRS executes JS but never scrolls, so framer-motion
// whileInView animations never fire and content stays at opacity:0.
// After 4 seconds (inside Googlebot's 5-10s render window), inject a
// CSS rule that forces all [data-motion] elements visible. The
// !important overrides framer-motion's inline styles per CSS spec.
export function SeoMotionFallback() {
  useEffect(() => {
    const t = setTimeout(() => {
      const s = document.createElement('style')
      s.textContent = '[data-motion]{opacity:1!important;filter:none!important}'
      document.head.appendChild(s)
    }, 4000)
    return () => clearTimeout(t)
  }, [])

  return null
}
