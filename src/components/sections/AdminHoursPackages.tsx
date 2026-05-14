// AdminHoursPackages — reusable 4-card pricing block for the Admin Hours
// retainer ladder + pay-as-you-go fallback. Mirrors the SKUs in
// services_catalog (post-build site maintenance, not marketing).
//
// Hunter directive 2026-05-13: Names = Starter / Growth / Pro / Agency.
// Growth has a "Recommended" badge (sweet-spot conversion target).
// Pay-as-you-go ($50/hr) shown in small print under the cards.
//
// Drop into any service page after the FAQ or before the InquiryStrip:
//   <AdminHoursPackages />
//
// Optional `heading` + `eyebrow` props override the defaults for context-
// specific framing (e.g. "After your WordPress site launches…").

import { ScrollReveal } from '@/components/motion/ScrollReveal'

interface AdminHoursPackagesProps {
  eyebrow?: string
  heading?: string
  intro?: string
}

const PACKAGES = [
  {
    name: 'Starter',
    hours: 4,
    monthly: 100,
    tagline: 'Light maintenance',
    blurb: 'Monthly content tweaks, photo swaps, small bug fixes. The minimum-viable cadence to keep a site healthy.',
    recommended: false,
  },
  {
    name: 'Growth',
    hours: 8,
    monthly: 200,
    tagline: 'Steady updates + small features',
    blurb: 'Monthly content updates, design polish, small feature additions, SEO meta tuning. The sweet-spot for most small businesses.',
    recommended: true,
  },
  {
    name: 'Pro',
    hours: 20,
    monthly: 500,
    tagline: 'Active site, real iteration speed',
    blurb: 'Real momentum — new pages, new features, A/B tests, ongoing redesigns. For businesses actively scaling their web presence.',
    recommended: false,
  },
  {
    name: 'Agency',
    hours: 40,
    monthly: 1000,
    tagline: 'Half-time dev partner',
    blurb: 'A dedicated half-time engineer for your business. New builds, complex features, custom integrations, ongoing strategy.',
    recommended: false,
  },
] as const

export function AdminHoursPackages({
  eyebrow = 'Site maintenance + iteration',
  heading = 'Admin Hours — Updates, Fixes, and New Features',
  intro = 'Anything you\'d otherwise hire a freelancer for — text edits, design tweaks, new pages, bug fixes, small features — at a flat monthly rate. Unused hours expire each month so we both stay busy.',
}: AdminHoursPackagesProps = {}) {
  return (
    <section style={{ background: 'var(--light)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <ScrollReveal direction="up">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{
              display: 'inline-block',
              background: 'rgba(82,201,160,0.12)',
              color: 'var(--teal-dark)',
              padding: '6px 18px',
              borderRadius: 100,
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              {eyebrow}
            </span>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 3.2vw, 2.2rem)',
              fontWeight: 800,
              color: 'var(--dark)',
              lineHeight: 1.2,
              margin: '0 0 14px',
            }}>
              {heading}
            </h2>
            <p style={{
              color: 'var(--slate)',
              fontSize: '1rem',
              lineHeight: 1.6,
              maxWidth: 720,
              margin: '0 auto',
            }}>
              {intro}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <div
            className="admin-hours-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 28,
            }}
          >
            {PACKAGES.map((pkg) => {
              const isRec = pkg.recommended
              return (
                <div
                  key={pkg.name}
                  style={{
                    position: 'relative',
                    background: '#fff',
                    border: isRec ? '2px solid #FF6B2B' : '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '28px 20px 24px',
                    boxShadow: isRec ? '0 8px 28px rgba(255,107,43,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {isRec && (
                    <div style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#FF6B2B',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '4px 14px',
                      borderRadius: 100,
                      whiteSpace: 'nowrap',
                    }}>
                      ★ Recommended
                    </div>
                  )}

                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--dark)',
                    margin: '0 0 4px',
                  }}>
                    {pkg.name}
                  </h3>
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--slate)',
                    marginBottom: 14,
                  }}>
                    {pkg.tagline}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      fontSize: '2.2rem',
                      fontWeight: 800,
                      color: 'var(--dark)',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      ${pkg.monthly}
                      <span style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--slate)',
                      }}>
                        {' '}/mo
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: 'var(--teal-dark)',
                      fontWeight: 600,
                      marginTop: 4,
                    }}>
                      {pkg.hours} hours/month
                    </div>
                  </div>

                  <p style={{
                    fontSize: '0.88rem',
                    color: 'var(--slate)',
                    lineHeight: 1.5,
                    margin: 0,
                    flexGrow: 1,
                  }}>
                    {pkg.blurb}
                  </p>
                </div>
              )
            })}
          </div>
        </ScrollReveal>

        <p style={{
          textAlign: 'center',
          fontSize: '0.88rem',
          color: 'var(--slate)',
          margin: '0 auto',
          maxWidth: 720,
          lineHeight: 1.6,
        }}>
          <strong>Or pay-as-you-go:</strong> $50/hr, no monthly commitment, billed in 15-minute increments.{' '}
          <em>Not included in Admin Hours:</em> marketing campaigns, email newsletters, paid ads, SEO content writing — those are separate services.
        </p>

        <style>{`
          @media (max-width: 900px) {
            .admin-hours-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 540px) {
            .admin-hours-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  )
}
