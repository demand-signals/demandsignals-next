import { buildMetadata } from '@/lib/metadata';
import ContactPageClient from './ContactPageClient';

export const metadata = buildMetadata({
  title: 'Contact Demand Signals — Get a Free Quote',
  description: 'Tell us what you need. Free strategy calls, demand audits, and AI-powered marketing quotes for local businesses across Northern California.',
  path: '/contact',
});

export default function ContactPage() {
  return <ContactPageClient />;
}
