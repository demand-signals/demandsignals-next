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
    "United States",
    "Thailand",
    "Australia",
  ],
  "serviceType": [
    "AI Marketing",
    "SEO",
    "GEO Optimization",
    "Website Design",
    "AI Agents",
    "Workflow Automation",
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Demand Signals Services",
    "itemListElement": [
      {
        "@type": "OfferCatalog",
        "name": "Websites & Apps",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "WordPress Development", "url": "https://demandsignals.co/websites-apps/wordpress-development" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "React & Next.js Web Apps", "url": "https://demandsignals.co/websites-apps/react-next-webapps" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "iOS & Android Apps", "url": "https://demandsignals.co/websites-apps/mobile-apps" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Vibe Coded Web Apps", "url": "https://demandsignals.co/websites-apps/vibe-coded" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "UI/UX Design", "url": "https://demandsignals.co/websites-apps/design" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Agent & App Hosting", "url": "https://demandsignals.co/websites-apps/hosting" } },
        ],
      },
      {
        "@type": "OfferCatalog",
        "name": "Demand Generation",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "GEO/AEO/LLM Optimization", "url": "https://demandsignals.co/demand-generation/geo-aeo-llm-optimization" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Local SEO", "url": "https://demandsignals.co/demand-generation/local-seo" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Geo-Targeting", "url": "https://demandsignals.co/demand-generation/geo-targeting" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Google Business Profile Admin", "url": "https://demandsignals.co/demand-generation/gbp-admin" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Demand Gen Systems", "url": "https://demandsignals.co/demand-generation/systems" } },
        ],
      },
      {
        "@type": "OfferCatalog",
        "name": "Content & Social",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Content Generation", "url": "https://demandsignals.co/content-social/ai-content-generation" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Social Media Management", "url": "https://demandsignals.co/content-social/ai-social-media-management" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Review Auto Responders", "url": "https://demandsignals.co/content-social/ai-review-auto-responders" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Auto Blogging", "url": "https://demandsignals.co/content-social/ai-auto-blogging" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Content Repurposing", "url": "https://demandsignals.co/content-social/ai-content-repurposing" } },
        ],
      },
      {
        "@type": "OfferCatalog",
        "name": "AI & Agent Services",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Adoption Strategies", "url": "https://demandsignals.co/ai-services/ai-automation-strategies" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Workforce Automation", "url": "https://demandsignals.co/ai-services/ai-workforce-automation" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Agent Infrastructure", "url": "https://demandsignals.co/ai-services/ai-agent-infrastructure" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Automated Outreach", "url": "https://demandsignals.co/ai-services/ai-automated-outreach" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Agent Swarms", "url": "https://demandsignals.co/ai-services/ai-agent-swarms" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Private LLMs", "url": "https://demandsignals.co/ai-services/private-llms" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "AI Clawbot Setup", "url": "https://demandsignals.co/ai-services/clawbot-setup" } },
        ],
      },
    ],
  },
  "sameAs": SOCIAL_PROFILES,
  "knowsAbout": [
    "Artificial Intelligence",
    "Search Engine Optimization",
    "Web Development",
    "AI Agents",
    "Generative Engine Optimization",
    "Local SEO",
    "Content Generation",
    "Answer Engine Optimization",
    "LLM Optimization",
    "WordPress Development",
    "React Development",
    "Next.js",
    "Mobile App Development",
    "AI Content Generation",
    "Social Media Management",
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
