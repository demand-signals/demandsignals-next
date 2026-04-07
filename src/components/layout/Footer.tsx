'use client'
import Link from 'next/link'
import Image from 'next/image'
import { LOGO_URL, CONTACT_PHONE, CONTACT_PHONE_TEL, CONTACT_EMAIL, BOOKING_URL } from '@/lib/constants'
import styles from './footer.module.css'

export function Footer() {
  return (
    <footer style={{ background: '#1e2740', color: 'rgba(255,255,255,0.65)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Brand bar — logo, tagline, phone, email in a row */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 36px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexWrap: 'wrap', gap: 24,
        }}>
          <Image src={LOGO_URL} alt="Demand Signals" width={150} height={38} style={{ height: 38, width: 'auto', flexShrink: 0 }} />
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6, margin: 0, color: 'rgba(255,255,255,0.55)' }}>
            AI-first demand generation agency.<br />We make you the signal, not the noise.
          </p>
          <a href={`tel:${CONTACT_PHONE_TEL}`} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68c5ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> {CONTACT_PHONE}
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--teal)', fontSize: '1rem' }}>✉️</span> {CONTACT_EMAIL}
          </a>
          <a href={BOOKING_URL} target="_blank" rel="noopener" style={{
            display: 'inline-block', padding: '10px 22px', background: '#FF6B2B',
            color: '#fff', fontWeight: 700, fontSize: '0.85rem', borderRadius: 100,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>Book an Intro Call →</a>
        </div>
      </div>

      {/* Link grid — 4 columns desktop, 2 columns mobile */}
      <div className={styles.linkGrid}>

        {/* Company */}
        <div>
          <h4 style={colHead}>Company</h4>
          <ul style={ul}>
            {([
              ['About',          '/about'],
              ['Portfolio',      '/portfolio'],
              ['Blog & News',   '/blog'],
              ['Contact',       '/contact'],
              ['Locations',     '/locations'],
            ] as const).map(([label, href]) => (
              <li key={href}><FooterLink href={href}>{label}</FooterLink></li>
            ))}
          </ul>

          <a
            href="https://share.google/WTvlYyGBA02cNshOC"
            target="_blank"
            rel="noopener"
            style={{ fontSize: '0.85rem', color: 'var(--teal)', textDecoration: 'none', display: 'inline-block', marginTop: 16 }}
          >
            M-F 10am to 8pm PT
          </a>
        </div>

        {/* Websites & Apps */}
        <div>
          <h4 style={colHead}>Websites & Apps</h4>
          <ul style={ul}>
            {([
              ['WordPress Sites',     '/websites-apps/wordpress-development'],
              ['React / Next.js',     '/websites-apps/react-next-webapps'],
              ['Mobile Apps',         '/websites-apps/mobile-apps'],
              ['Vibe Coded Apps',     '/websites-apps/vibe-coded'],
              ['UI/UX Design',        '/websites-apps/design'],
              ['Hosting',             '/websites-apps/hosting'],
            ] as const).map(([label, href]) => (
              <li key={href}><FooterLink href={href}>{label}</FooterLink></li>
            ))}
          </ul>
        </div>

        {/* Demand Generation */}
        <div>
          <h4 style={colHead}>Demand Generation</h4>
          <ul style={ul}>
            {([
              ['LLM Optimization',      '/demand-generation/geo-aeo-llm-optimization'],
              ['Local SEO',             '/demand-generation/local-seo'],
              ['Geo-Targeting',         '/demand-generation/geo-targeting'],
              ['Google Business Admin',  '/demand-generation/gbp-admin'],
              ['Demand Gen Systems',     '/demand-generation/systems'],
            ] as const).map(([label, href]) => (
              <li key={href}><FooterLink href={href}>{label}</FooterLink></li>
            ))}
          </ul>
        </div>

        {/* AI & Agent Services */}
        <div>
          <h4 style={colHead}>AI & Agent Services</h4>
          <ul style={ul}>
            {([
              ['AI Agent Swarms',          '/ai-services/ai-agent-swarms'],
              ['AI Workforce Automation',  '/ai-services/ai-workforce-automation'],
              ['AI Powered Outreach',      '/ai-services/ai-automated-outreach'],
              ['AI Private LLMs',          '/ai-services/private-llms'],
              ['AI Infrastructure',        '/ai-services/ai-agent-infrastructure'],
              ['AI Strategies',            '/ai-services/ai-automation-strategies'],
            ] as const).map(([label, href]) => (
              <li key={href}><FooterLink href={href}>{label}</FooterLink></li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', maxWidth: 1200, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
        <span>© {new Date().getFullYear()} Demand Signals. All rights reserved.</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>Digital by Demand Signals.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.35)' }}>Privacy</Link>
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.35)' }}>Terms</Link>
          <Link href="/accessibility" style={{ color: 'rgba(255,255,255,0.35)' }}>Accessibility</Link>
        </div>
      </div>
    </footer>
  )
}

/* ── Shared footer styles ─────────────────────────────────── */
const colHead: React.CSSProperties = {
  color: '#fff', fontSize: '0.875rem', fontWeight: 700,
  marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em',
}
const ul: React.CSSProperties = {
  listStyle: 'none', padding: 0, margin: 0,
  display: 'flex', flexDirection: 'column', gap: 10,
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', transition: 'color 0.2s', textDecoration: 'none' }}>
      {children}
    </Link>
  )
}
