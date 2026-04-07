import { buildMetadata } from '@/lib/metadata'

export const metadata = buildMetadata({
  title: 'Free Intelligence Reports — Demand Signals',
  description: 'Get free market intelligence reports for your business. Competitor analysis, local SEO audits, keyword gap reports, and demand generation insights for Northern California businesses and beyond.',
  path: '/tools/research-reports',
  keywords: ['free SEO report', 'competitor analysis', 'market intelligence', 'local SEO audit', 'demand generation report', 'Northern California business intelligence'],
})

export default function ResearchReportsLayout({ children }: { children: React.ReactNode }) {
  return children
}
