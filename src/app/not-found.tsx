import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page Not Found — Demand Signals',
  description: 'The page you are looking for could not be found.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <section
      style={{
        background: 'var(--dark)',
        minHeight: 'calc(100vh - 72px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 600 }}>
        {/* Large 404 */}
        <div
          style={{
            fontSize: 'clamp(5rem, 15vw, 10rem)',
            fontWeight: 900,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #52C9A0, #FF6B2B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 24,
          }}
        >
          404
        </div>

        <h1
          style={{
            color: '#fff',
            fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
            fontWeight: 800,
            marginBottom: 16,
          }}
        >
          Page Not Found
        </h1>

        <p
          style={{
            color: '#a0aec0',
            fontSize: '1.05rem',
            lineHeight: 1.7,
            marginBottom: 40,
            maxWidth: 480,
            margin: '0 auto 40px',
          }}
        >
          The page you are looking for may have been moved, removed, or never existed.
          Here are some helpful links to get you back on track.
        </p>

        {/* Navigation links */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          {[
            { label: 'Homepage', href: '/' },
            { label: 'Our Services', href: '/websites-apps' },
            { label: 'Blog', href: '/blog' },
            { label: 'Contact Us', href: '/contact' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                borderRadius: 100,
                border: '1.5px solid rgba(104, 197, 173, 0.3)',
                color: '#52C9A0',
                fontWeight: 600,
                fontSize: '0.95rem',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/contact"
          style={{
            display: 'inline-block',
            background: '#FF6B2B',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            padding: '14px 32px',
            borderRadius: 100,
            textDecoration: 'none',
          }}
        >
          Get in Touch
        </Link>
      </div>
    </section>
  )
}
