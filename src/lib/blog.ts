import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

// ── Service categories that blog posts can be associated with ─────────────────
export const SERVICE_CATEGORIES = [
  'websites-apps',
  'demand-generation',
  'content-social',
  'ai-services',
] as const

export type ServiceCategory = typeof SERVICE_CATEGORIES[number]

// ── Content categories for filtering ─────────────────────────────────────────
export const CONTENT_CATEGORIES = [
  'search-updates',     // Google algorithm changes
  'core-updates',       // Google core engineering updates
  'ai-engineering',     // Claude, Anthropic, AI model updates
  'ai-changelog',       // Daily AI platform changelog summaries
  'search-central',     // Google Search Central video summaries
  'industry-trends',    // Market analysis, predictions
  'how-to',            // Implementation guides
  'case-studies',       // Client results
] as const

export type ContentCategory = typeof CONTENT_CATEGORIES[number]

export const CONTENT_CATEGORY_LABELS: Record<ContentCategory, string> = {
  'search-updates': 'Search Updates',
  'core-updates': 'Core Updates',
  'ai-engineering': 'AI Engineering',
  'ai-changelog': 'The AI ChangeLog',
  'search-central': 'Search Central',
  'industry-trends': 'Industry Trends',
  'how-to': 'How-To',
  'case-studies': 'Case Studies',
}

export const CONTENT_CATEGORY_COLORS: Record<ContentCategory, string> = {
  'search-updates': '#2563EB',
  'core-updates': '#DC2626',
  'ai-engineering': '#7C3AED',
  'ai-changelog': '#F59E0B',
  'search-central': '#059669',
  'industry-trends': '#D97706',
  'how-to': '#0891B2',
  'case-studies': '#DB2777',
}

// ── Post interface ───────────────────────────────────────────────────────────
export interface Post {
  slug: string
  title: string
  date: string
  author: string
  excerpt: string
  tags: string[]
  readTime: string
  category: ContentCategory
  serviceCategories: ServiceCategory[]
  source?: string          // URL of source material (Google update page, etc.)
  featured?: boolean
  infographic?: {
    headline: string       // Main stat or headline for the SVG infographic
    stats?: Array<{ label: string; value: string }>
    type: 'stats' | 'timeline' | 'comparison' | 'checklist'
  }
  content: string
}

export type PostMeta = Omit<Post, 'content'>

// ── File reader ──────────────────────────────────────────────────────────────
const postsDir = path.join(process.cwd(), 'src/content/blog')

function parsePost(file: string): PostMeta {
  const slug = file.replace('.mdx', '')
  const raw = fs.readFileSync(path.join(postsDir, file), 'utf8')
  const { data } = matter(raw)
  return {
    slug,
    title: data.title ?? '',
    date: data.date ?? '',
    author: data.author ?? '',
    excerpt: data.excerpt ?? '',
    tags: data.tags ?? [],
    readTime: data.readTime ?? '7 min read',
    category: data.category ?? 'industry-trends',
    serviceCategories: data.serviceCategories ?? [],
    source: data.source,
    featured: data.featured ?? false,
    infographic: data.infographic,
  }
}

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'))
  return files
    .map(parsePost)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostsByServiceCategory(category: ServiceCategory): PostMeta[] {
  return getAllPosts().filter(p => p.serviceCategories.includes(category))
}

export function getPostsByContentCategory(category: ContentCategory): PostMeta[] {
  return getAllPosts().filter(p => p.category === category)
}

export function getFeaturedPosts(): PostMeta[] {
  return getAllPosts().filter(p => p.featured)
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(postsDir, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  return {
    slug,
    title: data.title ?? '',
    date: data.date ?? '',
    author: data.author ?? '',
    excerpt: data.excerpt ?? '',
    tags: data.tags ?? [],
    readTime: data.readTime ?? '7 min read',
    category: data.category ?? 'industry-trends',
    serviceCategories: data.serviceCategories ?? [],
    source: data.source,
    featured: data.featured ?? false,
    infographic: data.infographic,
    content,
  }
}
