import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'iOS & Android App Development — React Native | Demand Signals',
  description: 'Cross-platform mobile apps built with React Native and Expo. AI features, push notifications, offline mode, and App Store publishing from a single codebase.',
  path:        '/websites-apps/mobile-apps',
  keywords:    ['mobile app development', 'React Native apps', 'iOS development', 'Android development', 'cross-platform apps', 'Expo development'],
})

export default function MobileAppsPage() {
  return (
    <ServicePageTemplate
      eyebrow="Mobile App Development"
      titleHtml={<><span style={{color:'#FF6B2B'}}>iOS & Android Apps</span><br /><span style={{color:'#52C9A0'}}>One Codebase. Both Stores.</span></>}
      subtitle="Cross-platform mobile apps with React Native — AI features, push notifications, offline mode, and App Store publishing."
      ctaLabel="Build My Mobile App →"
      calloutHtml={<>Demand Signals ships every mobile app with <span style={{color:'#52C9A0'}}>AI features built in</span> — intelligent search, personalized content, and automated notifications. React Native delivers 90% of native performance at 50% of the development cost, deploying to both iOS and Android from a single codebase.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Websites & Apps', path: '/websites-apps' },
        { name: 'iOS & Android Apps', path: '/websites-apps/mobile-apps' },
      ]}
      schemaName="iOS & Android App Development"
      schemaDescription="Cross-platform mobile apps built with React Native and Expo."
      schemaUrl="/websites-apps/mobile-apps"
      featuresHeading="What We Build"
      features={[
        { icon: '📱', title: 'Customer-Facing Apps', description: 'Booking, ordering, loyalty programs, and member portals — branded mobile experiences that keep customers engaged and coming back.' },
        { icon: '🛒', title: 'Mobile Commerce', description: 'Product catalogs, cart management, payment processing, and order tracking. Stripe integration for subscriptions and one-time purchases.' },
        { icon: '🔔', title: 'Push Notifications', description: 'Targeted push notifications for promotions, appointment reminders, order updates, and re-engagement campaigns — powered by AI segmentation.' },
        { icon: '📡', title: 'Offline-First Design', description: 'Apps that work without internet — critical for field service, construction, and rural areas. Data syncs automatically when connectivity returns.' },
        { icon: '🤖', title: 'AI-Powered Features', description: 'Claude API integration for intelligent search, content generation, recommendation engines, and automated customer support within the app.' },
        { icon: '🏪', title: 'App Store Publishing', description: 'Full management of Apple App Store and Google Play submissions, screenshots, descriptions, and compliance. We handle the bureaucracy.' },
      ]}
      techStack={[
        { label: 'Framework', value: 'React Native + Expo' },
        { label: 'Language', value: 'TypeScript (strict)' },
        { label: 'Backend', value: 'Supabase (PostgreSQL + Auth + Storage)' },
        { label: 'Payments', value: 'Stripe (in-app purchases, subscriptions)' },
        { label: 'Push', value: 'Expo Notifications + Firebase Cloud Messaging' },
        { label: 'AI', value: 'Claude API for intelligent features' },
        { label: 'Analytics', value: 'PostHog + custom event tracking' },
      ]}
      techDescription="React Native lets us build one codebase that runs on both iOS and Android. Expo handles the build pipeline, over-the-air updates, and native module management. The result: faster development, lower cost, and consistent experiences across platforms."
      aiCalloutHeading="Mobile apps that learn from your users."
      aiCalloutText="AI doesn't just power features — it makes your app smarter over time. Usage patterns inform better recommendations. Customer inquiries train better automated responses. Every interaction makes the next one better."
      faqs={[
        { question: 'Why React Native instead of native iOS/Android development?', answer: 'React Native delivers 90% of native performance at 50% of the development cost and timeline. One codebase serves both platforms, meaning features ship faster and bugs get fixed once — not twice. For most business applications, the performance difference is imperceptible.' },
        { question: 'How long does it take to build a mobile app?', answer: 'A standard mobile app takes 6-10 weeks from kickoff to App Store submission. Complex apps with multiple user roles, payment systems, and AI features may take 10-14 weeks. We ship features iteratively so you see working builds weekly.' },
        { question: 'Can you update the app without going through the App Store?', answer: 'Yes — Expo supports over-the-air (OTA) updates for JavaScript changes. Bug fixes, content updates, and minor UI changes deploy instantly without App Store review. Only native code changes require a full app update.' },
        { question: 'Do you handle App Store submission and approval?', answer: 'Completely. We prepare all assets (screenshots, descriptions, privacy policies), handle submission to both Apple and Google, manage review feedback, and ensure compliance with platform guidelines. Most apps are approved within 1-3 business days.' },
      ]}
      ctaHeading="Ready for a Mobile App That Drives Business?"
      ctaText="Tell us about your app idea and we'll scope the features, timeline, and budget — usually within 48 hours."
      ctaPrimaryLabel="Start My Mobile App →"
      serviceCategory="websites-apps"
    />
  )
}
