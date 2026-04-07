import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema, faqSchema } from '@/lib/schema'
import { SITE_URL, BOOKING_URL } from '@/lib/constants'
import { FeatureGrid } from '@/components/ui/FeatureGrid'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { GlassCard } from '@/components/ui/GlassCard'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { SectionHeading, pillStyle } from '@/components/ui/SectionHeading'
import HomeBlogSection from '@/components/sections/HomeBlogSection'
import type { ServiceCategory } from '@/lib/blog'
import Link from 'next/link'

type Feature = { icon: string; title: string; description: string }
type TechRow = { label: string; value: string }
type FAQ = { question: string; answer: string }
type BreadcrumbItem = { name: string; path: string }

export type ServicePageProps = {
  eyebrow: string; titleHtml: React.ReactNode; subtitle: string
  ctaLabel: string; ctaHref?: string; calloutHtml?: React.ReactNode
  breadcrumbs: BreadcrumbItem[]
  schemaName: string; schemaDescription: string; schemaUrl: string
  featuresEyebrow?: string; featuresHeading: string; features: Feature[]
  techEyebrow?: string; techHeading?: string; techDescription?: string; techStack?: TechRow[]
  aiCalloutEyebrow?: string; aiCalloutHeading?: string; aiCalloutText?: string
  faqs: FAQ[]
  serviceCategory?: ServiceCategory
  proofSection?: React.ReactNode
  ctaHeading: string; ctaText: string; ctaPrimaryLabel: string
  ctaPrimaryHref?: string; ctaSecondaryLabel?: string; ctaSecondaryHref?: string
}

/* SVG background shapes — ghost grey geometric shapes inspired by the hero particles */
import { ShapeBg } from '@/components/ui/ShapeBg'

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
      <JsonLd data={breadcrumbSchema(breadcrumbs.map(b => ({ name: b.name, url: `${SITE_URL}${b.path}` })))} />
      {faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}

      <PageHero eyebrow={eyebrow} title={titleHtml} subtitle={subtitle} ctaLabel={ctaLabel} ctaHref={ctaHref} callout={calloutHtml} />

      {/* Features Grid — dot grid bg, hero card + accent cards */}
      <FeatureGrid eyebrow={featuresEyebrow} heading={featuresHeading} features={features} />

      {/* Tech Stack — with SVG shape background */}
      {techStack && techStack.length > 0 && (
        <section style={{ padding: '80px 24px', position: 'relative', background: '#fff' }}>
          <ShapeBg />
          <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
            <ScrollReveal>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
                <div>
                  <span style={pillStyle}>{techEyebrow || 'Our Stack'}</span>
                  <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 20px' }}>
                    {techHeading || 'Built on Technology, Powered by AI'}
                  </h2>
                  {techDescription && (
                    <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>{techDescription}</p>
                  )}
                </div>
                <GlassCard style={{ background: 'rgba(244,246,249,0.9)' }}>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Technology Stack</h3>
                  {techStack.map((row) => (
                    <div key={row.label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(104,197,173,0.08)' }}>
                      <strong style={{ color: 'var(--slate)', minWidth: 110, fontSize: '0.83rem', fontWeight: 600 }}>{row.label}</strong>
                      <span style={{ fontSize: '0.88rem', color: 'var(--dark)' }}>{row.value}</span>
                    </div>
                  ))}
                </GlassCard>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Proof Section */}
      {proofSection && <ScrollReveal>{proofSection}</ScrollReveal>}

      {/* AI Callout — full width dark, single column */}
      {aiCalloutHeading && (
        <section style={{ background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)', padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(104,197,173,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
            <ScrollReveal>
              <span style={pillStyle}>{aiCalloutEyebrow || 'The AI Difference'}</span>
              <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, lineHeight: 1.3, margin: '14px 0 20px' }}>
                {aiCalloutHeading}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontSize: '1rem', margin: '0 0 32px' }}>
                {aiCalloutText}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
                {[
                  'Your site compounds in authority every week — automatically',
                  'AI handles the repetitive work, humans handle the strategy',
                  'Faster results at a fraction of traditional agency cost',
                  'Real-time optimization based on actual search data',
                ].map((bullet) => (
                  <div key={bullet} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(104,197,173,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#68c5ad" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>{bullet}</span>
                  </div>
                ))}
              </div>
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-block', background: '#FF6B2B', color: '#fff', fontWeight: 700,
                padding: '14px 28px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem',
              }}>
                See How This Works for You →
              </a>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Blog Section — same as homepage */}
      <HomeBlogSection />

      {/* FAQ Accordion */}
      {faqs.length > 0 && <FaqAccordion faqs={faqs} />}

      {/* CTA */}
      <section style={{
        background: 'linear-gradient(135deg, #FF6B2B 0%, #ff8f5a 50%, #FF6B2B 100%)',
        padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, marginBottom: 16 }}>
            {ctaHeading}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.65, marginBottom: 32, fontSize: '1.05rem' }}>{ctaText}</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={ctaPrimaryHref} style={{
              background: 'var(--dark)', color: '#fff', fontWeight: 700, padding: '15px 32px',
              borderRadius: 100, textDecoration: 'none', fontSize: '1rem',
            }}>
              {ctaPrimaryLabel}
            </a>
            {ctaSecondaryLabel && (
              <a href={ctaSecondaryHref} style={{
                background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600,
                padding: '15px 32px', borderRadius: 100, textDecoration: 'none',
                border: '2px solid rgba(255,255,255,0.6)', fontSize: '1rem',
              }}>
                {ctaSecondaryLabel}
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export { pillStyle }
