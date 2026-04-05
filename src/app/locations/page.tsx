import { buildMetadata } from '@/lib/metadata'
import Link from 'next/link'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'
import { CITIES } from '@/lib/cities'

export const metadata = buildMetadata({
  title:         'Local AI Marketing — Northern California Service Areas',
  description:   'Demand Signals serves local businesses across Northern California — El Dorado County, Sacramento County, Placer County, and the Sierra Nevada foothills. AI-powered websites, local SEO, and agent swarms for your market.',
  path:          '/locations',
  keywords:      [
    'AI marketing Northern California',
    'local SEO Sacramento County',
    'marketing agency El Dorado County',
    'marketing agency Placer County',
    'AI marketing agency NorCal',
    'local business marketing California',
    'demand generation Northern California',
  ],
  ogDescription: 'AI-powered marketing for local businesses across Northern California. El Dorado County, Sacramento, Placer County, and beyond.',
})

const counties = [
  {
    name: 'El Dorado County',
    cities: ['placerville', 'el-dorado-hills', 'cameron-park', 'south-lake-tahoe'],
    description: 'From the county seat to the shores of Lake Tahoe, we serve businesses across all of El Dorado County.',
  },
  {
    name: 'Sacramento County',
    cities: ['sacramento', 'folsom', 'citrus-heights'],
    description: "California's capital region — one of the most competitive local business markets in the state.",
  },
  {
    name: 'Placer County',
    cities: ['roseville', 'rocklin', 'granite-bay', 'auburn'],
    description: "One of California's fastest-growing counties, from affluent suburbs to Sierra foothills.",
  },
]

const locationsFaqs = [
  {
    question: 'What areas does Demand Signals serve in Northern California?',
    answer: 'We serve businesses across El Dorado County, Sacramento County, and Placer County — including cities like Placerville, Sacramento, Folsom, Roseville, Rocklin, Auburn, and South Lake Tahoe. Our AI marketing systems are configured specifically for Northern California markets, but we also work with clients across the USA, Thailand, Australia, and beyond.',
  },
  {
    question: 'Do I need to be located in Northern California to work with Demand Signals?',
    answer: 'No. While we specialize in Northern California local markets, our AI-powered services work for businesses anywhere. Website development, content generation, and AI agent swarms are fully remote. For local SEO and geo-targeting services, we configure our systems to your specific market regardless of where you are physically located.',
  },
  {
    question: 'How does local market knowledge improve AI marketing results?',
    answer: 'AI marketing performs dramatically better when it understands local competition, seasonal demand patterns, and regional search behavior. Our team is based in El Dorado County and has deep familiarity with Northern California markets. We use this knowledge to train our AI systems on the competitors, keywords, and customer behaviors specific to each city we serve.',
  },
  {
    question: 'Can you handle multiple locations for a business with several branches?',
    answer: 'Absolutely. Multi-location businesses are one of our specialties. We build city-specific landing pages, manage separate Google Business Profiles for each location, and run AI content generation tuned to each market. Our agent swarms can handle review responses, social media, and outreach for every location simultaneously without additional headcount.',
  },
  {
    question: 'What if my city is not listed on your service areas page?',
    answer: 'If your city is not listed, we very likely still serve your area. Our coverage extends across all of Northern California and we regularly take on clients in new markets. Contact us with your location and business details — we will assess the local competitive landscape and let you know exactly how we can help within 24 hours.',
  },
]

export default function LocationsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Locations', url: 'https://demandsignals.co/locations' },
        ])}
      />
      <PageHero
        eyebrow="Service Areas"
        title={
          <>
            AI Marketing Across <span style={{color:'#52C9A0'}}>Northern California</span> —{' '}
            <span style={{color:'#FF6B2B'}}>Always On.</span>
          </>
        }
        subtitle="We serve local businesses from Sacramento to South Lake Tahoe — with AI-powered websites, local SEO, and agent swarms tuned to your specific market."
        ctaLabel="Get a Free Audit"
        ctaHref="/contact"
        callout={<>We don't run national campaigns. We build <span style={{color:'#52C9A0'}}>hyper-local systems</span> tuned to your specific market — the competitors, the customers, the keywords that actually drive revenue.</>}
      />

      {/* County sections */}
      {counties.map((county) => {
        const countyCities = CITIES.filter((c) => county.cities.includes(c.slug))
        return (
          <section key={county.name} style={{ background: county.name === 'Sacramento County' ? 'var(--light)' : '#fff', padding: '72px 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <p style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Service Area
              </p>
              <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: 'var(--dark)', marginBottom: 12 }}>
                {county.name}
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: 560, marginBottom: 48, lineHeight: 1.7 }}>
                {county.description}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
                {countyCities.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/locations/${city.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      className="city-card"
                      style={{
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        padding: '28px 32px',
                        cursor: 'pointer',
                      }}
                    >
                      <p style={{ color: 'var(--teal)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                        {city.county}
                      </p>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 10 }}>
                        {city.name}
                      </h3>
                      <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16 }}>
                        {city.description.substring(0, 100)}...
                      </p>
                      <span style={{ color: '#FF6B2B', fontWeight: 600, fontSize: '0.875rem' }}>
                        View services →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )
      })}

      {/* FAQ */}
      <JsonLd data={faqSchema(locationsFaqs)} />
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>FAQ</span>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 0' }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {locationsFaqs.map(faq => (
              <div key={faq.question} style={{ background: 'var(--light)', borderRadius: 14, padding: '24px 28px' }}>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 10, lineHeight: 1.4 }}>{faq.question}</h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.7, margin: 0 }}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All cities list */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>
            Don't See Your City?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
            We serve businesses across all of Northern California. If your city isn't listed, contact us — we likely serve your area.
          </p>
          <a
            href="/contact"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '15px 36px',
              background: '#FF6B2B',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: 100,
              textDecoration: 'none',
            }}
          >
            Check Your Area →
          </a>
        </div>
      </section>
    </>
  )
}
