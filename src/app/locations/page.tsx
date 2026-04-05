import { buildMetadata } from '@/lib/metadata'
import Link from 'next/link'
import { PageHero } from '@/components/sections/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'
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
