'use client'
import Link from 'next/link'
import Image from 'next/image'
import { LOGO_URL, CONTACT_PHONE, CONTACT_EMAIL, BOOKING_URL } from '@/lib/constants'

export function Footer() {
  return (
    <footer style={{ background: 'var(--dark)', color: 'rgba(255,255,255,0.65)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48 }}>
        {/* Brand col */}
        <div>
          <Image src={LOGO_URL} alt="Demand Signals" width={140} height={36} style={{ height: 36, width: 'auto', marginBottom: 16 }} />
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, marginBottom: 16 }}>
            AI-first demand generation agency. We make you the signal, not the noise.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.875rem' }}>
            <a href={`tel:${CONTACT_PHONE}`} style={{ color: 'rgba(255,255,255,0.65)' }}>{CONTACT_PHONE}</a>
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'rgba(255,255,255,0.65)' }}>{CONTACT_EMAIL}</a>
          </div>
        </div>

        {/* Websites & Demand Gen col */}
        <div>
          <h4 style={colHead}>Websites & Apps</h4>
          <ul style={ul}>
            {([
              ['WordPress Sites',     '/websites-apps/wordpress-development'],
              ['React / Next.js',     '/websites-apps/react-next-webapps'],
              ['Mobile Apps',         '/websites-apps/mobile-apps'],
              ['Vibe Coded Apps',     '/websites-apps/vibe-coded'],
              ['UI/UX Design',        '/websites-apps/design'],
            ] as const).map(([label, href]) => (
              <li key={href}><FooterLink href={href}>{label}</FooterLink></li>
            ))}
          </ul>
        </div>

        {/* Demand Gen + Content col */}
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

        {/* AI & Company col */}
        <div>
          <h4 style={colHead}>AI & Agent Services</h4>
          <ul style={ul}>
            {([
              ['AI Agent Swarms',          '/ai-services/ai-agent-swarms'],
              ['AI Workforce Automation',  '/ai-services/ai-workforce-automation'],
              ['AI Powered Outreach',      '/ai-services/ai-automated-outreach'],
              ['AI Private LLMs',          '/ai-services/private-llms'],
            ] as const).map(([label, href]) => (
              <li key={href}><FooterLink href={href}>{label}</FooterLink></li>
            ))}
          </ul>
          <h4 style={{ ...colHead, marginTop: 20 }}>Company</h4>
          <ul style={ul}>
            {([
              ['Portfolio',       '/portfolio'],
              ['Blog & News',    '/blog'],
              ['About',          '/about'],
              ['Contact',        '/contact'],
              ['Locations',      '/locations'],
            ] as const).map(([label, href]) => (
              <li key={href}><FooterLink href={href}>{label}</FooterLink></li>
            ))}
          </ul>
          <div style={{ marginTop: 20 }}>
            <a href={BOOKING_URL} target="_blank" rel="noopener" style={{
              display: 'inline-block', padding: '10px 20px', background: '#FF6B2B',
              color: '#fff', fontWeight: 600, fontSize: '0.875rem', borderRadius: 100,
            }}>Book a Free Call →</a>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', maxWidth: 1200, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
        <span>© {new Date().getFullYear()} Demand Signals. All rights reserved.</span>
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
    <Link href={href} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', transition: 'color 0.2s' }}>
      {children}
    </Link>
  )
}
