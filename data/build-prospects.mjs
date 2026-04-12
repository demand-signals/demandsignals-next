#!/usr/bin/env node
/**
 * Build the complete prospects-import.json from the master prospect database.
 * Run: node data/build-prospects.mjs
 * Output: data/prospects-import.json
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── INDUSTRY MAP ───
const INDUSTRIES = new Set([
  'dental','legal','chiropractic','medical','medspa',
  'hvac','plumbing','contractor','restaurant','firearms',
  'auto','fitness','financial','veterinary','retail','other'
])

// ─── HELPER: parse "4.8 (Google - 156 reviews)" into { rating, count, platform } ───
function parseRating(str) {
  if (!str) return {}
  const num = parseFloat(str)
  const countMatch = str.match(/(\d+)\s*reviews?/i)
  const count = countMatch ? parseInt(countMatch[1], 10) : null
  const platform = str.toLowerCase().includes('yelp') ? 'yelp'
    : str.toLowerCase().includes('google') ? 'google'
    : str.toLowerCase().includes('avvo') ? 'avvo'
    : str.toLowerCase().includes('surecritic') ? 'surecritic'
    : str.toLowerCase().includes('demandforce') ? 'demandforce'
    : str.toLowerCase().includes('carwise') ? 'carwise'
    : str.toLowerCase().includes('birdeye') ? 'birdeye'
    : str.toLowerCase().includes('homeadvisor') ? 'homeadvisor'
    : str.toLowerCase().includes('carfax') ? 'carfax'
    : 'google'
  return { rating: isNaN(num) ? null : num, count, platform }
}

// ─── HELPER: parse full address ───
function parseAddress(full) {
  if (!full) return {}
  // "2700 Coloma St, Placerville, CA 95667"
  const parts = full.split(',').map(s => s.trim())
  if (parts.length >= 3) {
    const stateZip = parts[parts.length - 1].match(/([A-Z]{2})\s*(\d{5})?/)
    return {
      address: parts.slice(0, -2).join(', '),
      city: parts[parts.length - 2],
      state: stateZip?.[1] || 'CA',
      zip: stateZip?.[2] || null,
    }
  }
  if (parts.length === 2) {
    const stateZip = parts[1].match(/([A-Z]{2})\s*(\d{5})?/)
    return {
      address: parts[0],
      city: stateZip ? parts[1].replace(/[A-Z]{2}\s*\d{5}/, '').trim() : parts[1],
      state: stateZip?.[1] || 'CA',
    }
  }
  return { address: full }
}

// ─── RESEARCH DATA ENRICHMENT ───
// Auto-extract structured intel from notes + other fields
function buildResearchData(prospect) {
  const notes = (prospect.notes || '').toLowerCase()
  const rd = {}

  // Website platform detection
  const platforms = {
    wordpress: /wordpress|wp /i,
    wix: /\bwix\b/i,
    squarespace: /squarespace/i,
    godaddy: /godaddy/i,
    prosites: /prosites/i,
    weebly: /weebly/i,
    demandforce: /demandforce template/i,
    imagepro: /imagepro/i,
    petsites: /petsites/i,
  }
  let detectedPlatform = null
  for (const [name, re] of Object.entries(platforms)) {
    if (re.test(prospect.notes || '')) { detectedPlatform = name; break }
  }

  // Website issues detection
  const issuePatterns = [
    [/broken ssl|ssl broken|ssl error|ssl certificate/i, 'broken_ssl'],
    [/no website|no standalone website|no site/i, 'no_website'],
    [/dated|outdated|basic|old|early 2000s/i, 'dated_design'],
    [/no mobile|not mobile|no responsive/i, 'no_mobile'],
    [/broken contact|contact.+broken/i, 'broken_contact_form'],
    [/no seo|no local seo|zero.*seo|minimal seo|no blog/i, 'no_seo'],
    [/no social|no.*social media|limited social|no facebook|no instagram/i, 'no_social'],
    [/no gmb|no google|no.*google business/i, 'no_gmb'],
    [/placeholder|template|stock photo|getty/i, 'template_or_placeholder'],
    [/yahoo email|gmail|comcast email|sbcglobal/i, 'unprofessional_email'],
    [/no e-commerce|no ecommerce/i, 'no_ecommerce'],
    [/confusing|brand confusion|multiple.*names|competing.*domain/i, 'brand_confusion'],
  ]
  const issues = []
  for (const [re, label] of issuePatterns) {
    if (re.test(prospect.notes || '')) issues.push(label)
  }

  // Opportunities detection
  const oppPatterns = [
    [/website redesign|website moderniz|website creation|site rebuild|redesign|full.*rebuild/i, 'website_redesign'],
    [/reputation management|mixed reviews|poor.*rating|negative reviews/i, 'reputation_management'],
    [/local seo|seo optimization|seo targeting|geo.*aeo/i, 'local_seo'],
    [/social media|social presence|social setup/i, 'social_media'],
    [/gmb optim|google business|gmb setup/i, 'gmb_optimization'],
    [/review gen|review strategy/i, 'review_generation'],
    [/content market|blog content|content strategy/i, 'content_marketing'],
    [/google ads|paid search|ppc/i, 'paid_search'],
    [/e-commerce|online sales|online store/i, 'ecommerce'],
  ]
  const opportunities = []
  for (const [re, label] of oppPatterns) {
    if (re.test(prospect.notes || '')) opportunities.push(label)
  }
  // Default opportunities if none detected
  if (opportunities.length === 0 && prospect.stage === 'researched') {
    opportunities.push('website_redesign', 'local_seo', 'gmb_optimization')
  }

  // Urgency
  let urgency = 'medium'
  if (/time.?sensitive|critical|urgent|expires|broken ssl/i.test(prospect.notes || '')) urgency = 'high'
  if (/could benefit|functional|professional/i.test(prospect.notes || '')) urgency = 'low'
  if (prospect.tags?.includes('whale') || prospect.tags?.includes('urgent')) urgency = 'high'
  if (prospect.tags?.includes('top-10')) urgency = urgency === 'low' ? 'medium' : urgency

  // Deal value estimate
  const dealMatch = (prospect.notes || '').match(/deal value:\s*(\$[\d,K\-\+]+)/i)
  const dealEstimate = dealMatch ? dealMatch[1] : null

  // Review platforms
  const reviewPlatforms = []
  if (prospect.google_rating || prospect.google_review_count) reviewPlatforms.push('google')
  if (prospect.yelp_rating || prospect.yelp_review_count) reviewPlatforms.push('yelp')
  if (/surecritic/i.test(prospect.notes || '')) reviewPlatforms.push('surecritic')
  if (/demandforce/i.test(prospect.notes || '')) reviewPlatforms.push('demandforce')
  if (/carwise/i.test(prospect.notes || '')) reviewPlatforms.push('carwise')
  if (/birdeye/i.test(prospect.notes || '')) reviewPlatforms.push('birdeye')
  if (/avvo/i.test(prospect.notes || '')) reviewPlatforms.push('avvo')
  if (/healthgrades/i.test(prospect.notes || '')) reviewPlatforms.push('healthgrades')
  if (/bbb|a\+/i.test(prospect.notes || '')) reviewPlatforms.push('bbb')
  if (/houzz/i.test(prospect.notes || '')) reviewPlatforms.push('houzz')
  if (/homeadvisor/i.test(prospect.notes || '')) reviewPlatforms.push('homeadvisor')

  // Build the structure
  rd.website = {}
  if (detectedPlatform) rd.website.platform = detectedPlatform
  if (issues.length > 0) rd.website.issues = issues

  if (reviewPlatforms.length > 0) rd.review_platforms = reviewPlatforms
  if (opportunities.length > 0) rd.opportunities = opportunities
  rd.urgency = urgency
  if (dealEstimate) rd.deal_estimate = dealEstimate

  return rd
}

// ─── MASTER PROSPECT DATA ───
// Each entry: [business_name, owner, address, email, phone, ratingStr, industry, stage, demoUrl, pageCount, tags[], notes]
const RAW = [
  // ═══════════════════════════════════════════════
  // WHALES & TOP-10 (highest priority)
  // ═══════════════════════════════════════════════
  ["Edwards & Everhart Dental", "Dr. Shellie Edwards", "4695 Golden Foothill Pkwy, El Dorado Hills, CA 95762", "contactus@edwardseverhartdental.com", "(916) 939-9912", "4.6 (Google)", "dental", "demo_built", "https://edev.demandsignals.us", 110, ["whale","dental","top-10"], "37 demo iterations — most iterated prospect. Broken contact form, ProSites template. 1,755 reviews across 5 platforms. DM Serif Display typography, dark slate + gold palette."],
  ["D. Martel Plumbing", "Dan Martel", "1136 Suncast Ln Ste #6, El Dorado Hills, CA 95762", "service@dmartelplumbing.com", "(916) 933-6363", "4.5 (Yelp)", "plumbing", "demo_built", "https://dmap.demandsignals.dev", 261, ["whale","plumbing","top-10"], "261+ page demo — most impressive technical showcase. 1000+ reviews aggregated. BBB A+."],
  ["Good Guys Heating & Cooling", "Bill Roberts", "4400 Business Dr Ste 100, Shingle Springs, CA 95682", null, "(530) 288-6291", "4.9 (Google - 1044 reviews)", "hvac", "demo_built", null, null, ["whale","hvac"], "1,044 reviews at 4.9 stars. Locally owned, founded 2019. Could benefit from advanced SEO strategy, social media content marketing, ongoing GMB optimization."],
  ["Golden Foothills Oral Surgery", "Dr. Donald R", "4901 Golden Foothill Pkwy, El Dorado Hills, CA 95762", null, "(916) 941-9860", null, "dental", "demo_built", null, null, ["whale","dental","medspa"], "$5-50K procedures. Cosmetics (Botox/fillers/rhinoplasty) invisible online. Domain only says implants. Deal value: $8-15K."],
  ["G & O Body Shop Inc.", "Ted Cooper", "7515 Green Valley Rd, Placerville, CA 95667", null, "(530) 622-3367", "4.8 (Yelp)", "auto", "researched", null, null, ["whale","auto"], "1,206 Carwise reviews. Family-owned 50+ years. BBB A+. Basic/dated site. NEEDS DEMO BUILT. Deal value: $4-8K."],
  ["OBO' Italian Table & Bar", "Josh Nelson", "4370 Town Center Blvd Ste 120, El Dorado Hills, CA 95762", null, "(916) 932-5025", null, "restaurant", "researched", null, null, ["whale","urgent","restaurant"], "TIME SENSITIVE — replaced Selland's Jan 2026. Menu PDFs not crawlable. Capture Selland's residual search traffic. Deal value: $3-12K. NEEDS DEMO BUILT."],
  ["Platt Group - South Fork Grille", "Mark Platt & Karoline Platt", "4364 Town Center Blvd Ste 124, El Dorado Hills, CA 95762", null, "(916) 458-0206", null, "restaurant", "researched", null, null, ["whale","restaurant","platt-group"], "Part of Platt Group (3 restaurants). 514 Yelp reviews. 3,091 combined across South Fork + Sienna + Land Ocean. Pitch as group deal: 3 sites + social + SEO. Total deal: $15-25K."],
  ["Platt Group - Sienna Restaurant", "Mark Platt & Karoline Platt", "1006 White Rock Rd Ste 200, El Dorado Hills, CA 95762", null, "(916) 941-9694", null, "restaurant", "researched", null, null, ["whale","restaurant","platt-group"], "Part of Platt Group. 1,312 Yelp reviews. Gluten-free menu. Private events 150 cap."],
  ["Platt Group - Land Ocean Restaurant", "Mark Platt & Karoline Platt", "2720 E Bidwell St, Folsom, CA 95630", null, "(916) 936-6000", null, "restaurant", "researched", null, null, ["whale","restaurant","platt-group"], "Part of Platt Group. 1,265 Yelp reviews. Steakhouse. GA4 cross-domain tracking detected."],
  ["Cantorbridge Financial", "Chris Rasmussen", "4364 Town Center Blvd Ste 211, El Dorado Hills, CA 95762", null, "(916) 693-5073", null, "financial", "researched", null, null, ["whale","financial"], "$500K+ AUM clients. Squarespace site — no content, no fiduciary messaging, no blog. Independent fiduciary. Deal value: $15-25K. NEEDS DEMO BUILT."],

  // ═══════════════════════════════════════════════
  // DEMO BUILT (.us and .dev sites)
  // ═══════════════════════════════════════════════
  ["Cramer & Hoch Law", "David Cramer", "474 Main St, Placerville, CA 95667", null, "(916) 990-3730", "3.9 (Google - 7 reviews)", "legal", "demo_built", "https://claw.demandsignals.dev", 50, ["legal"], "Criminal defense, 9 counties. Polarizing reviews with no owner responses. Sacramento phone for Placerville practice."],
  ["Adrenaline Construction", null, "4995 S Shingle Rd, Shingle Springs, CA 95682", "Kyle@adrenalineconstruction.com", "(530) 329-4939", "5.0 (Google - 16 reviews)", "contractor", "demo_built", "https://adrenaline.demandsignals.us", 72, ["contractor"], "Clean Wix site. Grading, excavation, driveways, ponds, septic, retaining walls. Zero blog, no local SEO. Built by Sierra Foothills Media. License #954673."],
  ["Double Dub Construction", "William Walker", "3381 Sky Ln, Shingle Springs, CA 95682", null, "(530) 748-1305", null, "contractor", "demo_built", "https://ddub.demandsignals.dev", 40, ["contractor","top-10"], "3rd gen builder. Early 2000s HTML design — embarrassing. No SSL, no mobile. Decks/remodeling. License #878663."],
  ["Fan Chiropractic", "Dr. Fan", "2920 Cold Springs Rd Suite B, Placerville, CA 95667", "fan.chiropractic@gmail.com", "(530) 869-6514", "5.0 (Google - 65 reviews)", "chiropractic", "demo_built", "https://fach.demandsignals.dev", 71, ["chiropractic","top-10"], "Perfect 5.0, 65 reviews. Drop table technique specialist. Cash-only model. Neuro chiropractic."],
  ["Placerville Animal Surgery Center", "Dr. Raymond", "415 Placerville Dr Suite N, Placerville, CA 95667", "415pasc@gmail.com", "(530) 957-2236", "4.9 (Google - 59 reviews)", "veterinary", "demo_built", "https://pasc.demandsignals.dev", 30, ["veterinary","top-10"], "Affordable surgery positioning. Reddit-found. Budget-friendly. 59 reviews at 4.9."],
  ["Hall Chiropractic", "Dr. Esther Hall", "183 Placerville Dr Suite A, Placerville, CA 95667", "mrgkj@comcast.net", "(530) 622-8041", "4.8 (Google - 8 reviews)", "chiropractic", "demo_built", "https://hach.demandsignals.dev", 60, ["chiropractic"], "Female-owned family/pediatric chiropractor. Only 8 reviews. hach.demandsignals.us returns 404."],
  ["Jackson Chiropractic Inc.", "Dr. G. Keith Jackson", "3330 Cameron Park Drive Suite 200, Cameron Park, CA 95682", null, null, null, "chiropractic", "demo_built", "https://jach.demandsignals.dev", 100, ["chiropractic"], "Over 30 years in practice. Decent website content but no social media links. Limited digital visibility."],
  ["Cameron Park Chiropractic", "Dr. Zach Sattler", "3370 Country Club Dr, Cameron Park, CA 95682", "ZachSattlerDC@gmail.com", "530-417-8587", null, "chiropractic", "demo_built", "https://capc.demandsignals.dev", 50, ["chiropractic"], "Newer practice with modern approach (shockwave/laser therapy). Uses Jane App for booking. No visible Google reviews."],
  ["Folsom Painting Company", null, "50 Iron Point Cir #140-55, Folsom, CA 95630", null, "(916) 545-1790", null, "contractor", "demo_built", "https://fopa.demandsignals.dev", 30, ["contractor"], "Generic template site. No team photos, no owner name, no license number. No before/after gallery. No GMB listing despite high-search-volume trade."],
  ["Placerville Animal Wellness", "Dr. Raymond", "384 Placerville Dr, Placerville, CA 95667", "doctorraymond888@gmail.com", "(530) 622-3595", "4.7 (Google - 254 reviews)", "veterinary", "demo_built", "https://plan.demandsignals.dev", 40, ["veterinary"], "Holistic vet with chiropractic/acupuncture for animals. 254 reviews. Unique positioning."],
  ["ADCO Driveline & Custom Exhaust", "Ken Short", "4211 Sunset Lane Suite 109, Shingle Springs, CA 95682", "adcodriveline@yahoo.com", "(530) 676-1516", null, "auto", "demo_built", "https://adco.demandsignals.us", null, ["auto"], "Specialty auto shop since 1974. Driveline and exhaust. Over 50 years. Minimal online presence."],
  ["Advanced Chiropractic & Sports", "Dr. Hale & Jonni Hale", "2800 Mallard Ln #5760, Placerville, CA 95667", null, "(530) 622-3600", "5.0 (Google - 5 reviews)", "chiropractic", "demo_built", "https://advanced.demandsignals.us", null, ["chiropractic"], "Husband/wife team with holistic/sports focus. Only 5 reviews. Needs complete digital build-out."],
  ["Airport Pet Clinic", "Dr. Manat Kamboj", "2995 Alhambra Dr, Cameron Park, CA 95682", "apcstaffinfo@gmail.com", "530-677-7387", "3.0", "veterinary", "demo_built", "https://airport.demandsignals.us", null, ["veterinary"], "Family-run vet clinic (father/daughter team) since 1984. New ownership Jan 2024. Mixed ratings. Needs reputation management for ownership transition."],
  ["Allen Brothers HVAC LLC", "Douglas Allen", "1242 Lucky St, Placerville, CA 95667", null, "(530) 805-5220", "4.7 (Google - 43 reviews)", "hvac", "demo_built", "https://allenbros.demandsignals.us", null, ["hvac","top-10"], "Family HVAC, 24/7 service. Basic website. Ranked #8 in top 10."],
  ["Cambridge Chiropractic", "Dr. Petrice Foxworthy", "4058 Flying C Rd Ste 13, Cameron Park, CA 95682", "cambridgechiro@msn.com", "(530) 672-6451", null, "chiropractic", "demo_built", "https://cambridge.demandsignals.us", null, ["chiropractic"], "Family-owned since 2002. Owner active in local Chamber of Commerce. No Healthgrades rating despite 25 years experience."],
  ["Cold Springs Dental", "Dr. Dean Sands", "1008 Fowler Way Ste B, Placerville, CA 95667", "coldspringsdental@yahoo.com", "(530) 622-1221", null, "dental", "demo_built", "https://coldspring.demandsignals.us", null, ["dental","top-10"], "Best Dentist in El Dorado County 11 consecutive years. Yahoo email. Dated site. Ranked #4."],
  ["Conforti Plumbing", "Nick Collins", "6080 Pleasant Valley Rd Ste C, El Dorado, CA 95623", "confortiplumbing@comcast.net", "(530) 622-0202", "4.0 (Yelp)", "plumbing", "demo_built", "https://conforti.demandsignals.us", null, ["plumbing","top-10"], "48 years in business. BBB A+. Mixed online reviews. 3 demo versions built. Ranked #9."],
  ["Shepherd Family Chiropractic", "Dr. Matt Shepherd", "279 Placerville Drive Suite C, Placerville, CA 95667", null, "(530) 621-4090", null, "chiropractic", "demo_built", null, null, ["chiropractic"], "Formerly listed as 'Sierra Foothills Chiropractic'. Actual name: Shepherd Family Chiropractic (sfcwellness.com). 35+ years. Massage, pediatric, nutrition."],
  ["Placerville Dental Care", "Dr. Russell", "941 Spring St STE 6, Placerville, CA 95667", "PDC@PLACERVILLEDENTAL.COM", "(530) 622-9412", "5.0 (Google - 191 reviews)", "dental", "demo_built", null, null, ["dental"], "Female-owned. 191 reviews at 5.0. Strong reputation. Needs social media, content marketing, GEO/AEO."],
  ["Placerville Veterinary Clinic", "Dr. Heather Carmody", "6610 Mother Lode Dr, Placerville, CA 95667", "placervillevet@gmail.com", "(530) 622-3943", "4.7 (Google)", "veterinary", "demo_built", null, null, ["veterinary"], "Established since 1974. 98.29% satisfaction. Dated design. Needs modernization."],
  ["Culture Aesthetics & Salon", "Janet Jones", "4357 Town Center Blvd Ste 114, El Dorado Hills, CA 95762", null, "(916) 790-8511", null, "medspa", "demo_built", null, null, ["medspa","aesthetics"], "WIX. 30-char domain. Walk-in injectable bar BURIED. Booking split Vagaro + Fresha. Aveda + medspa crammed into flat Wix."],
  ["Loyal Arms", "Ricky Gan", "1008 Riley St, Ste 4, Folsom, CA 95630", null, "(916) 680-9888", "4.4 (Google)", "firearms", "demo_built", "https://loyalarms.com", null, ["firearms","urgent"], "CRITICAL: SSL broken NOW. Split across 2 domains — loyalarms.com (WordPress broken) + shop.loyalarms.com (Gearfire e-commerce). Only prospect with online sales. Financing, cart, thousands of SKUs."],
  ["Foothill Ammo", "Chris Puehse", "3977 Durock Rd, Shingle Springs, CA 95682", null, "(530) 677-5280", "5.0 (Google - 49 reviews)", "firearms", "demo_built", null, null, ["firearms"], "Weebly platform (end-of-life). Dead Google Analytics since July 2023. No functional e-commerce. Perfect 5.0 not leveraged. Same Hwy 50 corridor."],
  ["Bighorn Gunshop", "Bill", "6271 Pleasant Valley Rd, El Dorado, CA 95623", null, "(530) 642-1892", "3.4 (Google - 43 reviews)", "firearms", "demo_built", null, null, ["firearms"], "GoDaddy single-page. Getty watermark visible (licensing liability). No e-commerce. Comcast email. Confusing hours."],
  ["Na Martial Arts", "Master HyungKyung Na", "2766 E Bidwell St Ste H500, Folsom, CA 95630", null, "(916) 805-5743", "5.0 (Google)", "fitness", "demo_built", null, null, ["fitness"], "Wix '/about-7' pages. 15 intl gold medals NOWHERE on site. Gmail. Women-owned. Perfect 5.0. Deal value: $3-6K."],

  // ═══════════════════════════════════════════════
  // OUTREACH STAGE
  // ═══════════════════════════════════════════════
  ["Southside MMA", null, "Phuket, Thailand", null, null, null, "fitness", "won", null, null, ["fitness","international"], "Phuket Thailand. Full audit + proposal sent. WON — first international client."],

  // ═══════════════════════════════════════════════
  // RESEARCHED — NEEDS DEMO BUILT
  // ═══════════════════════════════════════════════
  ["Vera Dooley DDS", "Dr. Vera Dooley", "708 Main St, Placerville, CA 95667", "info@dooleydds.com", "(530) 622-3256", "5.0 (Google - 86 reviews)", "dental", "researched", null, null, ["dental","top-10"], "Perfect 5.0 with 86 reviews. Loyal patients, needs modernization. Ranked #3 in top 10 highest probability closes. NEEDS DEMO BUILT."],
  ["Hangtown Body Shop & Auto Glass", "Deva", "485 Pierroz Rd A, Placerville, CA 95667", "deva@hangtownbodyshop.com", "(530) 622-7940", "4.9 (Google - 72 reviews)", "auto", "researched", null, null, ["auto","top-10"], "Family-owned. Also does auto glass. 72 reviews at 4.9. Ranked #5 in top 10. NEEDS DEMO BUILT."],
  ["Lock n Load Concealed Carry Training", "Justin Lungren", "1061 Suncast Ln, El Dorado Hills, CA 95762", null, "(916) 705-2258", "5.0 (Google - 8 reviews)", "firearms", "researched", null, null, ["firearms"], "WordPress. Acuity Scheduling. $175-$275 class pricing. Classes at Holiday Inn Express. CCW training complements Hangtown Range. NEEDS DEMO BUILT."],
  ["Sierra Mountain Firearms", "Morgan Lowder", "4050 Durock Rd, Ste 17, Shingle Springs, CA 95682", null, "(530) 387-0110", null, "firearms", "researched", null, null, ["firearms"], "GoDaddy template. Repeated placeholder content. Basic typography. NEEDS DEMO BUILT."],
  ["Vintage Tactical Arms LLC", null, "3083 Warren Lane, El Dorado Hills, CA 95762", null, "(916) 586-0361", null, "firearms", "researched", null, null, ["firearms"], "No website found. Home-based FFL dealer. Opportunity to build from scratch. NEEDS DEMO BUILT."],
  ["The MD Aesthetics", "Dr. Tarandeep Kaur", "4355 Town Center Blvd Ste 210, El Dorado Hills, CA 95762", null, "(916) 294-7428", null, "medspa", "researched", null, null, ["medspa","aesthetics"], "Title tags say 'Medical Spa' TWICE. Board-certified Dr. Kaur under-leveraged. NEEDS DEMO BUILT."],
  ["Asante Spa", "Scott Walters", "530 Post Ct, El Dorado Hills, CA 95762", null, "(916) 933-8905", null, "medspa", "researched", null, null, ["medspa","aesthetics"], "Hiding inside gym parent website. No standalone domain. 96 Yelp reviews. High-ticket spa. NEEDS DEMO BUILT."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — LEGAL
  // ═══════════════════════════════════════════════
  ["Aaron B. Dosh, Attorney at Law", "Aaron B. Dosh", "2700 Coloma St, Placerville, CA 95667", "admin@doshlaw.com", "(530) 622-0309", "3.8 (Google - 16 reviews)", "legal", "researched", null, null, ["legal"], "Family law. Mixed reviews (3.8) — reputation management opportunity. Website is basic. Needs reputation strategy, GMB response protocol, redesign, local SEO."],
  ["Adam Weiner Attorney at Law", "Adam Weiner", "5170 Golden Foothill Pkwy, El Dorado Hills, CA 95762", "aweiner@weinerlawoffices.com", "(916) 933-2174", "4.2 (Google)", "legal", "researched", null, null, ["legal"], "Yelp presence but no visible standalone website. Solo practice in premium EDH location. Needs website with practice area pages."],
  ["George Cilley, Attorney at Law", "George Cilley", "550 Main St Suite B1B, Placerville, CA 95667", "george@cilleylaw.com", "(530) 663-8823", "4.0 (Google - 4 reviews)", "legal", "researched", null, null, ["legal"], "Probate & estate attorney. Only 4 reviews. Limited online presence. Needs complete digital overhaul."],
  ["Laura Rose Nelson-Becker, Attorney", "Laura Rose Nelson-Becker", "263 Main St 2nd floor, Placerville, CA 95667", "laura@bncj-law.com", "(530) 617-1692", "4.4 (Google - 7 reviews)", "legal", "researched", null, null, ["legal"], "Estate planning attorney. Only 7 reviews. Shares building with MTZ Legal. Needs local SEO, review generation, content marketing."],
  ["Law Office of Gregory S. Clark", "Gregory S. Clark", "3084 Cedar Ravine Road, Placerville, CA 95667", "greg@gregclarklaw.com", "(530) 626-5175", null, "legal", "researched", null, null, ["legal"], "Solo law practice — family law, criminal defense, estate planning. 15 years experience. Professional website but could use SEO."],
  ["Law Office of Paul R. Kraft", "Paul R. Kraft", "5170 Golden Foothill Pkwy, El Dorado Hills, CA 95762", "paul@kraftlawoffice.com", "(530) 344-0204", null, "legal", "researched", null, null, ["legal"], "Estate planning and probate. 24 years experience but limited online visibility. Basic website. Needs redesign, GMB, social media."],
  ["Layla Cordero Law, PC", "Layla Cordero", "78 Main St, Placerville, CA 95667", "layla@laylacorderolaw.com", "(530) 620-5022", "5.0 (Google - 3 reviews)", "legal", "researched", null, null, ["legal"], "Main St. Only 3 reviews despite 5.0. Extremely low visibility. Prime candidate — great reputation with almost zero digital footprint."],
  ["MTZ Legal", "Lilka B. Martinez", "263 Main St Level 2, Placerville, CA 95667", "lilka@mtzlegal.com", "(916) 288-8820", null, "legal", "researched", null, null, ["legal"], "Boutique family law. 9.9/10 Avvo rating. Professional Squarespace site. Could benefit from local SEO, social media for thought leadership."],
  ["El Dorado Law", "Adam Charles Clark", "520 Main Street, Placerville, CA 95667", null, "(530) 626-7562", null, "legal", "researched", null, null, ["legal"], "7.3/10 Avvo rating. Basic website. Needs redesign, local SEO, social media, GMB optimization."],
  ["Law Office of Daniel Hernandez", "Daniel Hernandez", "2865 Sunrise Blvd, Ste 109, Rancho Cordova, CA 95742", null, null, "3.9 (Google - 7 reviews)", "legal", "researched", null, null, ["legal"], "Workers' comp attorney. Only 7 Yelp reviews. No standalone website. High-value practice area. Needs site, GMB, PPC."],
  ["The Swenson Law Firm", "Swenson", "8788 Greenback Ln Ste 105, Orangevale, CA 95662", null, "(279) 499-7921", "4.0 (Google)", "legal", "researched", null, null, ["legal"], "Basic website. No SEO content, no blog, no GMB optimization. Orangevale location underserved digitally."],
  ["Wraymond Plummer — Attorney", "Wraymond Plummer", "770 L St #950, Sacramento, CA 95814", null, "(916) 241-3434", null, "legal", "researched", null, null, ["legal"], "Listed on Cornell LII only. No GMB, no dedicated website. Serving EDH area. Needs complete digital presence."],
  ["Tom R. Johnson — Workers Comp Attorney", "Tom R. Johnson", "865 Howe Ave Suite 205, Sacramento, CA 95825", null, "(916) 922-9902", null, "legal", "researched", null, null, ["legal"], "Justia only. No GMB, no modern website. Workers' comp = highest CPC legal practice area — enormous paid search opportunity being missed."],
  ["Moseley Cary Collins III — Attorney", "Moseley C. Collins III", "2222 Francisco Dr #220-133, El Dorado Hills, CA 95762", null, "(800) 426-5546", null, "legal", "researched", null, null, ["legal"], "46 years experience. Justia only. No GMB, no modern website. Virtual office address. Needs full digital overhaul."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — DENTAL
  // ═══════════════════════════════════════════════
  ["Adams Cameron Park Dentistry", "Dr. Nathan Adams / Dr. John F. Adams", "3421 Robin Lane, Cameron Park, CA 95682", null, "(530) 677-8181", null, "dental", "researched", null, null, ["dental"], "Family dental since 1981. Mixed Healthgrades reviews — needs reputation management. Website functional but could be modernized."],
  ["El Dorado Hills Dental", "Dr. Jim Cope / Dr. Ben Cope / Dr. Austin Cope", "1220 Suncast Ln, El Dorado Hills, CA 95762", null, "(916) 933-9080", null, "dental", "researched", null, null, ["dental"], "38-year 3-generation family practice. IV Sedation with RN. Spanish-speaking. Old migration pages visible."],
  ["El Dorado Hills Dental Wellness", "Dr. Rika Prodhan-Ashraf", "2222 Francisco Dr Ste 460, El Dorado Hills, CA 95762", null, "(916) 933-3011", null, "dental", "researched", null, null, ["dental"], "New practice (2023). 666KB homepage. Competing .co domain. Thin SEO. Hungry for patients."],
  ["Forest Ridge Dental Health & Wellness", "Dr. Forrest Boozer", "2530 Cameo Dr, Cameron Park, CA 95682", null, "(530) 676-9999", null, "dental", "researched", null, null, ["dental"], "Family-owned. Recently rebranded. Needs SEO to consolidate brand identity after rebrand."],
  ["Golden Grove Dental", "Dr. Mathew Delgadillo / Dr. Alice Chun", "3168 Turner St Ste 300, Placerville, CA 95667", null, "(530) 643-4163", "5.0 (Google)", "dental", "researched", null, null, ["dental"], "Excellent Google rating. Relatively new practice. Could benefit from SEO to build visibility."],
  ["Green Valley Dental Group", "Dr. Ryan Zleik", "2205 Francisco Dr Ste 150, El Dorado Hills, CA 95762", null, "(916) 934-0207", null, "dental", "researched", null, null, ["dental"], "Cookie-cutter Smile Generation template. CEREC same-day crowns buried. No differentiation."],
  ["Lyons Orthodontics", "Dr. Timothy Lyons", "4420 Town Center Blvd Ste 200, El Dorado Hills, CA 95762", null, "(916) 933-8820", null, "dental", "researched", null, null, ["dental"], "20+ years. 46 reviews. Losing ground to Legendary Orthodontics digitally."],
  ["Mallard Lane Dental", "Dr. Ike H. Rahimi", "2808 Mallard Ln, Placerville, CA 95667", null, "(530) 622-0701", "4.6 (Healthgrades - 23 reviews)", "dental", "researched", null, null, ["dental"], "Family-run since 2006. Good Healthgrades but limited Google/Yelp presence."],
  ["Missouri Flat Dental Group", "Dr. Michael Stout", "3967 Missouri Flat Rd Ste 120, Placerville, CA 95667", null, "(530) 642-2876", "4.2 (Google - 179 reviews)", "dental", "researched", null, null, ["dental"], "Mixed ratings (4.2 Google vs 3.2 Yelp). Part of Smile Generation network. Needs reputation management."],
  ["One Loose Tooth / Mountain Dental", "Dr. Keith", "596 Main St, Placerville, CA 95667", "office@oneloosetoothdental.com", "(530) 642-8614", "5.0 (Google - 316 reviews)", "dental", "researched", null, null, ["dental"], "Natural/pediatric dentistry with dual branding. 316 reviews at 5.0. Unique positioning."],
  ["Pediatric Dental Specialists EDH", "Dr. Joseph T. Rawlins", "4420 Town Center Blvd Ste 220, El Dorado Hills, CA 95762", null, "(916) 941-1122", null, "dental", "researched", null, null, ["dental"], "17+ years. Special needs dental niche BURIED. Sedation dentistry. No online booking. Weak domain."],
  ["Placerville Dental Group", "Dr. Barinder Cheema", "699 Main Street, Placerville, CA 95667", null, "(530) 444-5322", null, "dental", "researched", null, null, ["dental"], "Multi-location dental group. Modern website but SEO could improve. Needs local SEO, community-focused social media."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — CHIROPRACTIC
  // ═══════════════════════════════════════════════
  ["Gold Country Chiropractic & Spa", "Dr. La Relle Plubell", "50 Main St, Placerville, CA 95667", null, "(530) 642-0224", null, "chiropractic", "researched", null, null, ["chiropractic"], "Two locations with confusing online presence. Limited hours. No visible social media."],
  ["Lowrey Chiropractic", "Dr. Judd Lowrey", "4909 Golden Foothill Pkwy, El Dorado Hills, CA 95762", null, "(916) 941-7508", "4.2 (Yelp - 23 reviews)", "chiropractic", "researched", null, null, ["chiropractic"], "Solo practitioner, 20+ years. Decent Yelp but no Healthgrades. Professional website."],
  ["Nelson Family Chiropractic", "Dr. Chad Nelson", "4200 Motherlode Dr, Shingle Springs, CA 95682", null, "(209) 679-3438", null, "chiropractic", "researched", null, null, ["chiropractic"], "Family practice. Open limited days. Shares phone with Manteca location creating confusion. Needs dedicated local SEO."],
  ["NorCal Spine & Sport", "Dr. Timothy P. Angelo", "903 Embarcadero Drive Suite 4, El Dorado Hills, CA 95762", null, "(916) 933-9870", "5.0 (Yelp - 21 reviews)", "chiropractic", "researched", null, null, ["chiropractic"], "Sports therapy clinic. Strong Yelp reviews but limited visibility beyond Yelp."],
  ["Placerville Chiropractic", "Dr. Moore", "941 Spring St #1, Placerville, CA 95667", null, "(530) 621-2225", "5.0 (Google - 5 reviews)", "chiropractic", "researched", null, null, ["chiropractic"], "Veteran-friendly. Only 5 reviews. Open 2 days/week. Extremely low digital presence."],
  ["Premier Healthcare & Sports Clinic", "Dr. John Palmer D.C.", "1980 Broadway, Placerville, CA 95667", null, "(530) 622-3536", "3.5 (Yelp - 12 reviews)", "chiropractic", "researched", null, null, ["chiropractic"], "Integrated healthcare — chiropractic + physical therapy. Mixed reviews suggest reputation management needed."],
  ["Revive Chiropractic", "Dr. Layna Larson", "484 Main Street Suite 16, Diamond Springs, CA 95619", null, "(530) 303-3028", null, "chiropractic", "researched", null, null, ["chiropractic"], "New practice in Diamond Springs. Very limited reviews. Needs visibility in Diamond Springs/Placerville corridor."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — MEDICAL / PT
  // ═══════════════════════════════════════════════
  ["Fitzpatrick Physical Therapy", "Fitzpatrick", "1252 Broadway SUITE B, Placerville, CA 95667", null, "(530) 622-9410", "4.8 (Google - 95 reviews)", "medical", "researched", null, null, ["medical"], "Established PT practice on Broadway (on your route). 95 reviews. Needs website optimization, social media, content marketing."],
  ["Healix Physical Therapy", "Rob Linson", "484 Pleasant Valley Rd Suite 14, Diamond Springs, CA 95619", "robertlinson@healixtherapy.com", "(530) 232-3739", null, "medical", "researched", null, null, ["medical"], "Traditional and mobile PT services. Modern website but new business needs visibility. Unique mobile PT offering."],
  ["Cameron Park Physical Therapy Center", "Steven Harrity", "1060 Camerado Dr, Cameron Park, CA 95682", null, "(530) 676-7184", null, "medical", "researched", null, null, ["medical"], "PT-owned since 2000. Basic and outdated website. Strong local reputation but minimal digital presence."],
  ["Reset Physical Therapy", "Amanda Morgan", "4669 Golden Foothill Pkwy Ste 208, El Dorado Hills, CA 95762", null, "(530) 306-2861", null, "medical", "researched", null, null, ["medical"], "Boutique PT. Specializes in Jiu-Jitsu athletes. Domain too long. Also has resetpt.com = brand fragmentation. Solo practitioner."],
  ["Ronald J. Vardanega, OD", "Dr. Vardanega", "1287 Broadway, Placerville, CA 95667", null, "(530) 622-1711", "4.5 (Google - 10 reviews)", "medical", "researched", null, null, ["medical"], "Solo optometrist on Broadway. Only 10 reviews. Controversial review about mask/vaccine policy. Needs reputation management."],
  ["Sierra Orthopaedic & Athletic Rehab", "Joshua", "4300 Golden Center Dr Suite B, Placerville, CA 95667", null, "(530) 344-2045", "4.9 (Google - 32 reviews)", "medical", "researched", null, null, ["medical"], "Sports rehab/ortho PT. 32 reviews at 4.9. Needs website SEO targeting sports rehab searches."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — VETERINARY
  // ═══════════════════════════════════════════════
  ["El Dorado Hills Pet Clinic", "Dr. Chris Garden", "1011 St Andrews Dr # E, El Dorado Hills, CA 95762", "eldoradohillspetc@gmail.com", "(916) 933-3363", null, "veterinary", "researched", null, null, ["veterinary"], "PetSites template. 'About PetSites' visible in search. Gmail. 23 reviews. Housecalls and telemedicine."],
  ["Goldorado Animal Hospital", "Dr. Jennifer Glavis", "3460 Palmer Dr Ste A, Cameron Park, CA 95682", null, "(530) 677-8387", "4.2 (Google)", "veterinary", "researched", null, null, ["veterinary"], "AAHA-accredited since 1989. Functional website. Could benefit from social media, SEO, GMB with regular posts."],
  ["MarketPlace Veterinary Hospital", null, "4564 Post St Ste 100, El Dorado Hills, CA 95762", null, "(916) 939-1705", null, "veterinary", "researched", null, null, ["veterinary"], "44 Yelp reviews but no prominent Google rating. Professional website. Owner info not public."],
  ["Veterinary Healing Center", "Dr. Brad Cahoon / Dr. Holly Cahoon", "2222 Francisco Drive #150, El Dorado Hills, CA 95762", null, "(916) 933-6030", "4.7 (Google)", "veterinary", "researched", null, null, ["veterinary"], "Full-service animal hospital — Western and Eastern medicine including acupuncture. Some complaints about phone communication."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — AUTO
  // ═══════════════════════════════════════════════
  ["All Auto Repair and Tire Center", "Terri Klein", "3581 China Garden Rd Unit E3, Placerville, CA 95667", "allautorepair4050@yahoo.com", "(530) 677-3488", "5.0 (Demandforce - 159 reviews)", "auto", "researched", null, null, ["auto"], "Family-owned 50+ years. Excellent Demandforce reviews. Basic/dated website (Demandforce template)."],
  ["Automotive Excellence", "Ross & Randi Mitchelson", "4600 Missouri Flat Rd #14, Placerville, CA 95667", "autoxonline@gmail.com", "(530) 622-7696", "4.9 (SureCritic - 817 reviews)", "auto", "researched", null, null, ["auto"], "Family-owned since 1999. Outstanding reviews. NAPA AutoCare Center. Strong SureCritic but limited broader visibility."],
  ["Cameron Park Automotive", "Debbie O'Brien", "3321 Durock Rd #B, Shingle Springs, CA 95682", null, "(530) 677-1576", "3.2 (SureCritic)", "auto", "researched", null, null, ["auto"], "Family-owned since 1989. ASE/AAA/NAPA certifications but poor online ratings (3.2). Needs reputation management."],
  ["Franks Body Shop, Inc.", "Rich", "2878 Cold Springs Rd, Placerville, CA 95667", "franksbodyshopinc@yahoo.com", "(530) 622-8033", "4.9 (Google - 51 reviews)", "auto", "researched", null, null, ["auto"], "Family-run. Everything from Cybertrucks to classics. 51 reviews at 4.9. Needs website with project showcase."],
  ["Fulmer's Auto Body & Paint", "Roy Fulmer", "680 Forni Rd, Placerville, CA 95667", "estimates@fulmersautobody.com", "(530) 344-1088", "4.6 (Google - 33 reviews)", "auto", "researched", null, null, ["auto"], "Family-owned. Owner Roy personally does paint work. 33 reviews. Needs website with portfolio gallery."],
  ["Kniesel's Collision - Shingle Springs", "Kniesel Family", "4031 Wild Chaparral Dr, Shingle Springs, CA 95682", null, "(530) 676-1888", null, "auto", "researched", null, null, ["auto"], "Family-owned chain (55+ years). Factory-trained, manufacturer certifications. Strong Carwise presence."],
  ["Lightfoot Automotive", "Michael E. Lightfoot", "6650 Merchandise Way, Diamond Springs, CA 95619", null, "(530) 295-5533", "4.7 (Yelp - 25 reviews)", "auto", "researched", null, null, ["auto"], "Independent auto repair. 19+ years, BBB A+. Basic website. Strong rep but low visibility."],
  ["Neil's Automotive", null, "810 Pleasant Valley Rd, Diamond Springs, CA 95619", null, "(530) 626-3203", null, "auto", "researched", null, null, ["auto"], "Established since 1979. DMV-certified smog center. Very basic website. Over 40 years but minimal digital footprint."],
  ["Placerville Body Shop Inc", "Mike", "1125 Broadway, Placerville, CA 95667", "pvillebody@sbcglobal.net", "(530) 622-5955", "4.6 (Google - 38 reviews)", "auto", "researched", null, null, ["auto"], "RIGHT on Broadway (on your route). Family-owned, 38 reviews. Needs website modernization."],
  ["Ponderosa Auto Express", "James Williams", "2981 Alhambra Dr, Cameron Park, CA 95682", "info@ponderosaautoexpress.com", "(530) 677-5138", "5.0 (Demandforce)", "auto", "researched", null, null, ["auto"], "Excellent reviews but basic website. Strong word-of-mouth but limited digital marketing."],
  ["Robinson's Automotive Inc.", "Marty Robinson", "6120 Enterprise Dr Suite C, Diamond Springs, CA 95619", null, "(530) 622-1577", "4.4 (Birdeye - 141 reviews)", "auto", "researched", null, null, ["auto"], "Family-owned since 2008. AAA/ASE. Good review volume. Specializes in EVs/European cars."],
  ["Sierra Auto Body", null, "680 Forni Rd, Placerville, CA 95667", null, "(530) 270-9198", null, "auto", "researched", null, null, ["auto"], "Family-owned 12+ years. Single-page website. No visible reviews or social media."],
  ["TrueCare Automotive", "Dave", "4253 Sunset Ln Ste A, Shingle Springs, CA 95682", "sanddauto@comcast.net", "(530) 212-6109", "5.0 (Carfax)", "auto", "researched", null, null, ["auto"], "Female-owned. Outstanding reviews (5.0 across platforms). Functional website. Needs SEO to capitalize on reputation."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — CONTRACTOR (construction, painting, roofing, landscaping, pest, tree, electric, handyman)
  // ═══════════════════════════════════════════════
  ["Ales Custom Home Solutions", null, "Cameron Park, CA 95682", null, "(916) 586-6229", null, "contractor", "researched", null, null, ["contractor"], "New area code suggests recent business. No website or GMB listing found. Custom home market in Cameron Park is high-value."],
  ["Bayshore Painters Inc.", "Brent Lockwood", "3841 Quest Court Unit 12, Shingle Springs, CA 95682", null, "(530) 676-3274", "4.5 (Yelp - 22 reviews)", "contractor", "researched", null, null, ["contractor"], "Painting contractor since 1995. BBB A+. Strong reputation but limited social media."],
  ["Diamond Peak Construction", "Armand Fitzgerald / John Panos", "1040 Finch Ct, Placerville, CA 95667", null, "(916) 884-0944", null, "contractor", "researched", null, null, ["contractor"], "Family-owned. Bilingual team. BuildZoom score 98 but limited online reviews. Not BBB accredited."],
  ["E. Durst Painting", "Ernie Durst", "3788 Cambridge Rd, Cameron Park, CA 95682", null, "(916) 712-7856", null, "contractor", "researched", null, null, ["contractor"], "Family-owned since 2011. BBB A+, EPA certification. Two-person operation. Nextdoor presence."],
  ["Eilhardt Electric", "Joe Eilhardt / Sampson J. Eilhardt", "2401 Loma Cima Dr, Placerville, CA 95667", null, "(530) 642-8643", null, "contractor", "researched", null, null, ["contractor"], "Outdated WordPress blog-style website. Not BBB accredited. Minimal online presence."],
  ["El Dorado Roofing Inc.", "Ed Borba", "P.O. Box 453, Camino, CA 95709", null, "(530) 626-1616", null, "contractor", "researched", null, null, ["contractor"], "52 years in business. Basic and dated website. Not BBB accredited. No visible social media."],
  ["Foothill Tree Service", "Chad Dykstra", "6201 Enterprise Dr Ste B, Diamond Springs, CA 95619", null, "(530) 621-1772", "4.4 (Google)", "contractor", "researched", null, null, ["contractor"], "Family business since 1965. ISA Arborist. Has website and Facebook. Good ratings."],
  ["Hangtown Pest Control", "Daniel & Paola Fiedler", "Placerville, CA 95667", null, "(530) 460-4789", "4.7 (Google - 25 reviews)", "contractor", "researched", null, null, ["contractor"], "Oldest pest control in Placerville. Family-owned. Not BBB accredited. Functional website."],
  ["Higgs Construction", "Higgs", "Folsom, CA 95630", null, "(408) 250-4000", "3.6 (Google)", "contractor", "researched", null, null, ["contractor"], "BBB accredited since 2010. Minimal/outdated website. Bay Area phone suggests relocation or expansion."],
  ["Hodges Construction", "Nick Hodges", "3440 El Dorado Hills Blvd, El Dorado Hills, CA 95762", "nick@hodgesconstruction.net", "(541) 912-2402", null, "contractor", "researched", null, null, ["contractor"], "THREE websites competing. 3rd-gen contractor. $10K-$100K remodels. Needs consolidation + rebuild."],
  ["Koby Pest Control", "Michael Kobus", "737 Placerville Dr, Placerville, CA 95667", null, "(530) 626-6774", null, "contractor", "researched", null, null, ["contractor"], "Family-owned since 1997. Voted Best Local Pest Control 20+ years. Active community member. Not BBB accredited."],
  ["Liberty Roofing Contractors", "Cameron Caldwell", "4295 Park Woods Dr, Fresh Pond, CA 95726", null, "(530) 207-0249", null, "contractor", "researched", null, null, ["contractor"], "BBB A+. Newer company (est. 2022). Owens Corning Preferred Contractor. Needs review generation."],
  ["More 4 Less Pest Control", "Mike Keith", "1390 Broadway Suite B-256, Placerville, CA 95667", null, "(530) 957-5425", null, "contractor", "researched", null, null, ["contractor"], "Family-owned since 2014. Basic website. Competes with larger pest control chains."],
  ["Newcomb Tree Experts", "Howdy & Marcie Newcomb", "El Dorado Hills, CA 95762", null, "(916) 572-2059", null, "contractor", "researched", null, null, ["contractor"], "Three-generation family business. Professional website. Encourages reviews but few visible."],
  ["Ponderosa Landscaping Inc.", "Dick Welch / Wes Powell", "3075 Alhambra Dr, Cameron Park, CA 95682", null, "(916) 847-9314", null, "contractor", "researched", null, null, ["contractor"], "Family-owned. 44 years experience. Nextdoor and Yelp presence. Basic website."],
  ["Resurrection Painting", "Kenneth Hogue", "2280 Winterhaven Dr, Cameron Park, CA 95682", null, "(530) 344-6746", null, "contractor", "researched", null, null, ["contractor"], "Family-owned 33+ years. BBB accredited since 2024. Basic website. Limited Yelp reviews."],
  ["RJM Builders", null, "542 Main Street, Placerville, CA 95667", null, "(530) 395-5073", null, "contractor", "researched", null, null, ["contractor"], "No aggregate ratings on major platforms. No visible social media engagement despite having accounts."],
  ["Sahleen Home Services", "Spencer Sahleen", "5821 Zarahemla Rd, Placerville, CA 95667", null, "(530) 620-5436", "5.0 (Yelp)", "contractor", "researched", null, null, ["contractor"], "Well-organized website but no social media links. Multiple business names (Sahleen Construction & Restoration) = brand confusion."],
  ["Segura Brothers Landscaping", "David", "Cameron Park, CA 95682", null, "(530) 325-9122", null, "contractor", "researched", null, null, ["contractor"], "Landscaping company. Basic website. Hardscape and lawn care. Needs project portfolio."],
  ["Solid Construction & Design", "Oleg/Vitaly", "5201 Auburn Blvd, Sacramento, CA 95841", null, "(916) 260-2062", "4.9 (Google - 157 reviews)", "contractor", "researched", null, null, ["contractor"], "Professional website, strong reviews. Sacramento-based but serves Hwy 50 corridor. 157 reviews."],
  ["South Fork Construction", "Jeff Teie", "2520 Prairie View Ln, Placerville, CA 95667", null, "(530) 306-9732", "5.0 (Houzz)", "contractor", "researched", null, null, ["contractor"], "Basic website design. No visible social media links. Good Houzz rating."],
  ["Spencer's Handyman Services", "Spencer", "1521 Winding Oak Lane, El Dorado Hills, CA 95762", null, "(916) 934-9915", "4.2 (Yelp)", "contractor", "researched", null, null, ["contractor"], "Site blocks scrapers (403). Yelp + Nextdoor presence. 24/7 availability. No Google Ads, no blog, no SEO targeting."],
  ["Tailored Tree Inc.", "Micah Smith", "5170 Golden Foothill Pkwy, El Dorado Hills, CA 95762", null, null, "5.0 (HomeAdvisor)", "contractor", "researched", null, null, ["contractor"], "BBB A+. 137 Yelp reviews. Could benefit from website SEO, social media, GMB optimization."],
  ["Tamasi Ross Construction", "Tracy Ross / Patrick Ross / Tony Tamasi", "5020 Greyson Creek Dr, El Dorado Hills, CA 95762", null, "(916) 516-4250", null, "contractor", "researched", null, null, ["contractor"], "LUXURY HOME BUILDER on WIX. Page titles truncate in Google. Featured in Luxury Home Magazine. Portfolio site + virtual tours needed."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — HVAC
  // ═══════════════════════════════════════════════
  ["Scotty's Heating & Air", "Scott V.", "3655 Chuckwagon Way Ste B, Placerville, CA 95667", null, "(530) 626-6000", "4.8 (Google)", "hvac", "researched", null, null, ["hvac"], "Professional website, good Google rating. Not BBB accredited. Could benefit from social media, content marketing."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — PLUMBING
  // ═══════════════════════════════════════════════
  ["Delta Plumbing Contractors", null, "2201 Francisco Drive, Ste 140-275, El Dorado Hills, CA 95762", null, "(916) 941-9581", null, "plumbing", "researched", null, null, ["plumbing"], "Bare-bones Squarespace. Placeholder content still visible. 40+ years experience completely wasted. Commercial plumbing for multi-family/renovation."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — FINANCIAL
  // ═══════════════════════════════════════════════
  ["J. Hoffman, CPA", "J. Hoffman", "640 Placerville Dr, Placerville, CA 95667", "jenee@jhoffmancpa.com", "(530) 622-2218", "5.0 (Google - 1 review)", "financial", "researched", null, null, ["financial"], "Solo CPA. Only 1 Google review. Virtually invisible online. Prime DSIG candidate."],
  ["Vukovich Insurance", "Troy Vukovich", "4641 Missouri Flat Rd Ste B, Placerville, CA 95667", "Tvukovich@farmersagent.com", "(530) 622-6912", null, "financial", "researched", null, null, ["financial"], "Family-owned since 1954. Two agencies under one roof. Very dated website. Strong local reputation but poor digital presence."],
  ["Weston & Tuttle CPAs", "Markham D. Tuttle CPA", "3420 Coach Lane Suite 11, Cameron Park, CA 95682", "admin@westonandtuttle.com", "(530) 676-1040", null, "financial", "researched", null, null, ["financial"], "Full-service CPA and wealth advisory. Functional but dated website. Needs modernization, GMB, social media."],
  ["ISU Insurance Services - Atwood Agency", null, "800 Pacific Street, Placerville, CA 95667", null, "(530) 626-2533", null, "financial", "researched", null, null, ["financial"], "Independent insurance agency serving CA since 1919. Over 100 years. Functional but dated website. Minimal social media."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — MEDSPA / SALON
  // ═══════════════════════════════════════════════
  ["Spa-520", "Angelique", "520 Main St, Placerville, CA 95667", null, "(530) 967-8342", "4.8 (Google - 12 reviews)", "medspa", "researched", null, null, ["medspa"], "Boutique spa on Main St. Hydrafacials, massage, chemical peels. Only 12 reviews. Small owner-operated."],
  ["Adagio for Hair", "Katy Pierce", "4356 Town Center Blvd, El Dorado Hills, CA 95762", null, "(916) 939-6604", null, "medspa", "researched", null, null, ["medspa"], "WordPress Astra 2+ versions behind. Yoast garbage meta descriptions."],
  ["Morgan Taylor Salon", "Dena Henry", "Montano de El Dorado, El Dorado Hills, CA 95762", null, "(916) 939-3868", null, "medspa", "researched", null, null, ["medspa"], "Aveda Concept Salon under-leveraged. Gmail. 110 reviews."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — RESTAURANT / HOSPITALITY
  // ═══════════════════════════════════════════════
  ["Dry Diggings Distillery", "Cris Steller", "5050 Robert J Mathews Pkwy, El Dorado Hills, CA 95762", null, "(530) 313-4000", null, "restaurant", "researched", null, null, ["restaurant"], "Has website and social media. Recently expanded with Hills Cocktails & Dining. Needs SEO for new dining concept."],

  // ═══════════════════════════════════════════════
  // NEW PROSPECTS — RETAIL / OTHER
  // ═══════════════════════════════════════════════
  ["American Heritage Real Estate", "Vincent Cavallini & Zoe", "3330 Cameron Park Drive, Ste 150, Cameron Park, CA 95682", "vcavallini@ahrep.com", "(530) 676-1307", null, "other", "researched", null, null, ["real-estate"], "Outdated IMAGEPRO template. Clunky navigation, URL structure exposes template. Has IDX/MLS but zero modern SEO. Serving 3 counties."],
  ["Lindsy Mahoney — Realtor", "Lindsy Mahoney", "12690 Thornberg Way, Rancho Cordova, CA 95742", null, "(916) 370-3118", null, "other", "researched", null, null, ["real-estate"], "No website, no GMB, no social presence. Only on Realtor.com. Prime candidate for full digital setup."],
  ["Mati Rosa Morphis — Realtor", "Mati Rosa Morphis", "950 Iron Point Rd Ste. 170, Folsom, CA 95630", "Mati-Rosa@MyRealtorMRM.com", "(916) 949-6509", "4.2 (Google)", "other", "researched", null, null, ["real-estate"], "Outdated personal website. No Google Ads, no IDX. Slow mobile load. Needs modern landing page + lead capture + local SEO."],
  ["Morris Williams Realty", null, "1024 Iron Point, Folsom, CA 95630", null, "(888) 326-3949", "2.8 (Google)", "other", "researched", null, null, ["real-estate"], "Low GMB rating with no management response to negative reviews. Outdated website, no mobile optimization."],
  ["Navigate Realty", "Nate Davis / Kelli Griggs", "183 Placerville Dr Ste C, Placerville, CA 95667", "kelli@teamnavigate.com", "(916) 343-6789", null, "other", "researched", null, null, ["real-estate"], "Boutique brokerage, two offices. Modern website. Could benefit from SEO, social media, GMB for both locations."],
  ["Placerville Realty Inc.", "Graeme Grant", "Placerville, CA 95667", "ggrant@placervillerealtyinc.com", "(530) 644-4585", null, "other", "researched", null, null, ["real-estate"], "Family-owned property management & real estate, 45+ years. Basic website."],
  ["Aladdin Pool Service", "Mark & Lisa Becker", "420 Ashland Ct, Cameron Park, CA 95682", null, "(530) 676-1500", null, "other", "researched", null, null, ["pool-service"], "Family-owned since 1988. 30+ years. Certified/licensed. Functional but dated website. No prominent ratings."],
  ["NorCal Aquarium & Wildlife", "Jeff Cox", "430 Palladio Pkwy Ste 1801, Folsom, CA 95630", null, "(916) 905-5010", null, "retail", "researched", null, null, ["retail","attraction"], "Unique attraction. Birthday parties + field trips. 25% off promo = traffic issues."],
  ["Superior Self Storage", "Dave Kindelt", "4250 Town Center Blvd, El Dorado Hills, CA 95762", null, "(916) 933-8999", null, "retail", "researched", null, null, ["retail","storage"], ".net domain. Storage template. Climate-controlled premium buried. Hwy-50 visibility."],

  // ═══════════════════════════════════════════════
  // ADDITIONAL SECOND-SECTION ENTRIES
  // ═══════════════════════════════════════════════
  ["Aladdin Pool Service", "Mark & Lisa Becker", "420 Ashland Ct, Cameron Park, CA 95682", null, "(530) 676-1500", null, "other", "researched", null, null, ["pool-service"], "Family-owned since 1988. 30+ years certified."], // dedup
]

// ─── Deduplicate by business_name + city ───
const seen = new Map()

function buildProspect(entry) {
  const [name, owner, fullAddr, email, phone, ratingStr, industry, stage, demoUrl, pageCount, tags, notes] = entry
  const loc = parseAddress(fullAddr)
  const rating = parseRating(ratingStr)

  const prospect = {
    business_name: name,
  }

  if (owner) prospect.owner_name = owner
  if (email) prospect.business_email = email
  if (phone) prospect.business_phone = phone
  if (loc.address) prospect.address = loc.address
  if (loc.city) prospect.city = loc.city
  prospect.state = loc.state || 'CA'
  if (loc.zip) prospect.zip = loc.zip
  prospect.industry = industry

  // Ratings
  if (rating.platform === 'google' || rating.platform === 'surecritic' || rating.platform === 'demandforce' || rating.platform === 'carwise' || rating.platform === 'birdeye' || rating.platform === 'homeadvisor' || rating.platform === 'carfax') {
    if (rating.rating !== null) prospect.google_rating = rating.rating
    if (rating.count !== null) prospect.google_review_count = rating.count
  }
  if (rating.platform === 'yelp') {
    if (rating.rating !== null) prospect.yelp_rating = rating.rating
    if (rating.count !== null) prospect.yelp_review_count = rating.count
  }

  prospect.source = 'research'
  prospect.stage = stage
  prospect.tags = tags

  if (demoUrl) prospect.demo_url = demoUrl
  if (pageCount) prospect.page_count = String(pageCount)
  if (notes) prospect.notes = notes

  return prospect
}

const prospects = []

for (const entry of RAW) {
  const prospect = buildProspect(entry)
  const key = `${prospect.business_name}::${prospect.city || ''}`

  if (seen.has(key)) {
    // Merge: keep existing, fill in blanks
    const existing = seen.get(key)
    for (const [k, v] of Object.entries(prospect)) {
      if (v !== null && v !== undefined && !existing[k]) {
        existing[k] = v
      }
    }
    continue
  }

  seen.set(key, prospect)
  prospects.push(prospect)
}

// ─── MERGE PERSISTENT RESEARCH DATA ───
// Agents write research results to data/research/*.json
// Each file: { "business_name": "...", "city": "...", ...enriched fields }
import { readdirSync, existsSync, readFileSync } from 'fs'

const researchDir = join(__dirname, 'research')
let mergedFromResearch = 0

if (existsSync(researchDir)) {
  const files = readdirSync(researchDir).filter(f => f.endsWith('.json'))
  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(researchDir, file), 'utf-8'))

      // Research file can be a single object or array of objects
      const records = Array.isArray(data) ? data : [data]
      for (const rec of records) {
        if (!rec.business_name) continue
        const key = `${rec.business_name}::${rec.city || ''}`
        const existing = seen.get(key)
        if (existing) {
          // Merge research fields into prospect
          for (const [k, v] of Object.entries(rec)) {
            if (k === 'business_name' || k === 'city') continue
            if (k === 'research_data' && existing.research_data) {
              // Deep merge research_data
              existing.research_data = { ...existing.research_data, ...v }
            } else if (v !== null && v !== undefined) {
              existing[k] = v
            }
          }
          mergedFromResearch++
        }
      }
    } catch (err) {
      console.warn(`⚠ Skipping research file ${file}: ${err.message}`)
    }
  }
}

// ─── ADD research_data FROM NOTES ───
for (const p of prospects) {
  const rd = buildResearchData(p)
  // Merge with any existing research_data (from research/ files)
  p.research_data = p.research_data ? { ...rd, ...p.research_data } : rd
}

// ─── CALCULATE site_quality_score FROM RESEARCH DATA ───
// Platforms ranked by quality (higher = better site)
const PLATFORM_QUALITY = {
  custom: 85, wordpress: 70, squarespace: 60,
  wix: 45, weebly: 20, godaddy: 15,
  prosites: 30, petsites: 25, imagepro: 20,
  demandforce: 25, clickfunnels: 25,
  none: 0,
}

function calcSiteQuality(p) {
  const rd = p.research_data || {}
  const website = rd.website || {}
  const notes = (p.notes || '').toLowerCase()

  // Start with platform score
  let platformName = website.platform || null
  if (platformName) platformName = platformName.toLowerCase().split(' ')[0]
  const platformScore = PLATFORM_QUALITY[platformName] ?? 50

  // Deduct for issues
  const issues = website.issues || []
  const issueStr = (Array.isArray(issues) ? issues.join(' ') : String(issues)).toLowerCase()
  let penalty = 0
  if (issueStr.includes('broken_ssl') || issueStr.includes('ssl')) penalty += 25
  if (issueStr.includes('broken_contact') || issueStr.includes('contact form')) penalty += 15
  if (issueStr.includes('no_website') || issueStr.includes('no website')) penalty += 50
  if (issueStr.includes('dated') || issueStr.includes('template')) penalty += 10
  if (issueStr.includes('placeholder') || issueStr.includes('stock') || issueStr.includes('getty')) penalty += 10
  if (issueStr.includes('unprofessional') || issueStr.includes('gmail') || issueStr.includes('comcast')) penalty += 5
  if (notes.includes('no website') || notes.includes('no site')) penalty += 40
  if (notes.includes('broken ssl') || notes.includes('ssl broken')) penalty += 20

  return Math.max(0, Math.min(100, platformScore - penalty))
}

for (const p of prospects) {
  p.site_quality_score = calcSiteQuality(p)
}

// Write output
const outPath = join(__dirname, 'prospects-import.json')
writeFileSync(outPath, JSON.stringify(prospects, null, 2) + '\n')

console.log(`\n✓ Built ${prospects.length} unique prospects → ${outPath}`)
if (mergedFromResearch > 0) {
  console.log(`✓ Merged research data for ${mergedFromResearch} prospects from data/research/`)
}

// ─── INTELLIGENCE STATS ───
const byIndustry = {}
const byStage = {}
let withResearch = 0
let diamonds = 0, golds = 0, silvers = 0, bronzes = 0
const demoBuiltList = []
const whaleList = []

for (const p of prospects) {
  byIndustry[p.industry] = (byIndustry[p.industry] || 0) + 1
  byStage[p.stage] = (byStage[p.stage] || 0) + 1
  if (p.research_data?.opportunities?.length > 0 || p.research_data?.pitch_angle) withResearch++
  if (p.stage === 'demo_built') demoBuiltList.push(p.business_name)
  if (p.tags?.includes('whale')) whaleList.push(p.business_name)

  // Count tiers using same logic as scoring engine
  const siteGap = 100 - (p.site_quality_score || 50)
  if (siteGap >= 60 && p.stage === 'demo_built') diamonds++
  else if (siteGap >= 40) golds++
  else if (siteGap >= 20) silvers++
  else bronzes++
}

console.log('\nBy industry:')
for (const [k, v] of Object.entries(byIndustry).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`)
}
console.log('\nBy stage:')
for (const [k, v] of Object.entries(byStage).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`)
}

console.log(`\n${withResearch}/${prospects.length} prospects have structured research_data`)
console.log(`${demoBuiltList.length} demo-built | ${whaleList.length} whales`)
console.log(`\nSite quality distribution:`)
const qualBuckets = { 'Critical (0-20)': 0, 'Poor (21-40)': 0, 'Fair (41-60)': 0, 'Good (61-80)': 0, 'Strong (81-100)': 0 }
for (const p of prospects) {
  const q = p.site_quality_score || 0
  if (q <= 20) qualBuckets['Critical (0-20)']++
  else if (q <= 40) qualBuckets['Poor (21-40)']++
  else if (q <= 60) qualBuckets['Fair (41-60)']++
  else if (q <= 80) qualBuckets['Good (61-80)']++
  else qualBuckets['Strong (81-100)']++
}
for (const [k, v] of Object.entries(qualBuckets)) {
  if (v > 0) console.log(`  ${k}: ${v}`)
}
