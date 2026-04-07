import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema, faqSchema } from '@/lib/schema'
import { SITE_URL, BOOKING_URL } from '@/lib/constants'
import { FeatureShowcase } from '@/components/sections/FeatureShowcase'
import { StatsCounter } from '@/components/sections/StatsCounter'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { GlassCard } from '@/components/ui/GlassCard'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { SectionHeading, pillStyle } from '@/components/ui/SectionHeading'
import HomeBlogSection from '@/components/sections/HomeBlogSection'
import { AnimatedTechStack } from '@/components/sections/AnimatedTechStack'
import { AnimatedAICallout } from '@/components/sections/AnimatedAICallout'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
import type { ServiceCategory } from '@/lib/blog'
import Link from 'next/link'

type Feature = { icon: string; title: string; description: string }
type TechRow = { label: string; value: string }
type FAQ = { question: string; answer: string }
type BreadcrumbItem = { name: string; path: string }
type Stat = { value: number; suffix?: string; prefix?: string; label: string }

export type ServicePageProps = {
  eyebrow: string; titleHtml: React.ReactNode; subtitle: string
  ctaLabel: string; ctaHref?: string; calloutHtml?: React.ReactNode
  breadcrumbs: BreadcrumbItem[]
  schemaName: string; schemaDescription: string; schemaUrl: string
  featuresEyebrow?: string; featuresHeading: string; features: Feature[]
  stats?: Stat[]
  techEyebrow?: string; techHeading?: string; techDescription?: string; techStack?: TechRow[]
  aiCalloutEyebrow?: string; aiCalloutHeading?: string; aiCalloutText?: string
  aiCalloutBullets?: string[]
  faqs: FAQ[]
  serviceCategory?: ServiceCategory
  proofSection?: React.ReactNode
  ctaHeading: string; ctaText: string; ctaPrimaryLabel: string
  ctaPrimaryHref?: string; ctaSecondaryLabel?: string; ctaSecondaryHref?: string
}

export function ServicePageTemplate({
  eyebrow, titleHtml, subtitle, ctaLabel, ctaHref = '/contact', calloutHtml,
  breadcrumbs, schemaName, schemaDescription, schemaUrl,
  featuresEyebrow = 'What We Deliver', featuresHeading, features,
  stats,
  techEyebrow, techHeading, techDescription, techStack,
  aiCalloutEyebrow, aiCalloutHeading, aiCalloutText, aiCalloutBullets,
  faqs, serviceCategory, proofSection,
  ctaHeading, ctaText, ctaPrimaryLabel, ctaPrimaryHref = '/contact',
  ctaSecondaryLabel = 'See Portfolio', ctaSecondaryHref = '/portfolio',
}: ServicePageProps) {
  return (
    <>
      <JsonLd data={serviceSchema(schemaName, schemaDescription, `${SITE_URL}${schemaUrl}`)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs.map(b => ({ name: b.name, url: `${SITE_URL}${b.path}` })))} />
      {faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}

      {/* 1. Hero — parallax depth + spring text */}
      <PageHero eyebrow={eyebrow} title={titleHtml} subtitle={subtitle} ctaLabel={ctaLabel} ctaHref={ctaHref} callout={calloutHtml} />

      {/* 2. Feature Showcase — scroll-pinned carousel */}
      <FeatureShowcase eyebrow={featuresEyebrow} heading={featuresHeading} features={features} />

      {/* 3. Stats Counter — animated numbers (optional) */}
      {stats && stats.length > 0 && <StatsCounter stats={stats} />}

      {/* 4. Tech Stack — stagger reveal with shape bg */}
      {techStack && techStack.length > 0 && (
        <AnimatedTechStack
          eyebrow={techEyebrow}
          heading={techHeading}
          description={techDescription}
          techStack={techStack}
        />
      )}

      {/* 5. Proof Section */}
      {proofSection && <ScrollReveal>{proofSection}</ScrollReveal>}

      {/* 6. AI Callout — dark with animated reveals */}
      {aiCalloutHeading && (
        <AnimatedAICallout
          eyebrow={aiCalloutEyebrow}
          heading={aiCalloutHeading}
          text={aiCalloutText}
          bullets={aiCalloutBullets}
        />
      )}

      {/* 7. Blog Section */}
      <HomeBlogSection />

      {/* 8. FAQ — alternating slide-in */}
      {faqs.length > 0 && <FaqAccordion faqs={faqs} />}

      {/* 9. CTA — gradient shift on scroll */}
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

export { pillStyle }
