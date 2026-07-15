'use client'

import { useEffect } from 'react'

// The <head> contains a static <style id="seo-reveal-default"> that
// forces [data-motion]{opacity:1!important}. This guarantees content
// is visible in the SSR HTML before any JS runs — critical for
// Googlebot WRS which may snapshot before React hydrates.
//
// On first scroll we remove that override so framer-motion's
// whileInView animations can play their opacity transitions normally.
// Mount-triggered animations (PageHero) keep their transform motion
// (x/y/scale) but skip the opacity fade — acceptable trade-off for
// guaranteed indexability. Googlebot never scrolls, so the override
// stays permanently for crawlers.
export function SeoMotionFallback() {
  useEffect(() => {
    const onScroll = () => {
      document.getElementById('seo-reveal-default')?.remove()
    }
    window.addEventListener('scroll', onScroll, { once: true, passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
