'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'

type FAQ = { question: string; answer: string }

const SEO_FALLBACK_MS = 4000

function FaqHeadingReveal({ children }: { children: React.ReactNode }) {
  const controls = useAnimation()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const revealed = useRef(false)

  useEffect(() => {
    if (inView && !revealed.current) {
      revealed.current = true
      controls.start({ y: 0, transition: { duration: 0.6 } })
    }
  }, [inView, controls])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!revealed.current) {
        revealed.current = true
        controls.start({ y: 0, transition: { duration: 0 } })
      }
    }, SEO_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [controls])

  return (
    <motion.div ref={ref} data-motion="faq-heading" initial={{ y: 20 }} animate={controls}>
      {children}
    </motion.div>
  )
}

function FaqItemReveal({ children, fromLeft, delay }: { children: React.ReactNode; fromLeft: boolean; delay: number }) {
  const controls = useAnimation()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const revealed = useRef(false)

  useEffect(() => {
    if (inView && !revealed.current) {
      revealed.current = true
      controls.start({ x: 0, transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] } })
    }
  }, [inView, controls, delay])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!revealed.current) {
        revealed.current = true
        controls.start({ x: 0, transition: { duration: 0 } })
      }
    }, SEO_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [controls])

  return (
    <motion.div ref={ref} data-motion="faq-item" initial={{ x: fromLeft ? -60 : 60 }} animate={controls}>
      {children}
    </motion.div>
  )
}

export function FaqAccordion({
  faqs,
  heading = 'Frequently Asked Questions',
  eyebrow = 'FAQ',
}: {
  faqs: FAQ[]
  heading?: string
  eyebrow?: string
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <section className="mesh-white" style={{ padding: '72px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FaqHeadingReveal>
          <SectionHeading eyebrow={eyebrow} heading={heading} />
        </FaqHeadingReveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900, margin: '0 auto' }}>
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i
            const fromLeft = i % 2 === 0
            return (
              <FaqItemReveal key={faq.question} fromLeft={fromLeft} delay={i * 0.1}>
                <div style={{
                  background: isOpen ? 'rgba(255,255,255,0.85)' : 'rgba(244,246,249,0.8)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 14,
                  border: isOpen ? '1px solid rgba(104,197,173,0.25)' : '1px solid transparent',
                  overflow: 'hidden',
                  transition: 'border-color 0.3s, background 0.3s',
                }}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    style={{
                      width: '100%', padding: '20px 28px', display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between',
                      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', margin: 0, lineHeight: 1.4 }}>
                      {faq.question}
                    </h3>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ flexShrink: 0, marginLeft: 16, color: 'var(--teal)' }}
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <div style={{ padding: '0 28px 20px' }}>
                          <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.7, margin: 0 }}>
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FaqItemReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
