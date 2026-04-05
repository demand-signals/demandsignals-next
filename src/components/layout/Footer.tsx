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

        {/* Services col */}
        <div>
          <h4 style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Services</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Websites & Web Apps', '/services/websites'],
              ['Local Demand Generation', '/services/local-demand'],
              ['Content Marketing', '/services/content'],
              ['Google My Business', '/services/gmb'],
              ['Brand Identity & Design', '/services/brand-design'],
            ].map(([label, href]) => (
              <li key={href}><Link href={href} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', transition: 'color var(--t)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* AI col */}
        <div>
          <h4 style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI &amp; Agents</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['AI Agent Farms', '/ai-agents/agent-farms'],
              ['AI Voice Systems', '/ai-agents/voice'],
              ['Workflow Automation', '/ai-agents/automation'],
              ['GEO & LLM Optimization', '/ai-agents/geo-llm'],
              ['Agent Infrastructure', '/ai-agents/infrastructure'],
            ].map(([label, href]) => (
              <li key={href}><Link href={href} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', transition: 'color var(--t)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Company col */}
        <div>
          <h4 style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Company</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Portfolio', '/portfolio'],
              ['Blog', '/blog'],
              ['About', '/about'],
              ['Contact', '/contact'],
              ['Free Reports', '/tools/research-reports'],
              ['Free Demand Audit', '/tools/demand-audit'],
            ].map(([label, href]) => (
              <li key={href}><Link href={href} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', transition: 'color var(--t)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>{label}</Link></li>
            ))}
          </ul>
          <div style={{ marginTop: 24 }}>
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
