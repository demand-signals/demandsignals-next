import { buildMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata = buildMetadata({
  title:              'Demand Links — AI Link Intelligence for Local Business Authority',
  description:        'AI-powered link intelligence that identifies competitor link gaps, finds local citation opportunities, and builds the exact authority signals Google and AI assistants need to rank and cite you.',
  path:               '/tools/demand-links',
  keywords:           [
    'link building tool local business',
    'AI backlink intelligence',
    'local citation opportunity finder',
    'competitor link gap analysis',
    'link velocity tracking',
    'authority signal building Northern California',
    'local SEO link tool',
  ],
  ogDescription:      'AI-powered link intelligence that identifies and builds the exact authority signals Google and AI assistants need to trust you.',
  twitterTitle:       'Demand Links — AI Link Intelligence Tool',
  twitterDescription: 'Build the exact authority signals Google and AI need. Competitor gaps, local citations, link velocity tracking.',
});

const FEATURES = [
  {
    title: 'Identify Competitor Link Gaps',
    description:
      "We map every domain linking to your top competitors and surface the exact opportunities your site is missing. Stop building links randomly — target the ones that move the needle.",
  },
  {
    title: 'Find Local Citation Opportunities',
    description:
      'Local citations — consistent NAP data across directories, industry sites, and local publications — are foundational for maps rankings. We identify every citation source you should be on.',
  },
  {
    title: 'Track Link Velocity',
    description:
      'See how fast your link profile is growing versus competitors. Demand Links monitors acquisition pace and flags when you need to accelerate — or when you\'ve earned enough to coast.',
  },
  {
    title: 'Alert on Lost Links',
    description:
      'Backlinks disappear without warning when sites restructure or go offline. We monitor your entire link profile and alert you immediately when a valuable link is lost so you can recover it.',
  },
];

export default function DemandLinksPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Tools', url: 'https://demandsignals.co/tools' },
          { name: 'Demand Links', url: 'https://demandsignals.co/tools/demand-links' },
        ])}
      />
      <PageHero
        eyebrow="Coming Soon — Demand Links"
        title={
          <>
            Build the <span style={{color:'#52C9A0'}}>Exact Authority Signals</span> Google and AI{' '}
            <span style={{color:'#FF6B2B'}}>Need to Trust You.</span>
          </>
        }
        subtitle="AI-powered link intelligence that identifies and builds the specific backlinks your business needs to rank and get cited."
        ctaLabel="Join the Waitlist →"
        ctaHref="/contact"
        callout={<>Google and AI models both rank trust signals before content. <span style={{color:'#52C9A0'}}>Authority links</span> are the single highest-leverage signal you can build.</>}
      />

      {/* What Demand Links Will Do */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={eyebrowStyle}>Features</p>
            <h2 style={h2Style}>What Demand Links Will Do</h2>
            <p style={subStyle}>
              Built for local and regional businesses that need real authority — not vanity metrics and generic link reports.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} style={featureCardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={iconBoxStyle}>{i + 1}</div>
                  <div>
                    <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10 }}>
                      {f.title}
                    </h3>
                    <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.65, margin: 0 }}>
                      {f.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Links Still Matter */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ ...eyebrowStyle, textAlign: 'center' }}>Why It Matters</p>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>Why Links Still Matter in 2025</h2>

          <div style={{ background: 'var(--light)', borderRadius: 16, padding: '40px 36px', marginTop: 36 }}>
            <p style={{ color: 'var(--dark)', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: 20 }}>
              Backlinks remain Google's single strongest authority signal. Despite years of predictions that links would "stop mattering," the data consistently shows that businesses with stronger, more relevant link profiles rank higher — period.
            </p>
            <p style={{ color: 'var(--dark)', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: 20 }}>
              But there's a second dimension most agencies miss entirely: AI citation. When ChatGPT, Gemini, and Perplexity decide which businesses to recommend, they lean heavily on the web's link graph. The businesses with the deepest authority signals — links from local news, industry publications, trusted directories — get cited by AI. The ones without them don't.
            </p>
            <p style={{ color: 'var(--slate)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 20 }}>
              Demand Links is designed to help you win on both fronts: organic search rankings <em>and</em> AI citation status — with a single, unified link intelligence system.
            </p>
          </div>
        </div>
      </section>

      {/* Early Access */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={badgeStyle}>Early Access</div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 800, marginBottom: 18, lineHeight: 1.2 }}>
            Be First in Line When We Launch
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: 36 }}>
            Demand Links is in active development. Early access members will get priority onboarding, founding member pricing, and a direct line to our product team.
          </p>
          <Link
            href="/contact"
            style={ctaButtonStyle}
          >
            Join the Waitlist →
          </Link>
        </div>
      </section>
    </>
  );
}

const eyebrowStyle: React.CSSProperties = {
  color: 'var(--teal)',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontSize: '0.82rem',
  marginBottom: 10,
};

const h2Style: React.CSSProperties = {
  color: 'var(--dark)',
  fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
  fontWeight: 800,
  marginBottom: 16,
  lineHeight: 1.15,
};

const subStyle: React.CSSProperties = {
  color: 'var(--slate)',
  fontSize: '1rem',
  lineHeight: 1.65,
  maxWidth: 560,
  margin: '0 auto',
};

const featureCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 14,
  padding: '32px 28px',
};

const iconBoxStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 44,
  height: 44,
  background: 'rgba(82,201,160,0.12)',
  border: '1.5px solid rgba(82,201,160,0.35)',
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--teal)',
  fontWeight: 800,
  fontSize: '1rem',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'rgba(82,201,160,0.15)',
  border: '1px solid rgba(82,201,160,0.3)',
  color: 'var(--teal)',
  fontWeight: 700,
  fontSize: '0.8rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '6px 16px',
  borderRadius: 100,
  marginBottom: 20,
};

const ctaButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '16px 40px',
  background: '#FF6B2B',
  color: '#fff',
  fontWeight: 700,
  fontSize: '1.05rem',
  borderRadius: 100,
  textDecoration: 'none',
  boxShadow: '0 4px 24px rgba(255,107,43,0.35)',
};
