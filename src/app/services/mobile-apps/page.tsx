import { buildMetadata } from '@/lib/metadata'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { serviceSchema, breadcrumbSchema } from '@/lib/schema'

export const metadata = buildMetadata({
  title:       'iOS & Android App Development — React Native | Demand Signals',
  description: 'Cross-platform mobile apps built with React Native and Expo. AI features, push notifications, offline mode, and App Store publishing. Serving Northern California businesses.',
  path:        '/services/mobile-apps',
  keywords: [
    'iOS app development Northern California',
    'Android app development Sacramento',
    'React Native mobile app',
    'Expo mobile development',
    'cross-platform mobile app',
    'AI mobile app development',
    'business mobile app El Dorado County',
  ],
})

const WHAT_WE_BUILD = [
  {
    icon: '📱',
    title: 'Cross-Platform Apps',
    description:
      'One codebase, two app stores. React Native with Expo delivers native iOS and Android performance from a single TypeScript codebase — cutting build cost in half without sacrificing user experience.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Mobile Features',
    description:
      'On-device AI, voice assistants, image recognition, personalized recommendations, and LLM-powered chat — integrated directly into your mobile app using the latest AI APIs.',
  },
  {
    icon: '🔔',
    title: 'Push Notifications & Messaging',
    description:
      'Expo Push, Firebase Cloud Messaging, and in-app messaging built to re-engage users, drive appointments, confirm bookings, and keep customers connected to your business.',
  },
  {
    icon: '📡',
    title: 'Offline-First Architecture',
    description:
      'Apps that work without a signal. Local data sync, offline storage, and background sync ensure your app is useful even in areas with spotty connectivity.',
  },
  {
    icon: '🔗',
    title: 'Backend & API Integration',
    description:
      'Supabase, Base44, Stripe, Google Maps, HubSpot, Twilio — we wire your mobile app into your existing business tools and build the API layer that keeps everything in sync.',
  },
  {
    icon: '🏪',
    title: 'App Store Publishing',
    description:
      'We handle App Store (Apple) and Google Play submission, review process navigation, metadata optimization, and ASO (App Store Optimization) for organic downloads.',
  },
]

const TECH_STACK = [
  { label: 'Framework',    value: 'React Native 0.76 + Expo SDK 52' },
  { label: 'Language',     value: 'TypeScript (strict)' },
  { label: 'Navigation',   value: 'Expo Router (file-based)' },
  { label: 'State',        value: 'Zustand, React Query, Context API' },
  { label: 'Backend',      value: 'Supabase, Base44, custom Node.js APIs' },
  { label: 'AI Features',  value: 'Claude API, OpenAI, on-device ML (TensorFlow.js)' },
  { label: 'Notifications', value: 'Expo Push, Firebase Cloud Messaging' },
  { label: 'Distribution', value: 'EAS Build + Submit (App Store & Play Store)' },
]

export default function MobileAppsPage() {
  return (
    <>
      <JsonLd data={serviceSchema(
        'iOS & Android App Development',
        'Cross-platform mobile apps built with React Native and Expo, with AI features and App Store publishing.',
        'https://demandsignals.co/services/mobile-apps',
      )} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home',     url: 'https://demandsignals.co' },
        { name: 'Services', url: 'https://demandsignals.co/services' },
        { name: 'iOS & Android Apps', url: 'https://demandsignals.co/services/mobile-apps' },
      ])} />

      <PageHero
        eyebrow="iOS & Android Development"
        title={<><span style={{color:'#FF6B2B'}}>One App.</span><br /><span style={{color:'#52C9A0'}}>Both Stores.</span></>}
        subtitle="React Native cross-platform mobile apps with AI features, push notifications, and App Store publishing — built for businesses that need a mobile presence."
        ctaLabel="Build My App →"
        ctaHref="/contact"
        callout={<>React Native lets us build <span style={{color:'#52C9A0'}}>iOS and Android simultaneously</span> — one codebase, native performance, half the cost of building two separate apps.</>}
      />

      {/* What We Build */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              What We Build
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              Mobile Apps Built for Real Business
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {WHAT_WE_BUILD.map((item) => (
              <div key={item.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.93rem', margin: 0 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 12 }}>
                Technology
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 20 }}>
                React Native +<br />AI Features Built In
              </h2>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 20 }}>
                React Native with Expo gives us the fastest path to both app stores without sacrificing the native performance your users expect. Expo Router handles navigation, EAS Build handles compilation and submission.
              </p>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
                AI features use the Claude API for conversational features, OpenAI&apos;s vision models for image recognition, and TensorFlow.js for on-device ML that works without an internet connection.
              </p>
            </div>
            <div style={{ background: 'var(--light)', borderRadius: 20, padding: '36px' }}>
              <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Technology Stack</h3>
              <div style={{ display: 'grid', gap: 0 }}>
                {TECH_STACK.map((row) => (
                  <div key={row.label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #e8ecf0' }}>
                    <strong style={{ color: 'var(--slate)', minWidth: 110, fontSize: '0.83rem', fontWeight: 600 }}>{row.label}</strong>
                    <span style={{ fontSize: '0.88rem', color: 'var(--dark)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Callout */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #080e1f 0%, #1d2330 100%)', borderRadius: 20, padding: '48px 52px', border: '1px solid rgba(82,201,160,0.2)' }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 16 }}>
              AI in Your Pocket
            </p>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>
              Mobile apps that think, personalize, and automate.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
              Your customers are carrying a supercomputer in their pocket. We build apps that use it — voice interfaces powered by Claude, image scanning for instant estimates, personalized content feeds that learn user preferences, and automated workflows that trigger based on location, time, or behavior. AI in mobile isn&apos;t a gimmick when it actually solves a customer problem.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Ready to Build Your App?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Tell us what your app does and who it&apos;s for. We&apos;ll scope it, prototype it fast, and get it into both stores.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/contact" style={{ background: '#FF6B2B', color: '#fff', fontWeight: 700, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem' }}>
              Start My App →
            </a>
            <a href="/portfolio" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, padding: '13px 28px', borderRadius: 100, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
              See Portfolio
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
