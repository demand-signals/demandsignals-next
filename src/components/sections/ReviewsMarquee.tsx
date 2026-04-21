'use client'

const reviews = [
  { name: 'Marcus T.', role: 'General Contractor', text: 'We went from invisible on Google to #1 for 40+ local search terms. The AI content engine keeps pushing out pages and our leads have tripled.' },
  { name: 'Sarah K.', role: 'Med Spa Owner', text: 'They built our site in two weeks and the booking integration works flawlessly. We stopped paying for a marketing agency and get better results.' },
  { name: 'James R.', role: 'Brewery Owner', text: 'Our taproom events page and Instagram went from dead to 2K+ followers. The AI social posts actually sound like us, not a robot.' },
  { name: 'Linda P.', role: 'Pool Service Manager', text: 'The geo-targeted service area pages are a game changer. We rank in every city we serve now — not just our home base.' },
  { name: 'David C.', role: 'Attorney', text: 'Client intake automation cut our admin time in half. The AI document generation for initial consultations is remarkably accurate.' },
  { name: 'Rachel M.', role: 'Restaurant Owner', text: 'Our online ordering system paid for itself in the first month. The Google Business Profile management alone is worth the investment.' },
  { name: 'Chris W.', role: 'Recruitment Director', text: '3x qualified candidates in 90 days. The AI outreach sequences are personalized enough that people actually respond.' },
  { name: 'Angela F.', role: 'Wellness Practitioner', text: 'The AI review responder handles every Google review within hours. Professional, warm, and exactly our brand voice.' },
  { name: 'Tom B.', role: 'Marine Services', text: 'They understand local businesses in a way that big agencies never did. Our GMB listing now dominates the Map Pack for every service we offer.' },
  { name: 'Karen D.', role: 'DMV Services Owner', text: 'We were skeptical about AI-generated content but it genuinely outperforms what we were paying writers to produce. Rankings prove it.' },
  { name: 'Mike L.', role: 'SaaS Founder', text: 'The GEO optimization is next level. We show up in ChatGPT and Perplexity answers now — that was not even on our radar before DSIG.' },
  { name: 'Jennifer H.', role: 'Architectural Firm', text: 'Our project showcase site is exactly what we envisioned. Clean, fast, and it actually generates qualified leads from search.' },
  { name: 'Robert S.', role: 'MMA Gym Owner', text: 'Full platform with member portal, courses, merch, and dual-currency payments. They shipped what other agencies said would take 6 months — in 3 weeks.' },
  { name: 'Patricia N.', role: 'Real Estate Agent', text: 'The AI blog posts target exactly the right keywords for my market. I went from page 5 to page 1 for "homes for sale" in my area.' },
  { name: 'Steven G.', role: 'HVAC Company', text: 'Every competitor uses the same template sites. Ours looks custom, ranks higher, and the AI keeps it fresh with weekly content updates.' },
  { name: 'Nancy W.', role: 'Salon Owner', text: 'The social media automation saves me hours every week. Five posts a week across three platforms and I barely have to touch it.' },
  { name: 'Brian M.', role: 'Insurance Broker', text: 'The AI agent swarm handles our outreach, follow-ups, and review requests. It runs 24/7 and never misses a lead.' },
  { name: 'Diane L.', role: 'Dental Practice', text: 'We needed a site that ranked and converted. DSIG delivered both — our new patient inquiries are up 68% since launch.' },
  { name: 'Kevin R.', role: 'Landscaping Co.', text: 'The longtail SEO strategy with geo-targeted pages put us on the map in 11 cities. Best marketing investment we have ever made.' },
  { name: 'Amanda J.', role: 'E-commerce Brand', text: 'They migrated our WooCommerce store and added AI-powered product descriptions. Conversion rate jumped 40% in the first quarter.' },
]

// Curated subset — the 9 strongest pullquotes for the visible grid
const featured = reviews.slice(0, 9)

function Stars() {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ name, role, text, featured: isFeatured }: {
  name: string; role: string; text: string; featured?: boolean
}) {
  return (
    <article style={{
      background: isFeatured ? 'linear-gradient(135deg, #1d2330 0%, #2a3448 100%)' : '#fff',
      border: isFeatured ? '1px solid rgba(104,197,173,0.25)' : '1px solid #edf0f4',
      borderRadius: 16,
      padding: isFeatured ? '32px 28px' : '24px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      color: isFeatured ? '#fff' : 'var(--dark)',
      boxShadow: isFeatured
        ? '0 12px 40px rgba(8, 14, 31, 0.15)'
        : '0 1px 2px rgba(16, 24, 40, 0.04)',
      position: 'relative',
    }}>
      {isFeatured && (
        <span aria-hidden="true" style={{
          position: 'absolute', top: 16, right: 20,
          fontSize: '3rem', lineHeight: 1, color: 'rgba(104,197,173,0.18)',
          fontFamily: 'Georgia, serif', pointerEvents: 'none',
        }}>&ldquo;</span>
      )}
      <Stars />
      <p style={{
        color: isFeatured ? 'rgba(255,255,255,0.88)' : 'var(--dark)',
        fontSize: isFeatured ? '1.05rem' : '0.9rem',
        lineHeight: 1.6, margin: 0, flex: 1,
        fontWeight: isFeatured ? 500 : 400,
      }}>
        &ldquo;{text}&rdquo;
      </p>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        paddingTop: 14,
        borderTop: `1px solid ${isFeatured ? 'rgba(255,255,255,0.08)' : '#edf0f4'}`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: isFeatured ? 'rgba(104,197,173,0.2)' : 'rgba(104,197,173,0.12)',
          color: 'var(--teal)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
        }}>
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div style={{
            fontWeight: 700, fontSize: '0.88rem',
            color: isFeatured ? '#fff' : 'var(--dark)',
          }}>{name}</div>
          <div style={{
            fontSize: '0.78rem',
            color: isFeatured ? 'rgba(255,255,255,0.55)' : 'var(--slate)',
          }}>{role}</div>
        </div>
      </div>
    </article>
  )
}

export default function ReviewsMarquee() {
  const [hero, ...rest] = featured

  return (
    <section style={{ background: 'var(--light)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{
            display: 'inline-block',
            background: 'rgba(104, 197, 173, 0.12)',
            color: 'var(--teal)',
            padding: '6px 18px',
            borderRadius: 100,
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            What They&apos;re Saying
          </span>
          <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 12px' }}>
            Don&apos;t Take Our Word for It. Take Theirs.
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 560, margin: '0 auto' }}>
            From general contractors to SaaS founders — here&apos;s what happens when AI meets local business.
          </p>
        </div>

        {/* Wall of reviews — featured pullquote + 3×? grid */}
        <div className="reviews-wall">
          {/* Hero pullquote spans 2 columns */}
          <div className="reviews-hero">
            <ReviewCard {...hero} featured />
          </div>
          {/* Rest of the grid */}
          {rest.map((r, i) => (
            <ReviewCard key={i} {...r} />
          ))}
        </div>

        {/* Aggregate stats strip */}
        <div style={{
          marginTop: 48,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16, padding: '24px 28px',
          background: '#fff', border: '1px solid #edf0f4', borderRadius: 14,
        }}>
          {[
            { v: '4.9★', l: 'Average rating' },
            { v: '120+', l: 'Businesses served' },
            { v: '90 days', l: 'To top-3 Google rank' },
            { v: '24/7', l: 'AI agents running' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate)', marginTop: 6, fontWeight: 600, letterSpacing: '0.02em' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .reviews-wall {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .reviews-hero {
          grid-column: span 2;
          grid-row: span 2;
        }
        @media (max-width: 900px) {
          .reviews-wall { grid-template-columns: repeat(2, 1fr); }
          .reviews-hero { grid-column: span 2; grid-row: auto; }
        }
        @media (max-width: 560px) {
          .reviews-wall { grid-template-columns: 1fr; }
          .reviews-hero { grid-column: span 1; }
        }
      `}</style>
    </section>
  )
}
