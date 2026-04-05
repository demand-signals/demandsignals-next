export type CityData = {
  slug: string
  name: string
  county: string
  state: string
  population: string
  description: string
  heroTitle: string
  heroSubtitle: string
  nearbyAreas: string[]
  industries: string[]
  stats: Array<{ value: string; label: string }>
  features: Array<{ title: string; description: string }>
  seoDescription: string
  keywords: string[]
}

export const CITIES: CityData[] = [
  {
    slug: 'el-dorado-hills',
    name: 'El Dorado Hills',
    county: 'El Dorado County',
    state: 'CA',
    population: '48,000',
    description:
      'El Dorado Hills is one of the fastest-growing communities in Northern California — an affluent suburb east of Sacramento with a highly educated, high-income population and strong small business ecosystem.',
    heroTitle: 'AI Marketing for El Dorado Hills Businesses',
    heroSubtitle:
      'El Dorado Hills has one of the highest household incomes in California. We help local businesses capture that market with AI-powered websites, local SEO, and automated marketing.',
    nearbyAreas: ['Folsom', 'Shingle Springs', 'Cameron Park', 'Rescue', 'Granite Bay'],
    industries: ['Medical & Dental', 'Real Estate', 'Financial Services', 'Restaurants & Dining', 'Home Services', 'Professional Services'],
    stats: [
      { value: '$120k+', label: 'median household income' },
      { value: '48k', label: 'residents and growing' },
      { value: '3x', label: 'average lead increase our clients see' },
    ],
    features: [
      {
        title: 'Hyper-Local SEO for El Dorado Hills',
        description:
          'We target high-intent searches like "dentist El Dorado Hills" and "HVAC El Dorado Hills CA" — capturing buyers at exactly the moment they\'re ready to call.',
      },
      {
        title: 'AI Websites That Convert EDH Traffic',
        description:
          'El Dorado Hills residents research online before they buy. We build fast, AI-optimized websites that rank in Google and appear in ChatGPT and Perplexity results.',
      },
      {
        title: 'Google Business Profile Domination',
        description:
          'We fully optimize and manage your Google My Business profile so your business appears in the Map Pack for every relevant local search in EDH and surrounding areas.',
      },
      {
        title: 'Automated Review & Reputation Management',
        description:
          'AI agents monitor and respond to reviews 24/7, request reviews from satisfied customers, and build the social proof that EDH consumers rely on.',
      },
    ],
    seoDescription:
      'AI-powered marketing for El Dorado Hills businesses. We build AI websites, run local SEO, deploy AI agent swarms, and automate marketing for businesses in El Dorado Hills, CA.',
    keywords: [
      'AI marketing El Dorado Hills',
      'local SEO El Dorado Hills CA',
      'digital marketing El Dorado Hills',
      'El Dorado Hills marketing agency',
      'AI websites El Dorado Hills',
      'Google My Business El Dorado Hills',
      'demand generation El Dorado Hills',
    ],
  },
  {
    slug: 'folsom',
    name: 'Folsom',
    county: 'Sacramento County',
    state: 'CA',
    population: '82,000',
    description:
      'Folsom is a thriving tech-forward city in Sacramento County — home to Intel, a growing startup scene, and a dense concentration of professional-service businesses serving one of California\'s most affluent suburban populations.',
    heroTitle: 'AI Marketing for Folsom Businesses',
    heroSubtitle:
      'Folsom is growing fast. Competition for local customers is intense. We deploy AI-powered websites, automated SEO, and agent swarms that outpace your competitors around the clock.',
    nearbyAreas: ['El Dorado Hills', 'Granite Bay', 'Roseville', 'Orangevale', 'Sacramento'],
    industries: ['Technology & SaaS', 'Medical & Healthcare', 'Real Estate', 'Restaurants', 'Home Services', 'Legal & Financial'],
    stats: [
      { value: '82k', label: 'residents — rapidly expanding' },
      { value: '$105k+', label: 'median household income' },
      { value: '24/7', label: 'AI agents running for your business' },
    ],
    features: [
      {
        title: 'Local SEO That Beats Every Folsom Competitor',
        description:
          'We identify every high-intent keyword your Folsom competitors are ignoring and build the content, links, and signals to own those rankings.',
      },
      {
        title: 'AI-Powered Lead Generation',
        description:
          'Our AI agent swarms run outreach, follow-up sequences, and review campaigns for Folsom businesses — generating leads while you focus on delivery.',
      },
      {
        title: 'GEO Optimization for AI Search',
        description:
          'When Folsom residents ask ChatGPT, Gemini, or Perplexity for local recommendations, your business needs to appear. We make that happen.',
      },
      {
        title: 'Content That Drives Folsom Traffic',
        description:
          'AI content agents publish city-specific blog posts, service pages, and landing pages that capture every long-tail search in the Folsom market.',
      },
    ],
    seoDescription:
      'AI marketing agency serving Folsom, CA. AI-powered websites, local SEO, GEO optimization, and AI agent swarms for Folsom businesses. 3x leads. Always on.',
    keywords: [
      'AI marketing Folsom CA',
      'local SEO Folsom California',
      'digital marketing Folsom',
      'Folsom marketing agency',
      'AI websites Folsom',
      'SEO agency Folsom CA',
      'lead generation Folsom',
    ],
  },
  {
    slug: 'sacramento',
    name: 'Sacramento',
    county: 'Sacramento County',
    state: 'CA',
    population: '530,000',
    description:
      'Sacramento is California\'s capital and a fiercely competitive market for local businesses. Standing out requires more than a website — it takes 24/7 AI-driven marketing, deep local SEO, and automated systems that keep you visible while your competitors sleep.',
    heroTitle: 'AI Marketing Agency — Sacramento, CA',
    heroSubtitle:
      'Sacramento businesses compete on every front — Google Maps, AI search, social media, and review platforms. We deploy AI agent swarms that win every channel simultaneously.',
    nearbyAreas: ['West Sacramento', 'Elk Grove', 'Rancho Cordova', 'Citrus Heights', 'Roseville', 'Davis'],
    industries: ['Healthcare & Medical', 'Legal Services', 'Restaurants & Food', 'Home Services', 'Real Estate', 'Retail & E-commerce', 'Government Contractors'],
    stats: [
      { value: '530k', label: 'residents — one of CA\'s largest markets' },
      { value: '$72k+', label: 'median household income' },
      { value: '19', label: 'active AI agents running for clients right now' },
    ],
    features: [
      {
        title: 'Dominate Sacramento\'s Competitive Local Search',
        description:
          'Sacramento has over 40,000 businesses. We build the SEO infrastructure — technical, on-page, local citations, and link authority — to put your business at the top of every relevant search.',
      },
      {
        title: 'AI Websites Built for the Sacramento Market',
        description:
          'Fast, beautifully designed websites that rank in Google and convert Sacramento visitors into phone calls, form submissions, and booked appointments.',
      },
      {
        title: 'AI Agent Swarms for Sacramento Businesses',
        description:
          'From content creation to outreach to analytics, our AI agents handle the marketing work that normally takes an entire team — at a fraction of the cost.',
      },
      {
        title: 'Sacramento Neighborhood-Level Targeting',
        description:
          'We build pages and citations targeting every Sacramento neighborhood — Midtown, East Sac, Land Park, Natomas, Oak Park — capturing hyper-local search traffic.',
      },
    ],
    seoDescription:
      'AI marketing agency serving Sacramento, CA. We build AI-powered websites, run local SEO, and deploy AI agent swarms for Sacramento businesses. 3x leads. 14 active clients.',
    keywords: [
      'AI marketing agency Sacramento',
      'local SEO Sacramento CA',
      'digital marketing Sacramento',
      'Sacramento marketing agency',
      'AI websites Sacramento',
      'GEO optimization Sacramento',
      'AI demand generation Sacramento',
    ],
  },
  {
    slug: 'placerville',
    name: 'Placerville',
    county: 'El Dorado County',
    state: 'CA',
    population: '11,000',
    description:
      'Placerville is the county seat of El Dorado County — a historic Gold Rush town with a loyal local economy, a thriving wine country tourism industry, and a tight-knit business community where word of mouth and local search drive most new customers.',
    heroTitle: 'AI Marketing for Placerville Businesses',
    heroSubtitle:
      'Placerville\'s customers search online before they visit. We make sure your business is front and center — in Google, in AI assistants, and on every platform that matters.',
    nearbyAreas: ['El Dorado Hills', 'Cameron Park', 'Diamond Springs', 'Shingle Springs', 'Apple Hill'],
    industries: ['Wine & Tourism', 'Restaurants & Food', 'Home Services', 'Medical & Dental', 'Retail', 'Professional Services'],
    stats: [
      { value: '#1', label: 'county seat of El Dorado County' },
      { value: '3x', label: 'average lead increase for our clients' },
      { value: 'Local', label: 'team based in El Dorado County' },
    ],
    features: [
      {
        title: 'Local SEO That Serves the Foothills Market',
        description:
          'We target Placerville and the broader El Dorado County market — from Apple Hill wine country to the Highway 50 corridor — with hyper-local SEO that captures foothill visitors and residents alike.',
      },
      {
        title: 'AI Websites for Placerville Tourism & Retail',
        description:
          'Whether you\'re a winery, a restaurant, or a home services business, we build websites that attract and convert local searchers and Gold Country tourists.',
      },
      {
        title: 'Google My Business for El Dorado County',
        description:
          'We fully manage and optimize your Google Business Profile to capture the "near me" searches that drive foot traffic and phone calls in Placerville.',
      },
      {
        title: 'Automated Marketing on a Small-Business Budget',
        description:
          'Our AI systems deliver agency-level marketing results without the agency price tag — perfect for Placerville\'s small business community.',
      },
    ],
    seoDescription:
      'AI marketing for Placerville, CA. Local SEO, AI websites, and automated marketing for Placerville businesses in El Dorado County. Locally based team.',
    keywords: [
      'AI marketing Placerville CA',
      'local SEO Placerville',
      'digital marketing Placerville CA',
      'Placerville marketing agency',
      'El Dorado County marketing',
      'Placerville website design',
      'small business marketing Placerville',
    ],
  },
  {
    slug: 'citrus-heights',
    name: 'Citrus Heights',
    county: 'Sacramento County',
    state: 'CA',
    population: '89,000',
    description:
      'Citrus Heights is a dense suburban city in Sacramento County with a large, active consumer base and strong demand for local services. Competition for local search rankings is fierce — businesses that invest in AI marketing consistently outperform those that don\'t.',
    heroTitle: 'AI Marketing for Citrus Heights Businesses',
    heroSubtitle:
      'Citrus Heights has nearly 90,000 residents and intense competition for every local service category. AI-powered marketing is the only way to stay ahead.',
    nearbyAreas: ['Roseville', 'Sacramento', 'Orangevale', 'Fair Oaks', 'Rocklin'],
    industries: ['Medical & Dental', 'Home Services', 'Restaurants', 'Auto Services', 'Legal & Financial', 'Retail'],
    stats: [
      { value: '89k', label: 'Citrus Heights residents' },
      { value: '$65k+', label: 'median household income' },
      { value: '24/7', label: 'AI agents running for your business' },
    ],
    features: [
      {
        title: 'Citrus Heights Local Search Domination',
        description:
          'We capture every "near me" search in Citrus Heights — from "dentist near me" to "plumber Citrus Heights" — with targeted local SEO and Google Business Profile optimization.',
      },
      {
        title: 'AI Content for the Sacramento Suburbs',
        description:
          'AI content agents create and publish city-specific pages and blog posts targeting Citrus Heights keywords your competitors overlook.',
      },
      {
        title: 'Review Generation & Reputation Management',
        description:
          'More 5-star reviews mean more clicks and more trust. Our AI agents automate review requests and responses for Citrus Heights businesses.',
      },
      {
        title: 'Affordable AI Marketing for Local Businesses',
        description:
          'We deliver results that used to require a full marketing team — at a price point designed for independent Citrus Heights businesses.',
      },
    ],
    seoDescription:
      'AI marketing agency for Citrus Heights, CA. Local SEO, AI websites, automated reviews, and AI agent swarms for Citrus Heights businesses.',
    keywords: [
      'AI marketing Citrus Heights',
      'local SEO Citrus Heights CA',
      'digital marketing Citrus Heights',
      'Citrus Heights marketing agency',
      'AI websites Citrus Heights',
      'SEO Citrus Heights California',
    ],
  },
  {
    slug: 'auburn',
    name: 'Auburn',
    county: 'Placer County',
    state: 'CA',
    population: '14,000',
    description:
      'Auburn is Placer County\'s historic county seat — a gateway to the Sierra Nevada with a passionate local community, thriving outdoor recreation economy, and businesses that serve both residents and visitors from the greater Sacramento region.',
    heroTitle: 'AI Marketing for Auburn Businesses',
    heroSubtitle:
      'Auburn\'s businesses serve locals and Sierra foothills visitors alike. We build the AI-powered marketing infrastructure to capture both markets — and convert them.',
    nearbyAreas: ['Rocklin', 'Roseville', 'Lincoln', 'Grass Valley', 'Colfax'],
    industries: ['Outdoor Recreation & Tourism', 'Restaurants & Bars', 'Medical & Dental', 'Home Services', 'Real Estate', 'Retail'],
    stats: [
      { value: 'Placer', label: 'County — one of CA\'s fastest-growing' },
      { value: '3x', label: 'average lead increase for our clients' },
      { value: 'Sierra', label: 'foothills gateway market' },
    ],
    features: [
      {
        title: 'SEO for Auburn\'s Tourism & Recreation Economy',
        description:
          'We capture searches from outdoor recreation enthusiasts, Sierra Nevada visitors, and Auburn residents — building content that ranks for every relevant keyword.',
      },
      {
        title: 'AI Websites for Auburn Businesses',
        description:
          'We build fast, mobile-first websites that rank for Auburn-area keywords and convert visitors into customers — whether they\'re locals or driving through from the Bay Area.',
      },
      {
        title: 'Placer County Local Citations & GMB',
        description:
          'Your Google Business Profile is your most powerful local marketing tool. We fully optimize and actively manage it for maximum visibility across Placer County.',
      },
      {
        title: 'Automated Marketing for Small-Town Businesses',
        description:
          'Our AI systems handle the ongoing marketing work — content, reviews, outreach, analytics — so Auburn business owners can focus on what they do best.',
      },
    ],
    seoDescription:
      'AI marketing agency serving Auburn, CA. Local SEO, AI websites, and AI agent swarms for Auburn and Placer County businesses.',
    keywords: [
      'AI marketing Auburn CA',
      'local SEO Auburn California',
      'digital marketing Auburn Placer County',
      'Auburn marketing agency',
      'AI websites Auburn CA',
      'Placer County marketing agency',
    ],
  },
  {
    slug: 'granite-bay',
    name: 'Granite Bay',
    county: 'Placer County',
    state: 'CA',
    population: '22,000',
    description:
      'Granite Bay is one of California\'s most affluent communities — a high-income enclave in western Placer County where consumers have high expectations and strong purchasing power. Businesses that invest in premium marketing consistently capture this lucrative market.',
    heroTitle: 'AI Marketing for Granite Bay Businesses',
    heroSubtitle:
      'Granite Bay\'s residents are educated, high-income, and research-driven. They discover local businesses through Google, AI assistants, and reviews. We make sure they find yours.',
    nearbyAreas: ['Roseville', 'Rocklin', 'Folsom', 'Lincoln', 'Loomis'],
    industries: ['Medical & Dental', 'Financial & Wealth Management', 'Real Estate', 'Luxury Services', 'Home Improvement', 'Professional Services'],
    stats: [
      { value: '$150k+', label: 'median household income' },
      { value: 'Top 5%', label: 'wealthiest communities in California' },
      { value: '3x', label: 'average ROI increase for our clients' },
    ],
    features: [
      {
        title: 'Premium Local SEO for an Affluent Market',
        description:
          'Granite Bay consumers don\'t shop on price alone — they search for reputation, credentials, and reviews. We build the digital presence that earns their trust.',
      },
      {
        title: 'AI Websites Built for High-Income Clients',
        description:
          'We design and build premium websites that reflect the quality of your service — and rank at the top of Google for every relevant Granite Bay search query.',
      },
      {
        title: 'Reputation Management for Service Professionals',
        description:
          'In Granite Bay, reputation is everything. Our AI agents manage your reviews, respond professionally to every rating, and generate new 5-star reviews automatically.',
      },
      {
        title: 'AI-Powered Outreach to Granite Bay Professionals',
        description:
          'Our outreach agents research high-value prospects in the Granite Bay area, craft personalized messages, and route qualified leads directly to your inbox.',
      },
    ],
    seoDescription:
      'AI marketing agency serving Granite Bay, CA. Premium local SEO, AI websites, and AI-powered marketing for Granite Bay\'s affluent market.',
    keywords: [
      'AI marketing Granite Bay CA',
      'local SEO Granite Bay',
      'digital marketing Granite Bay California',
      'Granite Bay marketing agency',
      'AI websites Granite Bay',
      'Placer County luxury marketing',
      'marketing agency Granite Bay',
    ],
  },
  {
    slug: 'roseville',
    name: 'Roseville',
    county: 'Placer County',
    state: 'CA',
    population: '148,000',
    description:
      'Roseville is the largest city in Placer County and one of the fastest-growing in Northern California. With a booming economy, major retail corridors, and a highly educated workforce, Roseville is one of the most competitive local business markets in the region.',
    heroTitle: 'AI Marketing for Roseville Businesses',
    heroSubtitle:
      'Roseville is one of NorCal\'s most competitive business markets. Winning requires more than a website — it requires AI-powered marketing running 24/7 while your competitors sleep.',
    nearbyAreas: ['Rocklin', 'Granite Bay', 'Citrus Heights', 'Lincoln', 'Folsom', 'Sacramento'],
    industries: ['Retail & E-commerce', 'Medical & Healthcare', 'Technology', 'Real Estate', 'Restaurants', 'Home Services', 'Financial Services'],
    stats: [
      { value: '148k', label: 'residents — Placer County\'s largest city' },
      { value: '$95k+', label: 'median household income' },
      { value: '24/7', label: 'continuous AI marketing operation' },
    ],
    features: [
      {
        title: 'Dominate Roseville\'s Competitive Search Landscape',
        description:
          'Roseville has thousands of businesses competing for the same customers. We build aggressive SEO campaigns that put your business at the top — and keep it there.',
      },
      {
        title: 'AI Websites That Convert Roseville Traffic',
        description:
          'Beautiful, fast, AI-optimized websites built for Roseville\'s tech-savvy consumers — designed to rank in Google and convert visitors into paying customers.',
      },
      {
        title: 'AI Agent Swarms for Roseville Scale',
        description:
          'From content creation to outreach to analytics, our agent swarms handle the marketing volume that a growing Roseville business demands — without the headcount.',
      },
      {
        title: 'GEO Optimization for AI-Assisted Search',
        description:
          'When Roseville shoppers ask AI assistants for recommendations, your business needs to be the answer. We build the entity signals and citation structure to make that happen.',
      },
    ],
    seoDescription:
      'AI marketing agency serving Roseville, CA. Local SEO, AI websites, AI agent swarms, and GEO optimization for Roseville and Placer County businesses.',
    keywords: [
      'AI marketing Roseville CA',
      'local SEO Roseville California',
      'digital marketing Roseville',
      'Roseville marketing agency',
      'AI websites Roseville',
      'GEO optimization Roseville',
      'demand generation Roseville CA',
    ],
  },
  {
    slug: 'south-lake-tahoe',
    name: 'South Lake Tahoe',
    county: 'El Dorado County',
    state: 'CA',
    population: '22,000',
    description:
      'South Lake Tahoe is a world-class mountain destination drawing millions of visitors annually to ski resorts, beaches, casinos, and outdoor adventures. Businesses here must capture both year-round locals and transient high-spending tourists — across every digital channel.',
    heroTitle: 'AI Marketing for South Lake Tahoe Businesses',
    heroSubtitle:
      'South Lake Tahoe draws millions of visitors per year. The businesses that capture them have modern websites, strong Google rankings, and AI systems working around the clock.',
    nearbyAreas: ['Stateline NV', 'Myers', 'Meyers', 'Zephyr Cove', 'Incline Village', 'Truckee'],
    industries: ['Hospitality & Hotels', 'Restaurants & Bars', 'Outdoor Recreation', 'Real Estate', 'Ski & Winter Sports', 'Retail & Vacation Shops'],
    stats: [
      { value: '3M+', label: 'annual visitors to the Tahoe Basin' },
      { value: 'Peak', label: 'both summer and winter tourist seasons' },
      { value: '3x', label: 'average lead increase for our clients' },
    ],
    features: [
      {
        title: 'Tourism SEO for South Lake Tahoe',
        description:
          'We capture the millions of searches tourists make before visiting Tahoe — "best restaurants South Lake Tahoe", "ski rentals Lake Tahoe", "cabin rentals Tahoe" — and route them to your business.',
      },
      {
        title: 'AI Websites for Tahoe Hospitality Businesses',
        description:
          'We build fast, visually stunning websites that rank for Tahoe keywords, integrate booking systems, and convert visitors on mobile — the device most tourists use.',
      },
      {
        title: 'Seasonal AI Marketing That Never Stops',
        description:
          'Our AI agents adapt to ski season, summer beach season, and shoulder seasons — publishing relevant content and running targeted campaigns 365 days a year.',
      },
      {
        title: 'Review Management for Tourist-Dependent Businesses',
        description:
          'Tahoe tourists choose businesses based on reviews. Our AI agents generate 5-star reviews, respond professionally to all feedback, and protect your reputation.',
      },
    ],
    seoDescription:
      'AI marketing agency serving South Lake Tahoe, CA. Tourism SEO, AI websites, and automated marketing for South Lake Tahoe hospitality and local businesses.',
    keywords: [
      'AI marketing South Lake Tahoe',
      'local SEO South Lake Tahoe CA',
      'digital marketing Lake Tahoe',
      'South Lake Tahoe marketing agency',
      'AI websites Lake Tahoe',
      'tourism marketing South Lake Tahoe',
      'El Dorado County marketing agency',
    ],
  },
  {
    slug: 'cameron-park',
    name: 'Cameron Park',
    county: 'El Dorado County',
    state: 'CA',
    population: '20,000',
    description:
      'Cameron Park is a desirable residential community in El Dorado County — a suburban gem between Sacramento and the Sierra foothills with strong disposable income and high demand for professional local services.',
    heroTitle: 'AI Marketing for Cameron Park Businesses',
    heroSubtitle:
      'Cameron Park residents have high incomes and high expectations. We build the AI-powered marketing presence that earns their business and keeps your competitors at bay.',
    nearbyAreas: ['El Dorado Hills', 'Shingle Springs', 'Folsom', 'Rescue', 'Placerville'],
    industries: ['Medical & Dental', 'Real Estate', 'Home Services', 'Professional Services', 'Fitness & Wellness', 'Restaurants'],
    stats: [
      { value: '$95k+', label: 'median household income' },
      { value: 'El Dorado', label: 'County — fastest-growing CA county' },
      { value: '3x', label: 'average lead increase for our clients' },
    ],
    features: [
      {
        title: 'El Dorado County Local SEO',
        description:
          'We target Cameron Park-specific keywords and build the local citation network that puts your business in front of EDH, Cameron Park, and Shingle Springs residents.',
      },
      {
        title: 'AI Websites for Professional Services',
        description:
          'Cameron Park\'s residents hire the best — we build websites that project professionalism, rank in Google, and convert high-value visitors into clients.',
      },
      {
        title: 'Google Maps Optimization for the Foothills Corridor',
        description:
          'Own the Map Pack for every service category in Cameron Park and the surrounding El Dorado County corridor — from Highway 50 to Rescue Road.',
      },
      {
        title: 'AI Agent Swarms for Efficient Growth',
        description:
          'Our AI agents handle content, reviews, outreach, and analytics — giving Cameron Park businesses enterprise-grade marketing without the enterprise budget.',
      },
    ],
    seoDescription:
      'AI marketing agency serving Cameron Park, CA. Local SEO, AI websites, and AI agent swarms for Cameron Park and El Dorado County businesses.',
    keywords: [
      'AI marketing Cameron Park CA',
      'local SEO Cameron Park',
      'digital marketing Cameron Park California',
      'Cameron Park marketing agency',
      'El Dorado Hills Cameron Park SEO',
      'AI websites Cameron Park',
    ],
  },
  {
    slug: 'rocklin',
    name: 'Rocklin',
    county: 'Placer County',
    state: 'CA',
    population: '72,000',
    description:
      'Rocklin is a fast-growing Placer County city with a strong technology sector, top-rated schools, and a highly educated population. The combination of established residents and new housing development creates strong, sustained demand for local services.',
    heroTitle: 'AI Marketing for Rocklin Businesses',
    heroSubtitle:
      'Rocklin is one of Placer County\'s fastest-growing cities. We help local businesses capture new residents and established families with AI-powered marketing that works 24/7.',
    nearbyAreas: ['Roseville', 'Granite Bay', 'Lincoln', 'Auburn', 'Citrus Heights'],
    industries: ['Technology & Software', 'Medical & Healthcare', 'Education', 'Real Estate', 'Home Services', 'Restaurants'],
    stats: [
      { value: '72k', label: 'residents and growing rapidly' },
      { value: '$92k+', label: 'median household income' },
      { value: '24/7', label: 'AI agents running for your business' },
    ],
    features: [
      {
        title: 'Local SEO for Rocklin\'s Growing Market',
        description:
          'New residents need new service providers. We make sure your business is the first one they find when they search for services in Rocklin.',
      },
      {
        title: 'AI Websites That Capture Placer County Searches',
        description:
          'We build optimized websites targeting both Rocklin-specific and broader Placer County searches — maximizing your reach across the region.',
      },
      {
        title: 'Content Marketing for Rocklin Businesses',
        description:
          'AI content agents publish Rocklin-relevant blog posts and service pages that build topical authority and drive organic search traffic month after month.',
      },
      {
        title: 'Automated Review & Lead Nurture Systems',
        description:
          'From initial Google search to booked appointment, our AI systems automate every step of the customer acquisition journey for Rocklin businesses.',
      },
    ],
    seoDescription:
      'AI marketing agency serving Rocklin, CA. Local SEO, AI websites, and AI agent swarms for Rocklin and Placer County businesses.',
    keywords: [
      'AI marketing Rocklin CA',
      'local SEO Rocklin California',
      'digital marketing Rocklin',
      'Rocklin marketing agency',
      'AI websites Rocklin CA',
      'Placer County SEO agency',
    ],
  },
]

export const CITY_SLUGS = CITIES.map((c) => c.slug)

export function getCityBySlug(slug: string): CityData | undefined {
  return CITIES.find((c) => c.slug === slug)
}
