import { buildMetadata } from '@/lib/metadata'

export const metadata = buildMetadata({
  title: 'Contact Demand Signals — Start the Conversation',
  description: 'Get in touch with Demand Signals. Book a free 30-minute strategy call or send us a message. AI-powered websites, demand generation, and marketing automation for businesses across the USA, Thailand, Australia and beyond.',
  path: '/contact',
  keywords: ['contact Demand Signals', 'book a call', 'AI marketing consultation', 'free strategy call', 'demand generation quote'],
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
