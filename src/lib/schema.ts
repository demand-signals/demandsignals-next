export const orgSchema = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness", "ProfessionalService"],
  "@id": "https://demandsignals.co/#organization",
  "name": "Demand Signals",
  "url": "https://demandsignals.co",
  "logo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a7735995dcd2da251c8bf7/efdd5a396_dsig_q2y25_logo_v2b.png",
  "description": "AI-powered demand generation agency specializing in AI agent swarms, AI websites, local SEO, and generative engine optimization for local businesses.",
  "telephone": "+1-916-542-2423",
  "email": "DemandSignals@gmail.com",
  "areaServed": [
    "El Dorado County, CA",
    "Sacramento, CA",
    "Placer County, CA",
    "Northern California",
  ],
  "serviceType": [
    "AI Marketing",
    "SEO",
    "GEO Optimization",
    "Website Design",
    "AI Agents",
    "Workflow Automation",
  ],
  "sameAs": [],
  "knowsAbout": [
    "Generative Engine Optimization",
    "AI Agents",
    "Local SEO",
    "LLM Optimization",
    "Answer Engine Optimization",
  ],
}

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://demandsignals.co/#website",
  "url": "https://demandsignals.co",
  "name": "Demand Signals",
  "publisher": { "@id": "https://demandsignals.co/#organization" },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://demandsignals.co/blog?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
}

export function serviceSchema(
  name: string,
  description: string,
  url: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "description": description,
    "url": url,
    "provider": { "@id": "https://demandsignals.co/#organization" },
    "areaServed": "Northern California",
  }
}

export function breadcrumbSchema(
  items: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url,
    })),
  }
}

export function faqSchema(
  questions: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": questions.map((q) => ({
      "@type": "Question",
      "name": q.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": q.answer,
      },
    })),
  }
}

export function howToSchema(
  name: string,
  description: string,
  steps: Array<{ name: string; text: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    "step": steps.map((s) => ({
      "@type": "HowToStep",
      "name": s.name,
      "text": s.text,
    })),
  }
}
