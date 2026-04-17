import { buildMetadata } from '@/lib/metadata'
import QuotePageClient from './QuotePageClient'

export const metadata = buildMetadata({
  title: 'Get a Budgetary Estimate — Demand Signals',
  description: 'Chat with our AI project advisor to build a budgetary estimate tailored to your business. Human-led strategy, AI-powered execution.',
  path: '/quote',
  noIndex: true,
})

export default function QuotePage() {
  return <QuotePageClient />
}
