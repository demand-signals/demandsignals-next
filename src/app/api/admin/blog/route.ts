import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAllPosts, CONTENT_CATEGORIES, CONTENT_CATEGORY_LABELS, CONTENT_CATEGORY_COLORS, SERVICE_CATEGORIES } from '@/lib/blog'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const search = (searchParams.get('search') || '').toLowerCase()
  const categoryFilter = searchParams.get('category') || ''
  const serviceCategoryFilter = searchParams.get('serviceCategory') || ''
  const featuredFilter = searchParams.get('featured') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '25', 10)

  const allPosts = getAllPosts()

  // Apply filters
  let filtered = allPosts
  if (search) {
    filtered = filtered.filter(p => p.title.toLowerCase().includes(search) || p.slug.includes(search))
  }
  if (categoryFilter) {
    filtered = filtered.filter(p => p.category === categoryFilter)
  }
  if (serviceCategoryFilter) {
    filtered = filtered.filter(p => p.serviceCategories?.includes(serviceCategoryFilter as any))
  }
  if (featuredFilter === 'true') {
    filtered = filtered.filter(p => p.featured)
  } else if (featuredFilter === 'false') {
    filtered = filtered.filter(p => !p.featured)
  }

  // Stats
  const totalPosts = allPosts.length
  const featuredCount = allPosts.filter(p => p.featured).length
  const byCategory = CONTENT_CATEGORIES.map(cat => ({
    category: cat,
    label: CONTENT_CATEGORY_LABELS[cat],
    color: CONTENT_CATEGORY_COLORS[cat],
    count: allPosts.filter(p => p.category === cat).length,
  }))
  const byServiceCategory = SERVICE_CATEGORIES.map(cat => ({
    category: cat,
    count: allPosts.filter(p => p.serviceCategories?.includes(cat)).length,
  }))

  // Paginate
  const total = filtered.length
  const offset = (page - 1) * limit
  const data = filtered.slice(offset, offset + limit).map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    author: p.author,
    category: p.category,
    readTime: p.readTime,
    featured: p.featured ?? false,
    serviceCategories: p.serviceCategories,
    excerpt: p.excerpt,
  }))

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    stats: {
      totalPosts,
      featuredCount,
      latestPostDate: allPosts[0]?.date ?? null,
      byCategory,
      byServiceCategory,
    },
  })
}
