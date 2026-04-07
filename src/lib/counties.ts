/**
 * County data — shared across locations pages.
 * County slugs always end with `-county` to disambiguate from city names.
 * NO median income stats — uses business count, growth rate, top industries.
 */

import { CITIES, type CityData } from './cities'

export type CountyData = {
  slug: string           // e.g. 'el-dorado-county'
  name: string           // e.g. 'El Dorado County'
  shortName: string      // e.g. 'El Dorado'
  tagline: string
  subtitle: string
  description: string
  citySlugs: string[]
  featured: boolean
  color: string
  stats: Array<{ value: string; label: string }>
  topIndustries: string[]
  businessCount: string
  growthRate: string
}

export const COUNTIES: CountyData[] = [
  {
    slug: 'el-dorado-county',
    name: 'El Dorado County',
    shortName: 'El Dorado',
    tagline: 'Our Home County',
    subtitle: 'Gold Country to Lake Tahoe',
    description: 'El Dorado County is our home base — and where our roots run deepest. From the historic Gold Rush towns of the foothills to the world-class shores of Lake Tahoe, we know every neighborhood, competitor, and customer behavior in this market.',
    citySlugs: ['el-dorado-hills', 'cameron-park', 'placerville', 'shingle-springs', 'south-lake-tahoe'],
    featured: true,
    color: '#52C9A0',
    stats: [
      { value: '192k', label: 'County Population' },
      { value: '8,400+', label: 'Local Businesses' },
      { value: '#1', label: 'Our Home Base' },
    ],
    topIndustries: ['Tourism & Hospitality', 'Real Estate', 'Healthcare', 'Construction', 'Professional Services'],
    businessCount: '8,400+',
    growthRate: '+9% business growth (5yr)',
  },
  {
    slug: 'sacramento-county',
    name: 'Sacramento County',
    shortName: 'Sacramento',
    tagline: "California's Capital",
    subtitle: 'Largest Metro Market in the Region',
    description: "California's capital region is one of the most competitive local business markets in the state — and one of our strongest. From downtown Sacramento to the thriving suburbs, we serve businesses across the full metro area.",
    citySlugs: ['sacramento', 'folsom', 'elk-grove', 'citrus-heights', 'rancho-cordova'],
    featured: false,
    color: '#3B82F6',
    stats: [
      { value: '1.6M', label: 'Metro Population' },
      { value: '52,000+', label: 'Local Businesses' },
      { value: 'Capital', label: 'State Government Hub' },
    ],
    topIndustries: ['Government', 'Healthcare', 'Technology', 'Agriculture', 'Professional Services', 'Retail'],
    businessCount: '52,000+',
    growthRate: '+14% business growth (5yr)',
  },
  {
    slug: 'placer-county',
    name: 'Placer County',
    shortName: 'Placer',
    tagline: "NorCal's Fastest-Growing",
    subtitle: 'Affluent Suburbs to Sierra Foothills',
    description: "One of California's fastest-growing counties — from Roseville's booming retail corridors to the affluent enclaves of Granite Bay and the historic charm of Auburn. A high-income market with intense competition and massive opportunity.",
    citySlugs: ['roseville', 'rocklin', 'granite-bay', 'auburn', 'lincoln'],
    featured: false,
    color: '#8B5CF6',
    stats: [
      { value: '420k', label: 'County Population' },
      { value: '18,000+', label: 'Local Businesses' },
      { value: 'Top 10', label: 'Fastest Growing in CA' },
    ],
    topIndustries: ['Retail', 'Healthcare', 'Technology', 'Real Estate', 'Home Services', 'Professional Services'],
    businessCount: '18,000+',
    growthRate: '+22% business growth (5yr)',
  },
  {
    slug: 'amador-county',
    name: 'Amador County',
    shortName: 'Amador',
    tagline: 'Gold Rush Wine Country',
    subtitle: 'Boutique Markets, Loyal Customers',
    description: 'Amador County is California\'s undiscovered marketing opportunity — a wine country destination drawing thousands of Bay Area and Sacramento visitors each weekend, with a loyal local base that rewards businesses that show up online.',
    citySlugs: ['jackson', 'sutter-creek', 'pine-grove', 'ione'],
    featured: false,
    color: '#DC2626',
    stats: [
      { value: '100k+', label: 'Annual Wine Visitors' },
      { value: '1,800+', label: 'Local Businesses' },
      { value: 'High', label: 'Customer Loyalty Index' },
    ],
    topIndustries: ['Wine & Hospitality', 'Tourism', 'Healthcare', 'Retail', 'Agriculture'],
    businessCount: '1,800+',
    growthRate: '+7% business growth (5yr)',
  },
  {
    slug: 'nevada-county',
    name: 'Nevada County',
    shortName: 'Nevada',
    tagline: 'Sierra Foothills',
    subtitle: 'Mountain Communities & Mountain Money',
    description: 'Nevada County is a gem — a constellation of educated, high-income communities including Grass Valley, Nevada City, and Truckee. Remote workers, artists, mountain resort visitors, and deeply rooted locals all coexist in one of NorCal\'s most distinctive markets.',
    citySlugs: ['grass-valley', 'nevada-city', 'truckee', 'penn-valley'],
    featured: false,
    color: '#059669',
    stats: [
      { value: '102k', label: 'County Population' },
      { value: '5,200+', label: 'Local Businesses' },
      { value: '5M+', label: 'Tahoe-Truckee Visitors/yr' },
    ],
    topIndustries: ['Tourism & Recreation', 'Arts & Culture', 'Healthcare', 'Retail', 'Professional Services'],
    businessCount: '5,200+',
    growthRate: '+11% business growth (5yr)',
  },
]

export const COUNTY_SLUGS = COUNTIES.map(c => c.slug)

export function getCountyBySlug(slug: string): CountyData | undefined {
  return COUNTIES.find(c => c.slug === slug)
}

/** Find the county a city belongs to */
export function getCountyForCity(citySlug: string): CountyData | undefined {
  return COUNTIES.find(c => c.citySlugs.includes(citySlug))
}

/** Resolve county's citySlugs to full CityData objects */
export function getCountyCities(county: CountyData): CityData[] {
  return county.citySlugs
    .map(slug => CITIES.find(c => c.slug === slug))
    .filter((c): c is CityData => c !== undefined)
}

/** County with resolved city objects — for CountySelector and other UI */
export type CountyWithCities = Omit<CountyData, 'citySlugs'> & {
  cities: Array<{
    slug: string
    name: string
    population: string
    industries: string[]
  }>
}

export function getCountiesWithCities(): CountyWithCities[] {
  return COUNTIES.map(county => ({
    ...county,
    cities: county.citySlugs
      .map(slug => CITIES.find(c => c.slug === slug))
      .filter((c): c is CityData => c !== undefined)
      .map(c => ({
        slug: c.slug,
        name: c.name,
        population: c.population,
        industries: c.industries,
      })),
  }))
}
