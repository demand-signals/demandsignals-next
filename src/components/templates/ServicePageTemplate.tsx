import { PageHero } from '@/components/sections/PageHero'
import { BlogPostMarquee } from '@/components/blog/BlogPostMarquee'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema, faqSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/constants'
import type { ServiceCategory } from '@/lib/blog'

type Feature = {
  icon: string
  title: string
  description: string
}

type TechRow = {
  label: string
  value: string
}

type FAQ = {
  question: string
  answer: string
}

type BreadcrumbItem = {
  name: string
  path: string
}

export type ServicePageProps = {
  /* Hero */
  eyebrow: string
  titleHtml: React.ReactNode
  subtitle: string
  ctaLabel: string
  ctaHref?: string
  calloutHtml?: React.ReactNode

  /* Breadcrumb */
  breadcrumbs: BreadcrumbItem[]

  /* Schema */
  schemaName: string
  schemaDescription: string
  schemaUrl: string

  /* Features grid */
  featuresEyebrow?: string
  featuresHeading: string
  features: Feature[]

  /* Tech stack (optional) */
  techEyebrow?: string
  techHeading?: string
  techDescription?: string
  techStack?: TechRow[]

  /* AI callout (optional) */
  aiCalloutEyebrow?: string
  aiCalloutHeading?: string
  aiCalloutText?: string

  /* FAQ */
  faqs: FAQ[]

  /* Blog */
  serviceCategory?: ServiceCategory

  /* Custom proof section (renders before CTA) */
  proofSection?: React.ReactNode

  /* CTA */
  ctaHeading: string
  ctaText: string
  ctaPrimaryLabel: string
  ctaPrimaryHref?: string
  ctaSecondaryLabel?: string
  ctaSecondaryHref?: string
}

export function ServicePageTemplate({
  eyebrow, titleHtml, subtitle, ctaLabel, ctaHref = '/contact', calloutHtml,
  breadcrumbs, schemaName, schemaDescription, schemaUrl,
  featuresEyebrow = 'What We Deliver', featuresHeading, features,
  techEyebrow, techHeading, techDescription, techStack,
  aiCalloutEyebrow, aiCalloutHeading, aiCalloutText,
  faqs, serviceCategory, proofSection,
  ctaHeading, ctaText, ctaPrimaryLabel, ctaPrimaryHref = '/contact',
  ctaSecondaryLabel = 'See Portfolio', ctaSecondaryHref = '/portfolio',
}: ServicePageProps) {
  return (
    <>
      <JsonLd data={serviceSchema(schemaName, schemaDescription, `${SITE_URL}${schemaUrl}`)} />
      <JsonLd data={breadcrumbSchema(
        breadcrumbs.map(b => ({ name: b.name, url: `${SITE_URL}${b.path}` }))
      )} />
      {faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}

      <PageHero
        eyebrow={eyebrow}
        title={titleHtml}
        subtitle={subtitle}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
        callout={calloutHtml}
      />

      {/* Freshness indicator */}
      <div style={{ background: 'var(--light)', padding: '16px 24px 0', textAlign: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--slate)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Last updated April 2026
        </span>
      </div>

      {/* Features Grid */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <span style={pillStyle}>{featuresEyebrow}</span>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 0' }}>
              {featuresHeading}
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {features.map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.93rem', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack (optional) */}
      {techStack && techStack.length > 0 && (
        <section style={{ background: '#fff', padding: '72px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
              <div>
                <span style={pillStyle}>{techEyebrow || 'Our Stack'}</span>
                <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 20px' }}>
                  {techHeading || 'Built on Technology, Powered by AI'}
                </h2>
                {techDescription && (
                  <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
                    {techDescription}
                  </p>
                )}
              </div>
              <div style={{ background: 'var(--light)', borderRadius: 20, padding: '36px' }}>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Technology Stack</h3>
                <div style={{ display: 'grid', gap: 0 }}>
                  {techStack.map((row) => (
                    <div key={row.label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #e8ecf0' }}>
                      <strong style={{ color: 'var(--slate)', minWidth: 110, fontSize: '0.83rem', fontWeight: 600 }}>{row.label}</strong>
                      <span style={{ fontSize: '0.88rem', color: 'var(--dark)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* AI Callout (optional) */}
      {aiCalloutHeading && (
        <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)', borderRadius: 20, padding: '48px 52px', border: '1px solid rgba(82,201,160,0.2)' }}>
              <span style={pillStyle}>{aiCalloutEyebrow || 'The AI Difference'}</span>
              <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, lineHeight: 1.3, margin: '14px 0 16px' }}>
                {aiCalloutHeading}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
                {aiCalloutText}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Blog Marquee */}
      {serviceCategory && <BlogPostMarquee serviceCategory={serviceCategory} />}

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section style={{ background: '#fff', padding: '72px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={pillStyle}>FAQ</span>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 0' }}>
                Frequently Asked Questions
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {faqs.map((faq) => (
                <div key={faq.question} style={{ background: 'var(--light)', borderRadius: 14, padding: '24px 28px' }}>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 10, lineHeight: 1.4 }}>
                    {faq.question}
                  </h3>
                  <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.7, margin: 0 }}>
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Proof Section (page-specific) */}
      {proofSection}

      {/* CTA */}
      <section style={{ background: '#FF6B2B', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, marginBottom: 16 }}>
            {ctaHeading}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, marginBottom: 28 }}>
            {ctaText}
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={ctaPrimaryHref} style={{ background: 'var(--dark)', color: '#fff', fontWeight: 700, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem' }}>
              {ctaPrimaryLabel}
            </a>
            {ctaSecondaryLabel && (
              <a href={ctaSecondaryHref} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
                {ctaSecondaryLabel}
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

const pillStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'rgba(104, 197, 173, 0.12)',
  color: 'var(--teal)',
  padding: '6px 18px',
  borderRadius: 100,
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
}
