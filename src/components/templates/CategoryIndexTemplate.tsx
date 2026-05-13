// CategoryIndexTemplate — index page for a category (e.g. /websites-apps).
// CTA note 2026-05-13: trailing AnimatedCTA removed; the global
// InquiryStrip handles end-of-page conversion. cta* props remain
// accepted for backward-compat but silently ignored.

import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/constants'
import { PageHero } from '@/components/sections/PageHero'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedServiceCards } from '@/components/sections/AnimatedServiceCards'

type ServiceCard = {
  icon: string
  href: string
  title: string
  description: string
  features: string[]
}

type FAQ = {
  question: string
  answer: string
}

export type CategoryIndexProps = {
  eyebrow: string
  titleHtml: React.ReactNode
  subtitle: string
  calloutHtml?: React.ReactNode
  services: ServiceCard[]
  faqs: FAQ[]
  breadcrumbName: string
  breadcrumbPath: string
  ctaHeading?: string
  ctaText?: string
  ctaPrimaryLabel?: string
  ctaSecondaryLabel?: string
  ctaPrimaryHref?: string
  ctaSecondaryHref?: string
}

export function CategoryIndexTemplate({
  eyebrow, titleHtml, subtitle, calloutHtml,
  services, faqs,
  breadcrumbName, breadcrumbPath,
  // cta* props accepted for backward-compat but no longer rendered.
}: CategoryIndexProps) {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: breadcrumbName, url: `${SITE_URL}${breadcrumbPath}` },
      ])} />
      {faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}

      {/* Particle Hero with parallax */}
      <PageHero
        eyebrow={eyebrow}
        title={titleHtml}
        subtitle={subtitle}
        callout={calloutHtml}
      />

      {/* Service Cards — stagger-animated on scroll */}
      <section style={{ background: 'var(--light)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <AnimatedServiceCards services={services} />
        </div>
      </section>

      {/* FAQ — animated accordion */}
      {faqs.length > 0 && <FaqAccordion faqs={faqs} />}

      {/* End-of-page CTA is rendered globally via InquiryStrip in
          root layout.tsx — no duplicate CTA here. */}
    </>
  )
}
