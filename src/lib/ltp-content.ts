/**
 * Unique per-city content for LTP pages.
 *
 * Each city can have a `marketInsight` paragraph and optional
 * service-specific overrides. This content renders as a callout
 * section on the LTP page to differentiate it from template copy,
 * improving Google's willingness to index the page.
 *
 * Keys are city slugs from cities.ts.
 */

export type CityContent = {
  /** 2-3 sentence unique market insight about the city — not template-fillable */
  marketInsight: string
  /** Per-service unique content keyed by service slug */
  serviceInsights?: Record<string, string>
}

export const LTP_CONTENT: Record<string, CityContent> = {
  // ── Sacramento County ──────────────────────────────────────
  sacramento: {
    marketInsight:
      'Sacramento is the state capital and the economic hub of a six-county metro area with over 2.4 million residents. The city has undergone a rapid downtown revitalization — the DOCO district, the Golden 1 Center, and the emerging Innovation District have drawn thousands of new businesses. Competition for local visibility is fierce: Sacramento has more registered businesses per capita than any other Northern California city outside the Bay Area, and the Map Pack for most service categories is saturated with well-optimized competitors.',
    serviceInsights: {
      'private-llms': 'Sacramento\'s state government agencies and healthcare systems handle sensitive data subject to HIPAA and state privacy regulations. Private LLM deployments let these organizations use AI without sending data to third-party APIs — a hard requirement for many Sacramento employers.',
      'ai-automated-outreach': 'With over 50,000 registered businesses in Sacramento County, cold outreach volume needs AI to scale. The Sacramento market responds well to hyper-local messaging that references specific neighborhoods like Midtown, East Sacramento, or the Arden-Arcade corridor.',
      'ai-content-repurposing': 'Sacramento businesses compete with both Bay Area companies expanding east and established local brands. AI content repurposing lets smaller Sacramento businesses match the content volume of larger competitors by transforming a single blog post into social media, email sequences, and local landing pages.',
    },
  },

  'elk-grove': {
    marketInsight:
      'Elk Grove is Sacramento County\'s second-largest city and one of the most ethnically diverse communities in California. Its rapid suburban growth — from 72,000 in 2000 to over 180,000 today — has created a wave of new businesses serving a family-oriented, digitally connected population. The city\'s Southeast Policy Area is the site of one of the largest mixed-use developments in the Sacramento region.',
    serviceInsights: {
      'ai-content-generation': 'Elk Grove\'s diverse population means businesses need content that resonates across multiple cultural communities. AI content generation can produce variations tailored to different audience segments while maintaining brand consistency.',
      'wordpress-development': 'Many Elk Grove businesses launched websites during the city\'s population boom but haven\'t updated them since. WordPress modernization is a high-demand service here — businesses need mobile-responsive sites that reflect their growth.',
      'design': 'Elk Grove\'s booming retail and dining scene along Elk Grove Boulevard and the emerging District56 development creates high demand for professional branding and visual identity.',
      'clawbot-setup': 'Elk Grove businesses competing against Sacramento-based companies need competitive intelligence. Clawbot monitoring helps track what larger Sacramento competitors are doing and respond faster.',
    },
  },

  'citrus-heights': {
    marketInsight:
      'Citrus Heights sits in the geographic center of Sacramento County with direct access to both Sacramento and Roseville consumer markets. The Sunrise Mall corridor and Auburn Boulevard business district anchor the city\'s commercial activity. With a population of 87,000 and median household income below the county average, businesses here compete aggressively on visibility and reviews to capture price-conscious consumers.',
    serviceInsights: {
      'react-next-webapps': 'Citrus Heights businesses that serve the broader Sacramento metro need web applications that can handle real-time inventory, booking, and service management — not static brochure sites.',
      'ai-social-media-management': 'The Citrus Heights community is highly active on local Facebook groups and Nextdoor. AI social media management helps businesses maintain a consistent presence in these hyper-local channels without dedicating staff time.',
      'hosting': 'Many Citrus Heights businesses run on shared hosting that slows to a crawl during peak traffic from Sacramento-area searches. Dedicated agent and app hosting eliminates this bottleneck.',
      'clawbot-setup': 'Citrus Heights businesses face competition from both directions — Sacramento proper and the Roseville/Rocklin corridor. Clawbot monitoring helps track competitors across both markets.',
    },
  },

  folsom: {
    marketInsight:
      'Folsom is one of the wealthiest and most tech-savvy cities in the Sacramento region. Home to Intel\'s largest campus outside of Oregon, Folsom\'s workforce skews heavily toward technology professionals. Local businesses serve a demanding, digitally literate population that researches extensively online before purchasing. The Folsom Historic District and Palladio at Broadstone draw foot traffic, but most customer journeys start with a Google search.',
    serviceInsights: {
      'gbp-admin': 'Folsom\'s concentration of professional services — dentists, financial advisors, law firms — makes Google Business Profile optimization essential. The Map Pack in Folsom is fiercely competitive for nearly every service category.',
    },
  },

  'rancho-cordova': {
    marketInsight:
      'Rancho Cordova has transformed from a sleepy Sacramento suburb into a business destination with its own identity. The city\'s aggressive economic development program has attracted major employers, and the Folsom Boulevard corridor is undergoing a commercial renaissance. With over 70,000 residents and strong population growth, Rancho Cordova businesses increasingly need professional digital marketing to stand out.',
    serviceInsights: {
      'design': 'Rancho Cordova\'s growing business community includes many startups and new franchises that need professional branding from day one to compete with established Sacramento businesses.',
      'geo-targeting': 'Rancho Cordova sits at the intersection of multiple zip codes and city boundaries. Geo-targeting is particularly valuable here because consumer search behavior splits between "Sacramento," "Rancho Cordova," and "Folsom" depending on the searcher\'s exact location.',
      'geo-aeo-llm-optimization': 'Rancho Cordova businesses are frequently lumped in with "Sacramento" in AI search results. Dedicated GEO/AEO optimization helps these businesses surface specifically for Rancho Cordova queries rather than being lost in broader Sacramento results.',
      'private-llms': 'Rancho Cordova is home to several defense contractors and government agencies. Private LLM deployments serve the same data-sensitivity requirements as Sacramento proper.',
    },
  },

  roseville: {
    marketInsight:
      'Roseville is the retail and commercial heart of Placer County, anchored by the Westfield Galleria and a dense cluster of auto dealerships, medical offices, and professional services along the I-80 corridor. With over 150,000 residents and the highest retail sales volume in the Sacramento metro outside of Sacramento itself, Roseville businesses operate in one of the region\'s most competitive local markets.',
    serviceInsights: {
      'gbp-admin': 'Roseville\'s dense commercial zones around the Galleria, Douglas Boulevard, and Pleasant Grove mean the Map Pack competition is intense. GBP optimization is table stakes for any Roseville business.',
      'react-next-webapps': 'Roseville\'s large medical and professional services cluster creates demand for patient portals, booking systems, and client dashboards — custom web applications beyond brochure-ware.',
    },
  },

  rocklin: {
    marketInsight:
      'Rocklin has grown from a quarry town into one of Placer County\'s fastest-growing suburbs, with a population that has nearly doubled in 20 years. Sierra College and William Jessup University bring a younger demographic, while the Rocklin Crossings and Sunset Whitney areas anchor commercial activity. Rocklin businesses often compete against both Roseville and Lincoln for the same customers.',
    serviceInsights: {
      'ai-content-generation': 'Rocklin businesses competing against the larger Roseville market need to produce more content than they can manually write. AI content generation levels the playing field by matching the content volume of larger competitors.',
    },
  },

  // ── Placer County ──────────────────────────────────────────
  auburn: {
    marketInsight:
      'Auburn is the seat of Placer County and the gateway to the Sierra Nevada foothills. Its Old Town district is a tourism magnet, and the city serves as a services hub for the surrounding rural communities of Meadow Vista, Colfax, and Foresthill. Auburn businesses often serve a dual market: local residents and outdoor recreation tourists passing through on their way to Tahoe and the Gold Country trails.',
    serviceInsights: {
      'ai-content-generation': 'Auburn\'s tourism-dependent businesses need seasonal content strategies. AI content generation can produce trail guides, event previews, and seasonal specials content that would be impractical to write manually for each shoulder season and holiday weekend.',
      'ai-content-repurposing': 'Auburn businesses that produce one piece of seasonal content can use AI repurposing to transform it into Google Business posts, Instagram stories, trail-guide blog entries, and email newsletters — critical for capturing both tourist and local search traffic.',
      'ai-automated-outreach': 'Auburn\'s small business community is tight-knit. AI-powered outreach campaigns that reference local events like the Auburn Home Show or the Tevis Cup endurance ride resonate far better than generic templates.',
      'mobile-apps': 'Auburn\'s outdoor recreation economy — trail running, mountain biking, rafting on the American River — creates opportunities for booking and guide apps that connect tourists with local outfitters and services.',
      'geo-aeo-llm-optimization': 'When tourists ask AI assistants "where should I eat in Auburn CA" or "best outdoor gear near Auburn," businesses need to appear in those responses. GEO/AEO optimization targets exactly these conversational queries.',
      'systems': 'Auburn\'s mix of tourism businesses, professional services, and government offices means a one-size-fits-all marketing system won\'t work. Custom demand gen systems account for Auburn\'s unique seasonal traffic patterns and dual tourist/local audience.',
      'vibe-coded': 'Auburn\'s independent businesses — wine rooms, bike shops, artisan bakeries — often need a web presence quickly but can\'t afford custom development. Vibe-coded web apps deliver a professional site in days, not months.',
    },
  },

  lincoln: {
    marketInsight:
      'Lincoln is Placer County\'s fastest-growing city, fueled by massive master-planned communities like Lincoln Crossing and Twelve Bridges that have nearly tripled the population since 2000. The city\'s demographic skews toward young families and retirees in Sun City Lincoln Hills. This growth has created a wave of new businesses — restaurants, medical practices, home services — that need to establish digital presence quickly in a market with little established competition.',
    serviceInsights: {
      'ai-agent-swarms': 'Lincoln\'s rapid growth means new businesses need to scale their operations fast. AI agent swarms handle the marketing tasks that a small team can\'t — review responses, social posting, lead qualification — letting new Lincoln businesses punch above their weight.',
      'design': 'New Lincoln businesses opening in master-planned retail centers need professional branding that matches the polished aesthetic of the developments they\'re joining.',
      'ai-automated-outreach': 'Lincoln\'s new residents are actively searching for local service providers. AI-powered outreach to new movers and new homeowners captures demand at the moment it\'s created.',
      'systems': 'Lincoln businesses serving the Sun City retirement community and young families in Twelve Bridges need marketing systems that segment and speak to fundamentally different audiences.',
    },
  },

  // ── Amador County ──────────────────────────────────────────
  jackson: {
    marketInsight:
      'Jackson is the county seat and commercial hub of Amador County, a small Gold Country community where word-of-mouth has traditionally driven business. With a population under 5,000, the local market is limited — but Jackson businesses that invest in digital visibility capture demand from the broader Amador County area and the steady stream of wine country tourists visiting the Shenandoah Valley AVA.',
    serviceInsights: {
      'ai-content-generation': 'Jackson businesses serving the wine country tourism market need content that targets visitors searching for "Amador County wineries" and "things to do near Jackson CA." AI content generation produces the volume of destination-marketing content needed to compete with Napa and Sonoma for wine tourism searches.',
      'wordpress-development': 'Many Jackson businesses still operate websites built in the early 2010s. WordPress modernization brings them into the mobile era while maintaining the approachable, small-town character that Amador County visitors expect.',
    },
  },

  'sutter-creek': {
    marketInsight:
      'Sutter Creek is Amador County\'s most charming small town — a walkable Main Street lined with antique shops, tasting rooms, and boutique hotels that draws day-trippers from Sacramento and Bay Area visitors to Gold Country. The town\'s economy is almost entirely tourism-dependent, making online visibility critical: most visitors discover Sutter Creek businesses through Google searches and AI travel recommendations before they ever set foot on Main Street.',
    serviceInsights: {
      'ai-content-repurposing': 'Sutter Creek businesses generate rich visual content from their historic storefronts and wine country setting. AI repurposing transforms a single photo gallery or event post into Google Business updates, Instagram reels, and travel-blog entries.',
      'hosting': 'Sutter Creek businesses on shared hosting risk slow load times during peak tourist weekends when Sacramento day-trippers are searching on mobile. Reliable hosting ensures the site performs when it matters most.',
      'ai-agent-swarms': 'Small Sutter Creek businesses with 1-2 employees can\'t afford dedicated marketing staff. AI agent swarms handle review responses, social posting, and lead follow-up around the clock.',
    },
  },

  'pine-grove': {
    marketInsight:
      'Pine Grove is an unincorporated community in the heart of Amador County, serving as a residential base for people who work in Jackson or commute to Sacramento. Its commercial activity centers on the Highway 88 corridor. Pine Grove businesses compete for a small local population but can expand their reach significantly by capturing nearby Jackson and Sutter Creek traffic with strong digital presence.',
    serviceInsights: {
      'ai-social-media-management': 'Pine Grove businesses reach their customers through local community Facebook groups and Nextdoor more than any other channel. AI social media management maintains a presence in these micro-communities without requiring dedicated staff.',
      'systems': 'Pine Grove businesses operating on the Highway 88 corridor serve a mix of locals, Amador County residents, and Highway 88 travelers headed to Kirkwood and Bear Valley. Demand gen systems need to target all three audience segments.',
      'mobile-apps': 'Pine Grove service businesses — contractors, landscapers, handyman services — cover a wide geographic area across Amador County. Mobile apps for scheduling and dispatch help them manage operations across the rural territory they serve.',
      'ai-workforce-automation': 'Small Pine Grove businesses that operate with minimal staff benefit the most from AI workforce automation — every hour of manual administrative work replaced by AI is an hour the owner can spend on revenue-generating activity.',
      'ai-auto-blogging': 'Pine Grove businesses rarely have time to blog. AI auto-blogging generates relevant content that targets "near me" searches for the Pine Grove / Jackson / Sutter Creek area, building organic visibility over time without manual effort.',
      'ai-review-auto-responders': 'In a small community like Pine Grove, every Google review matters disproportionately. AI review auto-responders ensure every review — positive or negative — gets a prompt, professional reply.',
    },
  },

  ione: {
    marketInsight:
      'Ione is a small Amador County town known for Preston Castle, the Mule Creek State Prison complex, and the surrounding ranch land. With a population under 8,000, Ione\'s local business market is small but underserved digitally — most Ione businesses have minimal or no web presence, meaning the barrier to dominating local search results is much lower than in larger markets.',
    serviceInsights: {
      'clawbot-setup': 'Ione businesses competing against Jackson and Sacramento for regional customers benefit from competitive intelligence. Clawbot monitoring tracks what neighboring-market competitors are doing so Ione businesses can respond strategically.',
      'systems': 'Ione businesses serve a geographically dispersed customer base across rural Amador County. Demand gen systems need to account for the wide service area and target multiple small communities with tailored messaging.',
      'ai-social-media-management': 'Ione\'s tight-knit community relies heavily on social media for local news and business recommendations. AI social media management keeps businesses visible in the community conversation without requiring daily manual effort.',
    },
  },

  // ── Nevada County ──────────────────────────────────────────
  truckee: {
    marketInsight:
      'Truckee is a mountain resort town on the north shore of Lake Tahoe, with an economy driven by tourism, outdoor recreation, and a growing remote-worker population. Businesses here face a unique challenge: extreme seasonality. Winter brings skiers; summer brings hikers and lake visitors. The shoulder seasons (April-May, October-November) see dramatic traffic drops. Digital marketing in Truckee must account for these seasonal swings.',
    serviceInsights: {
      'geo-targeting': 'Truckee businesses need geo-targeting that distinguishes between "Truckee" and "Lake Tahoe" searches. Visitors searching "restaurants near Lake Tahoe" may be 30 minutes away in Truckee, but only geo-optimized businesses appear in those results.',
      'ai-workforce-automation': 'Truckee\'s hospitality businesses scale up and down with the seasons. AI workforce automation handles the marketing tasks — booking confirmations, review responses, social media — that would otherwise require seasonal hires.',
    },
  },

  'penn-valley': {
    marketInsight:
      'Penn Valley is a quiet rural community in western Nevada County, between Grass Valley and the Yuba River canyon. Its commercial activity is limited to the Pleasant Valley Road corridor, but Penn Valley residents regularly drive to Grass Valley and Nevada City for services. Businesses that establish strong digital presence in Penn Valley can capture an underserved local market with minimal competition.',
    serviceInsights: {
      'vibe-coded': 'Penn Valley\'s independent businesses and agricultural operations need affordable web presence. Vibe-coded web apps deliver a professional site quickly at a fraction of the cost of custom development — ideal for a market where marketing budgets are tight.',
    },
  },
}

/**
 * Look up unique content for a city+service combination.
 * Returns the city-level market insight and any service-specific insight.
 */
export function getLtpContent(citySlug: string, serviceSlug: string): { marketInsight: string; serviceInsight?: string } | null {
  const city = LTP_CONTENT[citySlug]
  if (!city) return null
  return {
    marketInsight: city.marketInsight,
    serviceInsight: city.serviceInsights?.[serviceSlug],
  }
}
