import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/constants'
import { PageHero } from '@/components/sections/PageHero'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
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
  ctaHeading = 'Not Sure Where to Start?',
  ctaText = "Start with a free intelligence report. We'll tell you exactly where your biggest opportunities are — then you decide what to do next.",
  ctaPrimaryLabel = 'Get a Free Report →',
  ctaSecondaryLabel = 'Talk to Us',
  ctaPrimaryHref = '/tools/research-reports',
  ctaSecondaryHref = '/contact',
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

      {/* CTA — hue-shift gradient on scroll */}
      <AnimatedCTA
        heading={ctaHeading}
        text={ctaText}
        primaryLabel={ctaPrimaryLabel}
        primaryHref={ctaPrimaryHref}
        secondaryLabel={ctaSecondaryLabel}
        secondaryHref={ctaSecondaryHref}
      />
    </>
  )
}
