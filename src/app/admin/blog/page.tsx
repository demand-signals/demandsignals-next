import { Suspense } from 'react'
import { BlogTable } from '@/components/admin/blog-table'

export default function BlogAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Blog Posts</h1>
        <p className="text-slate-500 text-sm mt-1">All published MDX blog content</p>
      </div>
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading…</div>}>
        <BlogTable />
      </Suspense>
    </div>
  )
}
