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
  /** Local landmarks, business parks, shopping centers, neighborhoods — for natural localization in LTP copy */
  localTerms: string[]
  geo: { lat: number; lng: number }
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
      'El Dorado Hills is one of Northern California\'s fastest-growing business markets. We help local businesses capture that demand with AI-powered websites, local SEO, and automated marketing.',
    nearbyAreas: ['Folsom', 'Shingle Springs', 'Cameron Park', 'Rescue', 'Granite Bay'],
    industries: ['Medical & Dental', 'Real Estate', 'Financial Services', 'Restaurants & Dining', 'Home Services', 'Professional Services'],
    localTerms: ['Town Center', 'Serrano', 'Blackstone', 'Promontory', 'Silva Valley Parkway', 'Ridgeview', 'Latrobe Road Corridor', 'Lake Forest'],
    geo: { lat: 38.6857, lng: -121.0822 },
    stats: [
      { value: '2,400+', label: 'local businesses' },
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
    localTerms: ['Palladio', 'Historic Sutter Street', 'Folsom Premium Outlets', 'Folsom Lake', 'Broadstone', 'Empire Ranch', 'Folsom Ranch', 'East Bidwell Corridor'],
    geo: { lat: 38.6780, lng: -121.1761 },
    stats: [
      { value: '82k', label: 'residents — rapidly expanding' },
      { value: '3,800+', label: 'local businesses' },
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
    slug: 'elk-grove',
    name: 'Elk Grove',
    county: 'Sacramento County',
    state: 'CA',
    population: '176,000',
    description:
      'Elk Grove is the second-largest city in Sacramento County and one of the most diverse communities in California. With a population of 176,000, top-rated schools, and a rapidly expanding commercial corridor, Elk Grove represents a massive consumer market with intense competition for local services — and enormous upside for businesses that invest in AI-powered marketing.',
    heroTitle: 'AI Marketing Agency — Elk Grove, CA',
    heroSubtitle:
      'Elk Grove is one of the largest and fastest-growing cities in the Sacramento region. With 176,000 residents and fierce local competition, AI-powered marketing is the only way to stand out.',
    nearbyAreas: ['Sacramento', 'Laguna', 'Lodi', 'Galt', 'Rancho Cordova', 'Folsom'],
    industries: ['Medical & Healthcare', 'Restaurants & Food', 'Home Services', 'Real Estate', 'Auto Services', 'Retail & Shopping', 'Education & Tutoring'],
    localTerms: ['Old Town Elk Grove', 'Laguna Crossroads', 'Laguna Ridge', 'East Franklin', 'Sheldon', 'Elk Grove Boulevard', 'Laguna West', 'District 56'],
    geo: { lat: 38.4388, lng: -121.3819 },
    stats: [
      { value: '176k', label: 'residents — 2nd largest in Sac County' },
      { value: '4,200+', label: 'local businesses' },
      { value: '24/7', label: 'AI agents running for your business' },
    ],
    features: [
      {
        title: 'Dominate Elk Grove\'s Massive Local Market',
        description:
          'With 176,000 residents, Elk Grove is larger than many standalone cities. We build the SEO infrastructure to capture every high-intent local search — from "dentist Elk Grove" to "HVAC near me."',
      },
      {
        title: 'AI Websites Built for Sacramento\'s Suburbs',
        description:
          'Elk Grove residents research online before they buy. We build fast, AI-optimized websites that rank in Google and convert local traffic into booked appointments and phone calls.',
      },
      {
        title: 'Multi-Cultural Market Targeting',
        description:
          'Elk Grove is one of California\'s most diverse cities. Our AI systems build content and targeting strategies that reach every demographic segment in this vibrant market.',
      },
      {
        title: 'AI Agent Swarms for Elk Grove Scale',
        description:
          'From content creation to review management to outreach, our AI agents handle the marketing volume that a competitive Elk Grove market demands — without the headcount.',
      },
    ],
    seoDescription:
      'AI marketing agency serving Elk Grove, CA. Local SEO, AI websites, GEO optimization, and AI agent swarms for Elk Grove and Sacramento County businesses. 176,000 residents.',
    keywords: [
      'AI marketing Elk Grove CA',
      'local SEO Elk Grove California',
      'digital marketing Elk Grove',
      'Elk Grove marketing agency',
      'AI websites Elk Grove',
      'Sacramento County marketing Elk Grove',
      'demand generation Elk Grove CA',
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
    localTerms: ['Midtown', 'Downtown Sacramento', 'East Sacramento', 'Arden-Arcade', 'Natomas', 'Land Park', 'Old Sacramento Waterfront', 'Oak Park'],
    geo: { lat: 38.5816, lng: -121.4944 },
    stats: [
      { value: '530k', label: 'residents — one of CA\'s largest markets' },
      { value: '42,000+', label: 'local businesses' },
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
    localTerms: ['Main Street Placerville', 'Hangtown', 'Bell Tower', 'Gold Bug Park', 'Placerville Drive Corridor', 'Apple Hill', 'Historic Downtown', 'El Dorado Trail'],
    geo: { lat: 38.7296, lng: -120.7986 },
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
    localTerms: ['Sunrise Mall', 'Sunrise MarketPlace', 'Sunrise Boulevard Corridor', 'Greenback Lane', 'Birdcage Heights', 'Rusch Park', 'Stock Ranch', 'Sylvan Corners'],
    geo: { lat: 38.7071, lng: -121.2811 },
    stats: [
      { value: '89k', label: 'Citrus Heights residents' },
      { value: '2,800+', label: 'local businesses' },
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
    localTerms: ['Old Town Auburn', 'Auburn State Recreation Area', 'Bell Road', 'Foresthill Road', 'Auburn-Folsom Road Corridor', 'Elm Avenue', 'Placer County Courthouse', 'Highway 49 Corridor'],
    geo: { lat: 38.8966, lng: -121.0769 },
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
    localTerms: ['Folsom Lake State Recreation Area', 'Douglas Boulevard Corridor', 'Granite Bay Town Center', 'The Marketplace at Granite Bay', 'Granite Bay Village', 'Country Gables Shopping Center', 'Cavitt Stallman Road', 'Los Lagos'],
    geo: { lat: 38.7425, lng: -121.1745 },
    stats: [
      { value: '1,200+', label: 'local businesses' },
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
    localTerms: ['Westfield Galleria at Roseville', 'The Fountains at Roseville', 'Creekside Town Center', 'Historic Downtown Roseville', 'Fiddyment Ranch', 'Woodcreek', 'Blue Oaks Boulevard', 'Diamond Oaks'],
    geo: { lat: 38.7521, lng: -121.2880 },
    stats: [
      { value: '148k', label: 'residents — Placer County\'s largest city' },
      { value: '6,500+', label: 'local businesses' },
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
    localTerms: ['The Shops at Heavenly Village', 'Stateline', 'South Y', 'Al Tahoe', 'Tahoe Keys', 'Bijou', 'Ski Run Boulevard', 'Lake Tahoe Boulevard'],
    geo: { lat: 38.9332, lng: -119.9844 },
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
      'Cameron Park residents are digitally savvy and research-driven. We build the AI-powered marketing presence that earns their business and keeps your competitors at bay.',
    nearbyAreas: ['El Dorado Hills', 'Shingle Springs', 'Folsom', 'Rescue', 'Placerville'],
    industries: ['Medical & Dental', 'Real Estate', 'Home Services', 'Professional Services', 'Fitness & Wellness', 'Restaurants'],
    localTerms: ['Cameron Park Drive', 'Cameron Park Lake', 'Cameron Park Airpark', 'Burke Junction', 'Coach Lane', 'Cameron Park Country Club', 'Highway 50 Corridor', 'Bass Lake Road'],
    geo: { lat: 38.6688, lng: -120.9872 },
    stats: [
      { value: '2,600+', label: 'local businesses' },
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
    localTerms: ['Rocklin Crossings', 'Rocklin Commons', 'Stanford Ranch', 'Whitney Oaks', 'Quarry Park Adventures', 'Sierra College Boulevard', 'Blue Oaks Town Center', 'Sunset Whitney'],
    geo: { lat: 38.7908, lng: -121.2358 },
    stats: [
      { value: '72k', label: 'residents and growing rapidly' },
      { value: '2,600+', label: 'local businesses' },
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
  {
    slug: 'lincoln',
    name: 'Lincoln',
    county: 'Placer County',
    state: 'CA',
    population: '51,000',
    description: 'Lincoln is one of California\'s fastest-growing cities — a booming Placer County community with thousands of new residents arriving every year, strong family demographics, and surging demand for every local service category. Businesses that invest in AI marketing now establish dominant positions before the market saturates.',
    heroTitle: 'AI Marketing for Lincoln Businesses',
    heroSubtitle: 'Lincoln is growing at one of the fastest rates in California. New residents need new service providers — and the businesses that invest in AI marketing capture them first.',
    nearbyAreas: ['Roseville', 'Rocklin', 'Auburn', 'Wheatland', 'Penryn'],
    industries: ['Home Services', 'Medical & Dental', 'Real Estate', 'Restaurants', 'Retail', 'Professional Services'],
    localTerms: ['Twelve Bridges', 'Lincoln Crossing', 'Sun City Lincoln Hills', 'Downtown Lincoln', 'Village at Twelve Bridges', 'Ferrari Ranch Road', 'Joiner Parkway', 'Catta Verdera'],
    geo: { lat: 38.8916, lng: -121.2930 },
    stats: [
      { value: '51k', label: 'residents — one of CA\'s fastest-growing cities' },
      { value: '1,900+', label: 'local businesses' },
      { value: '3x', label: 'average lead increase for our clients' },
    ],
    features: [
      { title: 'First-Mover SEO in a Fast-Growing Market', description: 'Lincoln is growing faster than most agencies can keep up. We help local businesses establish dominant search positions before competitors realize what\'s happening.' },
      { title: 'AI Websites for New Community Development', description: 'Lincoln\'s new residents are digital-first — they discover services online before they arrive. We build the AI-powered web presence that captures them at the moment of need.' },
      { title: 'New Resident Targeting & Outreach', description: 'Our AI agents identify and target new Lincoln residents with outreach campaigns designed to establish your business as their go-to provider from day one in their new home.' },
      { title: 'Full-Stack Local SEO for Placer County Growth', description: 'We build the citation network, GBP optimization, and content infrastructure to own Lincoln\'s local search results as the market matures and competition intensifies.' },
    ],
    seoDescription: 'AI marketing agency for Lincoln, CA — one of California\'s fastest-growing cities. Local SEO, AI websites, and AI agent swarms for Lincoln and Placer County businesses.',
    keywords: ['AI marketing Lincoln CA', 'local SEO Lincoln California', 'digital marketing Lincoln Placer County', 'Lincoln CA marketing agency', 'AI websites Lincoln', 'Placer County marketing agency Lincoln'],
  },
  {
    slug: 'jackson',
    name: 'Jackson',
    county: 'Amador County',
    state: 'CA',
    population: '5,200',
    description: 'Jackson is the county seat of Amador County — the economic hub of California\'s Gold Country wine region. A close-knit community with strong local loyalty, growing tourism, and businesses that thrive when they\'re visible to both residents and the wine country visitors arriving from the Bay Area and Sacramento every weekend.',
    heroTitle: 'AI Marketing for Jackson Businesses',
    heroSubtitle: 'Jackson is the heart of Amador County — where wine country tourism meets a loyal local economy. We help Jackson businesses capture both markets with AI-powered marketing.',
    nearbyAreas: ['Sutter Creek', 'Ione', 'Pine Grove', 'Plymouth', 'Volcano'],
    industries: ['Wine & Tourism', 'Restaurants & Food', 'Home Services', 'Medical & Dental', 'Retail', 'Real Estate'],
    localTerms: ['Downtown Jackson', 'Jackson Rancheria Casino Resort', 'Kennedy Gold Mine', 'Kennedy Tailing Wheels Park', 'Detert Park', 'Highway 49 Corridor', 'Jackson Gate Road', 'St. Sava Serbian Orthodox Church'],
    geo: { lat: 38.3488, lng: -120.7741 },
    stats: [
      { value: '#1', label: 'county seat and economic hub of Amador County' },
      { value: '3x', label: 'average lead increase for our clients' },
      { value: '45 min', label: 'from our El Dorado County HQ' },
    ],
    features: [
      { title: 'Gold Country Tourism SEO', description: 'We capture wine country visitors, weekend travelers, and food tourists searching for restaurants, tasting rooms, and experiences in Jackson and Amador County.' },
      { title: 'AI Websites for Amador County Businesses', description: 'Fast, mobile-first websites that rank for Jackson and Amador County searches — converting both loyal local customers and Bay Area tourists.' },
      { title: 'Google Business Profile for Wine Country', description: 'In wine country, your GBP is often the first thing tourists see. We fully optimize and manage it to capture every visitor searching in the area.' },
      { title: 'Automated Marketing on a Small-Town Budget', description: 'Jackson is small-town California at its best — but your marketing doesn\'t have to be small. Our AI systems deliver big-agency results at a local-friendly price.' },
    ],
    seoDescription: 'AI marketing agency for Jackson, CA. Local SEO, AI websites, and automated marketing for Jackson and Amador County wine country businesses.',
    keywords: ['AI marketing Jackson CA', 'local SEO Jackson Amador County', 'digital marketing Jackson California', 'Jackson CA marketing agency', 'Amador County marketing agency', 'wine country SEO California'],
  },
  {
    slug: 'sutter-creek',
    name: 'Sutter Creek',
    county: 'Amador County',
    state: 'CA',
    population: '2,600',
    description: 'Sutter Creek is one of California\'s most charming Gold Rush towns — a picturesque destination with boutique shops, artisan restaurants, wine tasting rooms, and a steady stream of weekend visitors from the Bay Area and Sacramento. Businesses here succeed when they\'re easy to find online and impossible to resist once found.',
    heroTitle: 'AI Marketing for Sutter Creek Businesses',
    heroSubtitle: 'Sutter Creek attracts thousands of visitors from across Northern California. We make sure they find your business — in Google, in AI assistants, and on every platform they use to plan their trip.',
    nearbyAreas: ['Jackson', 'Amador City', 'Plymouth', 'Ione', 'Volcano'],
    industries: ['Wine & Tasting Rooms', 'Boutique Retail', 'Restaurants & Cafes', 'Bed & Breakfast', 'Arts & Galleries', 'Tourism'],
    localTerms: ['Main Street Sutter Creek', 'Knight Foundry', 'Sutter Creek Auditorium', 'Miners Bend Park', 'Eureka Street', 'Amador City Border', 'Highway 49 Corridor', 'Gold Rush Historic District'],
    geo: { lat: 38.3930, lng: -120.8024 },
    stats: [
      { value: '100k+', label: 'annual wine country visitors to Amador County' },
      { value: '3x', label: 'average lead increase for our clients' },
      { value: 'Tourism', label: 'economy with high-LTV customers' },
    ],
    features: [
      { title: 'Tourism-First SEO Strategy', description: 'We capture every tourist-intent search — "wine tasting Sutter Creek", "restaurants near me Gold Country", "things to do Amador County" — routing visitors directly to your business.' },
      { title: 'AI Websites That Convert Weekend Visitors', description: 'Visitors decide where to eat and shop on their phones en route. We build fast, mobile-first sites that rank and convert before they\'ve even arrived in town.' },
      { title: 'Review Management for Tourism Businesses', description: 'Wine country visitors live and die by reviews. Our AI agents generate new 5-star reviews and respond professionally to every rating — building the reputation that keeps them coming back.' },
      { title: 'Local + Tourism Citation Strategy', description: 'We build your presence across both local business directories and tourism platforms — TripAdvisor, Yelp, Google, and wine country-specific directories that drive foothill tourism.' },
    ],
    seoDescription: 'AI marketing for Sutter Creek, CA. SEO, AI websites, and automated marketing for Sutter Creek and Amador County wine country businesses.',
    keywords: ['AI marketing Sutter Creek CA', 'local SEO Sutter Creek', 'digital marketing Amador County', 'Sutter Creek marketing agency', 'wine country SEO Sutter Creek', 'Amador County tourism marketing'],
  },
  {
    slug: 'grass-valley',
    name: 'Grass Valley',
    county: 'Nevada County',
    state: 'CA',
    population: '14,000',
    description: 'Grass Valley is the largest city in Nevada County — a thriving Sierra foothill community that has attracted an exceptional mix of remote workers, artists, medical professionals, and established local businesses. The combination of an educated, high-income population and strong community identity makes it one of NorCal\'s most compelling local markets.',
    heroTitle: 'AI Marketing for Grass Valley Businesses',
    heroSubtitle: 'Grass Valley blends small-town community with big-city sophistication. Its residents are educated, digitally savvy, and loyal to local businesses they discover online. We make sure they discover yours.',
    nearbyAreas: ['Nevada City', 'Penn Valley', 'Colfax', 'Auburn', 'Lake of the Pines'],
    industries: ['Medical & Wellness', 'Professional Services', 'Restaurants & Food', 'Arts & Culture', 'Home Services', 'Technology & Remote Work'],
    localTerms: ['Historic Downtown Grass Valley', 'Empire Mine State Historic Park', 'Glenbrook Plaza', 'Sutton Way Corridor', 'McKnight Crossing', 'Nevada County Fairgrounds', 'Loma Rica Ranch', 'Idaho-Maryland Road'],
    geo: { lat: 39.2191, lng: -121.0611 },
    stats: [
      { value: '1,400+', label: 'local businesses' },
      { value: '14k', label: 'residents — Nevada County\'s largest city' },
      { value: '3x', label: 'average lead increase for our clients' },
    ],
    features: [
      { title: 'SEO for Nevada County\'s Premier Market', description: 'Grass Valley and Nevada City together form the economic heart of Nevada County. We build the search presence to dominate both markets and capture the combined audience.' },
      { title: 'AI Websites for an Educated, Discerning Audience', description: 'Grass Valley residents research before they buy and value quality. We build premium websites that reflect your expertise and rank in every local and regional search.' },
      { title: 'Remote Worker & Relocated Professional Targeting', description: 'Grass Valley has attracted a wave of remote workers and relocated professionals. We build the digital presence that captures this high-income demographic as they establish local service relationships.' },
      { title: 'Community-First Content Strategy', description: 'Grass Valley\'s tight-knit community responds to authentic, local content. Our AI content agents create city-specific posts, guides, and pages that resonate with the Nevada County audience.' },
    ],
    seoDescription: 'AI marketing agency for Grass Valley, CA. Local SEO, AI websites, and AI-powered marketing for Grass Valley and Nevada County businesses.',
    keywords: ['AI marketing Grass Valley CA', 'local SEO Grass Valley California', 'digital marketing Grass Valley Nevada County', 'Grass Valley marketing agency', 'AI websites Grass Valley', 'Nevada County marketing agency'],
  },
  {
    slug: 'nevada-city',
    name: 'Nevada City',
    county: 'Nevada County',
    state: 'CA',
    population: '3,100',
    description: 'Nevada City is one of California\'s most beloved historic towns — a remarkably preserved Gold Rush-era community with a thriving arts scene, progressive culture, upscale dining, and residents with exceptionally high discretionary income. Despite its small population, it punches well above its weight as a consumer market and tourist destination.',
    heroTitle: 'AI Marketing for Nevada City Businesses',
    heroSubtitle: 'Nevada City\'s small size masks its economic power. Residents have high incomes, strong local loyalty, and increasingly discover businesses through AI-assisted search. We make sure they find yours.',
    nearbyAreas: ['Grass Valley', 'Penn Valley', 'Truckee', 'Colfax', 'Rough and Ready'],
    industries: ['Arts & Galleries', 'Fine Dining & Wine', 'Wellness & Healing Arts', 'Professional Services', 'Tourism', 'Boutique Retail'],
    localTerms: ['Historic Downtown Nevada City', 'Broad Street', 'Nevada Theatre', 'Deer Creek', 'Seven Hills Business District', 'Banner Mountain', 'Cement Hill', 'Commercial Street'],
    geo: { lat: 39.2617, lng: -121.0178 },
    stats: [
      { value: '600+', label: 'local businesses' },
      { value: '3x', label: 'average lead increase for our clients' },
      { value: 'Top', label: 'arts destination in the Sierra foothills' },
    ],
    features: [
      { title: 'Boutique Local SEO for a Discerning Market', description: 'Nevada City\'s residents and visitors are sophisticated consumers who research extensively before purchasing. We build the digital presence that earns their attention and trust.' },
      { title: 'Tourism & Local Resident Dual Strategy', description: 'We capture both the steady local customer base and the arts tourists who visit from Sacramento, the Bay Area, and beyond — maximizing your reach across both audiences.' },
      { title: 'Premium Brand Positioning Online', description: 'Nevada City is a premium market. Your digital presence should reflect that. We build websites and content strategies that position your business as the obvious top-tier choice.' },
      { title: 'AI-Powered Review & Reputation Management', description: 'In a small, tight-knit town like Nevada City, your reputation is everything. Our AI agents ensure every review gets a professional response and every satisfied client leaves a positive rating.' },
    ],
    seoDescription: 'AI marketing agency for Nevada City, CA. Local SEO, AI websites, and AI-powered marketing for Nevada City and Nevada County businesses.',
    keywords: ['AI marketing Nevada City CA', 'local SEO Nevada City California', 'digital marketing Nevada City', 'Nevada City marketing agency', 'AI websites Nevada City', 'Nevada County arts community marketing'],
  },
  {
    slug: 'truckee',
    name: 'Truckee',
    county: 'Nevada County',
    state: 'CA',
    population: '16,000',
    description: 'Truckee is a high-altitude mountain resort town on the edge of the Sierra Nevada — and one of the most affluent small markets in California. World-class ski resorts, year-round outdoor recreation, and a flood of high-net-worth visitors from the Bay Area make Truckee a premium market where the right digital presence translates directly into high-ticket revenue.',
    heroTitle: 'AI Marketing for Truckee Businesses',
    heroSubtitle: 'Truckee\'s visitors are high-income, mobile-first, and quick to decide. The businesses they find online — before they leave home — are the ones that win their spending. We make sure that\'s you.',
    nearbyAreas: ['South Lake Tahoe', 'Tahoe City', 'Kings Beach', 'Incline Village NV', 'Donner Lake'],
    industries: ['Ski & Mountain Recreation', 'Luxury Hospitality', 'Real Estate & Vacation Rentals', 'Fine Dining & Après Ski', 'Outdoor Gear & Sports', 'Wellness & Spa'],
    localTerms: ['Historic Downtown Truckee', 'Donner Lake', 'Tahoe Donner', 'Northstar', 'Glenshire', 'Martis Valley', 'Gateway District', 'Donner Memorial State Park'],
    geo: { lat: 39.3280, lng: -120.1833 },
    stats: [
      { value: '1,500+', label: 'local businesses' },
      { value: '5M+', label: 'annual visitors to the Tahoe-Truckee region' },
      { value: '3x', label: 'average lead increase for our clients' },
    ],
    features: [
      { title: 'High-Intent Tourism SEO for Mountain Markets', description: 'Truckee visitors search with intent and spend with authority. We capture searches like "ski rental Truckee", "best restaurants Tahoe", and "luxury cabin Truckee" and route them to your business.' },
      { title: 'Mobile-First AI Websites for On-Mountain Discovery', description: 'Most Truckee booking decisions happen on a phone. We build lightning-fast, mobile-optimized websites that convert visitors before they\'ve even arrived at the trailhead.' },
      { title: 'Seasonal AI Marketing That Peaks With the Season', description: 'Winter ski season. Summer hiking season. Fall color season. Our AI agents continuously adapt your marketing to match the season, the search trends, and the visitor demographics.' },
      { title: 'Luxury Market Positioning & Reputation Management', description: 'Truckee is a premium market. We build the online reputation — reviews, content, and brand signals — that positions your business as the top-tier choice for high-net-worth visitors and full-time locals alike.' },
    ],
    seoDescription: 'AI marketing agency for Truckee, CA. Tourism SEO, AI websites, and AI-powered marketing for Truckee and the Tahoe-Truckee mountain market.',
    keywords: ['AI marketing Truckee CA', 'local SEO Truckee California', 'digital marketing Truckee Nevada County', 'Truckee marketing agency', 'AI websites Truckee', 'Lake Tahoe Truckee marketing California'],
  },
  {
    slug: 'shingle-springs',
    name: 'Shingle Springs',
    county: 'El Dorado County',
    state: 'CA',
    population: '5,300',
    description: 'Shingle Springs is a tight-knit El Dorado County community along the Highway 50 corridor — a quiet, family-oriented area with strong local loyalty and proximity to both the Sacramento metro and the Sierra foothills. Businesses here benefit from a customer base that values personal relationships and discovers new providers through local search.',
    heroTitle: 'AI Marketing for Shingle Springs Businesses',
    heroSubtitle: 'Shingle Springs businesses serve a loyal, close-knit community. We make sure when they search online, your business is the first thing they find — in Google, in AI assistants, and on every platform that matters.',
    nearbyAreas: ['Cameron Park', 'El Dorado Hills', 'Placerville', 'Diamond Springs', 'Rescue'],
    industries: ['Home Services', 'Medical & Dental', 'Real Estate', 'Restaurants', 'Professional Services', 'Fitness & Wellness'],
    localTerms: ['Red Hawk Casino Resort', 'Shingle Springs Drive', 'Ponderosa Road', 'Mother Lode Drive', 'Highway 50 Corridor', 'Shingle Springs Plaza', 'Cameron Park', 'El Dorado Wine Country'],
    geo: { lat: 38.6657, lng: -120.9261 },
    stats: [
      { value: '450+', label: 'local businesses' },
      { value: 'Hwy 50', label: 'corridor — high commuter traffic' },
      { value: '3x', label: 'average lead increase for our clients' },
    ],
    features: [
      { title: 'Highway 50 Corridor Local SEO', description: 'Shingle Springs sits on the busiest corridor in El Dorado County. We capture the "near me" searches from commuters and residents alike — putting your business in front of thousands daily.' },
      { title: 'AI Websites for Community-Focused Businesses', description: 'We build professional, fast-loading websites that reflect the quality of your service and rank for every relevant Shingle Springs and El Dorado County search.' },
      { title: 'Google Business Profile for the Foothills', description: 'Your GBP is the front door for local discovery. We fully optimize and manage it to capture Map Pack rankings across Shingle Springs, Cameron Park, and the broader Highway 50 corridor.' },
      { title: 'Small-Town Marketing, Enterprise Results', description: 'Our AI systems deliver the same marketing firepower that big-city agencies charge a fortune for — at a price designed for Shingle Springs and El Dorado County businesses.' },
    ],
    seoDescription: 'AI marketing for Shingle Springs, CA. Local SEO, AI websites, and automated marketing for Shingle Springs businesses in El Dorado County.',
    keywords: ['AI marketing Shingle Springs CA', 'local SEO Shingle Springs', 'digital marketing Shingle Springs', 'Shingle Springs marketing agency', 'El Dorado County marketing Shingle Springs', 'AI websites Shingle Springs'],
  },
  {
    slug: 'rancho-cordova',
    name: 'Rancho Cordova',
    county: 'Sacramento County',
    state: 'CA',
    population: '79,000',
    description: 'Rancho Cordova is one of Sacramento County\'s fastest-growing cities — a dynamic mix of established neighborhoods and new development, with a thriving business community, major employers, and strong demand for local services. Its strategic location between Sacramento and Folsom makes it a key market for businesses serving the eastern metro.',
    heroTitle: 'AI Marketing Agency — Rancho Cordova, CA',
    heroSubtitle: 'Rancho Cordova is growing fast and competition for local customers is fierce. We deploy AI-powered websites, local SEO, and agent swarms that keep your business ahead of the pack 24/7.',
    nearbyAreas: ['Sacramento', 'Folsom', 'Elk Grove', 'Citrus Heights', 'Fair Oaks', 'Mather'],
    industries: ['Technology & Defense', 'Medical & Healthcare', 'Home Services', 'Real Estate', 'Restaurants', 'Professional Services', 'Auto Services'],
    localTerms: ['Rancho Cordova Town Center', 'Zinfandel Drive', 'Mills Station', 'Anatolia', 'White Rock Road', 'Mather Field', 'Capital Village', 'Sunrise Boulevard'],
    geo: { lat: 38.5891, lng: -121.3027 },
    stats: [
      { value: '79k', label: 'residents — fast-growing Sacramento suburb' },
      { value: '3,200+', label: 'local businesses' },
      { value: '24/7', label: 'AI agents running for your business' },
    ],
    features: [
      { title: 'Rancho Cordova Local Search Domination', description: 'We capture every high-intent search in Rancho Cordova — from "dentist near me" to "HVAC Rancho Cordova CA" — with targeted local SEO, citations, and Google Business Profile optimization.' },
      { title: 'AI Websites for Sacramento\'s Eastern Corridor', description: 'Rancho Cordova sits at the crossroads of Sacramento and Folsom. We build websites that rank for both city-specific and regional searches — maximizing your reach across the eastern metro.' },
      { title: 'AI Content for a Growing Market', description: 'AI content agents publish Rancho Cordova-specific pages and blog posts that build topical authority and capture long-tail searches your competitors overlook.' },
      { title: 'Multi-Location Strategy for the Metro', description: 'Many Rancho Cordova businesses serve the broader Sacramento area. We build multi-location SEO strategies that capture demand across every community in your service area.' },
    ],
    seoDescription: 'AI marketing agency serving Rancho Cordova, CA. Local SEO, AI websites, and AI agent swarms for Rancho Cordova and Sacramento County businesses.',
    keywords: ['AI marketing Rancho Cordova CA', 'local SEO Rancho Cordova', 'digital marketing Rancho Cordova Sacramento', 'Rancho Cordova marketing agency', 'AI websites Rancho Cordova', 'Sacramento County marketing'],
  },
  {
    slug: 'pine-grove',
    name: 'Pine Grove',
    county: 'Amador County',
    state: 'CA',
    population: '2,800',
    description: 'Pine Grove is a rural Amador County community at the gateway to the Sierra Nevada — a quiet, natural setting that attracts retirees, outdoor enthusiasts, and families seeking affordable Gold Country living. Businesses here serve a loyal customer base that values reliability and discovers new providers through local search and word of mouth.',
    heroTitle: 'AI Marketing for Pine Grove Businesses',
    heroSubtitle: 'Pine Grove is small but your digital presence doesn\'t have to be. We build AI-powered marketing that puts your business in front of every local searcher in Amador County and the surrounding foothills.',
    nearbyAreas: ['Jackson', 'Sutter Creek', 'Volcano', 'Pioneer', 'Buckhorn'],
    industries: ['Home Services', 'Real Estate', 'Restaurants', 'Outdoor Recreation', 'Medical & Dental', 'Retail'],
    localTerms: ['Indian Grinding Rock State Historic Park', 'Pine Grove-Volcano Road', 'Highway 88 Corridor', 'Pine Grove Community Park', 'Pine Grove Town Center', 'Irishtown', 'Buckhorn', 'Ridge Road'],
    geo: { lat: 38.4078, lng: -120.6553 },
    stats: [
      { value: 'Amador', label: 'County — growing Gold Country market' },
      { value: '3x', label: 'average lead increase for our clients' },
      { value: '45 min', label: 'from our El Dorado County HQ' },
    ],
    features: [
      { title: 'Rural Market SEO That Actually Works', description: 'Small towns need different SEO strategies. We target the specific searches Pine Grove and upper Amador County residents use — not generic national keywords that miss your market entirely.' },
      { title: 'AI Websites on a Local Budget', description: 'Professional, fast-loading websites that rank for Pine Grove and Amador County keywords — without the big-agency price tag. Our AI systems keep costs accessible for rural businesses.' },
      { title: 'Gold Country Tourism Capture', description: 'Pine Grove sits at the gateway to some of Amador County\'s best outdoor recreation. We build the search presence that captures tourists heading to Volcano, Indian Grinding Rock, and the Sierra foothills.' },
      { title: 'Review & Reputation for Small Communities', description: 'In Pine Grove, reputation is everything. Our AI agents manage your reviews, respond professionally, and generate new 5-star ratings from satisfied customers automatically.' },
    ],
    seoDescription: 'AI marketing for Pine Grove, CA. Local SEO, AI websites, and automated marketing for Pine Grove and Amador County businesses.',
    keywords: ['AI marketing Pine Grove CA', 'local SEO Pine Grove Amador County', 'digital marketing Pine Grove California', 'Pine Grove marketing agency', 'Amador County marketing', 'AI websites Pine Grove'],
  },
  {
    slug: 'ione',
    name: 'Ione',
    county: 'Amador County',
    state: 'CA',
    population: '8,200',
    description: 'Ione is a historic Amador County town with a growing population and a diverse local economy. As the largest city in western Amador County, it serves as a commercial hub for surrounding communities and benefits from both local demand and proximity to the Sacramento metro commuter market.',
    heroTitle: 'AI Marketing for Ione Businesses',
    heroSubtitle: 'Ione is Amador County\'s western gateway — where local business meets Sacramento commuter demand. We build AI marketing systems that capture both audiences and convert them into customers.',
    nearbyAreas: ['Jackson', 'Sutter Creek', 'Plymouth', 'Amador City', 'Rancho Murieta'],
    industries: ['Home Services', 'Medical & Dental', 'Real Estate', 'Restaurants', 'Retail', 'Auto Services'],
    localTerms: ['Preston Castle', 'Castle Oaks Golf Club', 'Castle Oaks', 'Downtown Ione', 'Howard Park', 'Ione Plaza Market', 'Main Street Corridor', 'Preston District'],
    geo: { lat: 38.3527, lng: -120.9327 },
    stats: [
      { value: '8.2k', label: 'residents — largest city in western Amador' },
      { value: '3x', label: 'average lead increase for our clients' },
      { value: '45 min', label: 'from our El Dorado County HQ' },
    ],
    features: [
      { title: 'Western Amador County SEO Hub', description: 'Ione serves as the commercial center for western Amador County. We build the SEO infrastructure to capture searches from Ione, Plymouth, Rancho Murieta, and the surrounding communities.' },
      { title: 'AI Websites for Amador County Businesses', description: 'Fast, professional websites built for Ione\'s market — designed to rank in Google, appear in AI assistants, and convert local visitors into paying customers.' },
      { title: 'Commuter Market Targeting', description: 'Many Ione residents commute to Sacramento. Our AI systems capture the "near home" searches they run in the evenings and weekends — when they\'re looking for local services.' },
      { title: 'Affordable AI Marketing for Small Towns', description: 'Enterprise-grade marketing results at a price designed for Ione and Amador County businesses. Our AI agents replace the need for expensive agencies or in-house marketing staff.' },
    ],
    seoDescription: 'AI marketing for Ione, CA. Local SEO, AI websites, and automated marketing for Ione and western Amador County businesses.',
    keywords: ['AI marketing Ione CA', 'local SEO Ione Amador County', 'digital marketing Ione California', 'Ione marketing agency', 'Amador County marketing Ione', 'AI websites Ione'],
  },
  {
    slug: 'penn-valley',
    name: 'Penn Valley',
    county: 'Nevada County',
    state: 'CA',
    population: '1,700',
    description: 'Penn Valley is a scenic Nevada County community centered around Lake Wildwood — an affluent gated community with strong purchasing power and a loyal local customer base. Businesses serving Penn Valley benefit from high household incomes and residents who actively seek quality local services.',
    heroTitle: 'AI Marketing for Penn Valley Businesses',
    heroSubtitle: 'Penn Valley\'s residents are affluent, loyal, and research-driven. We build the AI marketing presence that earns their trust and puts your business at the top of every local search.',
    nearbyAreas: ['Grass Valley', 'Nevada City', 'Lake Wildwood', 'Rough and Ready', 'Smartsville'],
    industries: ['Home Services', 'Real Estate', 'Medical & Wellness', 'Landscaping', 'Professional Services', 'Restaurants'],
    localTerms: ['Lake Wildwood', 'Western Gateway Park', 'Penn Valley Drive', 'Pleasant Valley Road', 'Lake Wildwood Shopping Center', 'Penn Valley Village', 'Indian Springs', 'South Yuba River State Park'],
    geo: { lat: 39.1923, lng: -121.1867 },
    stats: [
      { value: '350+', label: 'local businesses' },
      { value: 'Lake', label: 'Wildwood — affluent gated community' },
      { value: '3x', label: 'average lead increase for our clients' },
    ],
    features: [
      { title: 'Lake Wildwood & Penn Valley SEO', description: 'We target the specific searches Penn Valley and Lake Wildwood residents use — capturing high-income homeowners actively looking for local services and home improvement providers.' },
      { title: 'AI Websites for Affluent Rural Markets', description: 'Penn Valley residents expect quality. We build premium websites that reflect the professionalism of your service and rank for every relevant Penn Valley and Nevada County search.' },
      { title: 'Grass Valley–Nevada City Corridor Strategy', description: 'Penn Valley businesses often serve the broader Grass Valley and Nevada City corridor. We build the multi-community SEO strategy that captures demand across the full Nevada County footprint.' },
      { title: 'Reputation Management for Small Communities', description: 'In a community like Penn Valley, your reputation travels fast. Our AI agents ensure every review gets a professional response and every happy customer leaves a positive rating.' },
    ],
    seoDescription: 'AI marketing for Penn Valley, CA. Local SEO, AI websites, and AI-powered marketing for Penn Valley, Lake Wildwood, and Nevada County businesses.',
    keywords: ['AI marketing Penn Valley CA', 'local SEO Penn Valley Nevada County', 'digital marketing Penn Valley California', 'Penn Valley marketing agency', 'Lake Wildwood marketing', 'Nevada County marketing Penn Valley'],
  },
]

export const CITY_SLUGS = CITIES.map((c) => c.slug)

export function getCityBySlug(slug: string): CityData | undefined {
  return CITIES.find((c) => c.slug === slug)
}
