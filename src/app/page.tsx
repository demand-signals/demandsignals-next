import type { Metadata } from 'next'
import { HeroCanvas } from '@/components/sections/HeroCanvas'
import { StatsBar } from '@/components/sections/StatsBar'
import { ServicesGrid } from '@/components/sections/ServicesGrid'
import ReplacesGrid from '@/components/sections/ReplacesGrid'
import ProofTable from '@/components/sections/ProofTable'
import IndustriesGrid from '@/components/sections/IndustriesGrid'
import HowItWorks from '@/components/sections/HowItWorks'
import PortfolioGrid from '@/components/sections/PortfolioGrid'
import BookingSection from '@/components/sections/BookingSection'
import ReportsCallout from '@/components/sections/ReportsCallout'
import CtaBand from '@/components/sections/CtaBand'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqSchema } from '@/lib/schema'

export const metadata: Metadata = {
  title: 'Demand Signals — AI-Powered Websites. AI-Driven Marketing. Always On.',
  description:
    'We build AI-powered websites and run AI-driven marketing for local businesses in Northern California. Top 3 Google ranking in 90 days. 10× more leads from the same ad spend. AI replaces your SEO agency, social media manager, and web developer — at a fraction of the cost.',
  keywords: [
    'AI marketing agency Northern California',
    'AI demand generation',
    'local SEO El Dorado County',
    'AI agent swarms',
    'GEO optimization',
    'generative engine optimization',
    'AI websites Sacramento',
    'automated marketing local business',
    'AI outreach agency',
    'Placerville marketing agency',
  ],
  openGraph: {
    title: 'Demand Signals — AI-Powered Websites. AI-Driven Marketing. Always On.',
    description:
      'AI agent swarms, AI-powered websites, and automated marketing for local businesses. 10× more leads. Top 3 Google ranking in 90 days. Always on.',
    url: 'https://demandsignals.co',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Demand Signals — AI-Powered Demand Generation' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Demand Signals — AI-Powered Demand Generation',
    description: 'AI agents + AI websites + automated marketing for local businesses. 10× more leads. Top 3 Google ranking in 90 days.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://demandsignals.co' },
}

const homeFaqSchema = faqSchema([
  {
    question: 'What is AI demand generation for local businesses?',
    answer:
      'AI demand generation uses artificial intelligence — including AI agent swarms, automated content creation, and generative engine optimization — to attract, capture, and convert local customers across Google, AI assistants like ChatGPT, and social media. Demand Signals specializes in deploying these systems for local businesses in Northern California.',
  },
  {
    question: 'What is GEO or Generative Engine Optimization?',
    answer:
      'Generative Engine Optimization (GEO) is the practice of optimizing your business to appear in AI-generated answers from tools like ChatGPT, Gemini, and Perplexity. This includes entity optimization, structured data markup, AI-friendly content structure, and citation building — all signals that help AI assistants trust and recommend your business.',
  },
  {
    question: 'How much does Demand Signals cost?',
    answer:
      'Demand Signals offers custom pricing based on the services you need — AI websites, local SEO, AI agent swarms, or a full-stack demand generation retainer. Book a free 15-minute call for a no-obligation quote scoped to your specific business and market.',
  },
  {
    question: 'What areas does Demand Signals serve?',
    answer:
      'Demand Signals primarily serves local businesses in El Dorado County (Placerville, El Dorado Hills, Cameron Park), Sacramento, Folsom, Placer County, and across Northern California. We work remotely with businesses throughout California.',
  },
  {
    question: 'How is Demand Signals different from a traditional marketing agency?',
    answer:
      'Unlike traditional agencies that rely on manual labor, Demand Signals deploys AI agent swarms that run 24/7 — handling content creation, SEO monitoring, outreach, review management, and reporting automatically. This means faster results, lower cost, and continuous optimization without the overhead of a large marketing team.',
  },
])

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeFaqSchema} />
      <HeroCanvas />
      <StatsBar />
      <ServicesGrid />
      <ReplacesGrid />
      <ProofTable />
      <IndustriesGrid />
      <HowItWorks />
      <PortfolioGrid />
      <BookingSection />
      <ReportsCallout />
      <CtaBand />
    </>
  )
}
