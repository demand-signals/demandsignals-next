import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeExternalLinks from 'rehype-external-links'
import type { PortalProjectNote } from '@/lib/portal-data'

// Renders client-visible project notes newest-first. Markdown bodies
// are rendered via MDXRemote (server component) — same safe runtime
// the blog uses. NO author attribution — DSIG speaks as one voice.
//
// Spec: docs/superpowers/specs/2026-05-07-client-portal-v1-design.md §12

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProjectNotesTimeline({ notes }: { notes: PortalProjectNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
        No updates yet — your team is working on it.
      </div>
    )
  }

  return (
    <ol className="space-y-5">
      {notes.map((note) => (
        <li
          key={note.id}
          className="bg-white border border-slate-200 rounded-xl p-5"
        >
          <div className="flex items-baseline justify-between gap-4 mb-3">
            {note.title ? (
              <h3 className="text-base font-semibold text-slate-900">{note.title}</h3>
            ) : (
              <span /> /* spacer */
            )}
            <time className="text-xs text-slate-400 shrink-0" dateTime={note.created_at}>
              {shortDate(note.created_at)}
            </time>
          </div>
          <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_a]:text-teal-600 [&_a]:underline [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded">
            <MDXRemote
              source={note.body}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [
                    [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
                  ],
                  format: 'md',
                },
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
