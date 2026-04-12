import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { ALL_CITY_SERVICE_SLUGS, getCityServiceBySlug } from '@/lib/city-service-slugs'
import { getCityBySlug } from '@/lib/cities'
import { getServiceBySlug, SERVICE_CATEGORIES } from '@/lib/services'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const search = (searchParams.get('search') || '').toLowerCase()
  const cityFilter = searchParams.get('city') || ''
  const categoryFilter = searchParams.get('category') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  // Build full list
  type LtpEntry = {
    slug: string
    cityName: string
    citySlug: string
    population: string
    serviceName: string
    serviceSlug: string
    serviceCategory: string
    serviceCategoryLabel: string
    serviceCategoryColor: string
  }

  const allEntries: LtpEntry[] = []
  for (const slug of ALL_CITY_SERVICE_SLUGS) {
    const mapping = getCityServiceBySlug(slug)
    if (!mapping) continue
    const city = getCityBySlug(mapping.citySlug)
    const service = getServiceBySlug(mapping.serviceSlug)
    if (!city || !service) continue

    allEntries.push({
      slug,
      cityName: city.name,
      citySlug: city.slug,
      population: city.population,
      serviceName: service.name,
      serviceSlug: service.slug,
      serviceCategory: service.category,
      serviceCategoryLabel: SERVICE_CATEGORIES[service.category]?.label ?? service.category,
      serviceCategoryColor: SERVICE_CATEGORIES[service.category]?.color ?? '#6b7280',
    })
  }

  // Apply filters
  let filtered = allEntries
  if (search) {
    filtered = filtered.filter(e =>
      e.slug.includes(search) ||
      e.cityName.toLowerCase().includes(search) ||
      e.serviceName.toLowerCase().includes(search)
    )
  }
  if (cityFilter) {
    filtered = filtered.filter(e => e.citySlug === cityFilter)
  }
  if (categoryFilter) {
    filtered = filtered.filter(e => e.serviceCategory === categoryFilter)
  }

  // Stats (computed from filtered set)
  const cities = new Set(filtered.map(e => e.citySlug))
  const services = new Set(filtered.map(e => e.serviceSlug))
  const byCategory: Record<string, number> = {}
  for (const e of filtered) {
    byCategory[e.serviceCategory] = (byCategory[e.serviceCategory] || 0) + 1
  }

  // Paginate
  const total = filtered.length
  const offset = (page - 1) * limit
  const data = filtered.slice(offset, offset + limit)

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    stats: {
      totalPages: allEntries.length,
      citiesCount: cities.size,
      servicesCount: services.size,
      byCategory: Object.entries(byCategory).map(([category, count]) => ({
        category,
        label: SERVICE_CATEGORIES[category as keyof typeof SERVICE_CATEGORIES]?.label ?? category,
        color: SERVICE_CATEGORIES[category as keyof typeof SERVICE_CATEGORIES]?.color ?? '#6b7280',
        count,
      })),
    },
  })
}
