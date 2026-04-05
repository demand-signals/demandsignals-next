import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface Post {
  slug: string
  title: string
  date: string
  author: string
  excerpt: string
  tags: string[]
  readTime: string
  content: string
}

const postsDir = path.join(process.cwd(), 'src/content/blog')

export function getAllPosts(): Omit<Post, 'content'>[] {
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx'))
  return files
    .map(file => {
      const slug = file.replace('.mdx', '')
      const raw = fs.readFileSync(path.join(postsDir, file), 'utf8')
      const { data } = matter(raw)
      return { slug, title: data.title, date: data.date, author: data.author, excerpt: data.excerpt, tags: data.tags ?? [], readTime: data.readTime ?? '7 min read' }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(postsDir, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  return { slug, title: data.title, date: data.date, author: data.author, excerpt: data.excerpt, tags: data.tags ?? [], readTime: data.readTime ?? '7 min read', content }
}
