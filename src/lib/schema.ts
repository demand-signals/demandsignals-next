export const SOCIAL_PROFILES = [
  "https://x.com/DemandSignalsCo",
  "https://www.instagram.com/DemandSignalsAgency",
  "https://www.facebook.com/DemandSignals/",
  "https://www.tiktok.com/@demandsignals",
  "https://www.youtube.com/@DemandSignals",
  "https://www.pinterest.com/demandsignals/",
  "https://www.linkedin.com/company/demandsignals",
  "https://business.facebook.com/latest/?asset_id=644594372062209&business_id=1334671154244756",
]

export const orgSchema = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness", "ProfessionalService"],
  "@id": "https://demandsignals.co/#organization",
  "name": "Demand Signals",
  "url": "https://demandsignals.co",
  "logo": "https://demandsignals.co/logo.png",
  "image": "https://demandsignals.co/logo.png",
  "description": "AI-powered demand generation agency specializing in AI agent swarms, AI websites, local SEO, and generative engine optimization for local businesses.",
  "telephone": "+1-916-542-2423",
  "email": "DemandSignals@gmail.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "5170 Golden Foothills Pkwy",
    "addressLocality": "El Dorado Hills",
    "addressRegion": "CA",
    "postalCode": "95762",
    "addressCountry": "US",
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 38.6621,
    "longitude": -121.0530,
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "10:00",
    "closes": "20:00",
  },
  "priceRange": "$",
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
  "sameAs": SOCIAL_PROFILES,
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
    "areaServed": [
      { "@type": "State", "name": "California" },
      { "@type": "AdministrativeArea", "name": "El Dorado County, CA" },
      { "@type": "AdministrativeArea", "name": "Sacramento County, CA" },
      { "@type": "AdministrativeArea", "name": "Placer County, CA" },
      { "@type": "AdministrativeArea", "name": "Amador County, CA" },
      { "@type": "AdministrativeArea", "name": "Nevada County, CA" },
    ],
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
