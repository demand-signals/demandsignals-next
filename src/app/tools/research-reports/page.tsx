import { buildMetadata } from '@/lib/metadata';
import ResearchReportsClient from './ResearchReportsClient';

export const metadata = buildMetadata({
  title: 'Free Intelligence Reports — Demand Signals',
  description: 'Free AI-powered intelligence reports — competitor analysis, market demand mapping, SEO/GEO audits, and 90-day strategic plans. Zero cost, delivered in 48 hours.',
  path: '/tools/research-reports',
});

export default function ResearchReportsPage() {
  return <ResearchReportsClient />;
}
