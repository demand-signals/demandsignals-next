import { buildMetadata } from '@/lib/metadata';
import { PageHero } from '@/components/sections/PageHero';
import { BOOKING_URL, CONTACT_EMAIL } from '@/lib/constants';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, howToSchema, faqSchema } from '@/lib/schema';

const faqs = [
  {
    question: 'What exactly does the free Demand Audit include?',
    answer: 'The audit covers six critical visibility layers: Google Search rankings across your top 100 category keywords, Google Maps and Business Profile health, AI visibility across ChatGPT, Gemini, and Perplexity, social media presence and signal quality, website technical performance including Core Web Vitals, and a side-by-side competitor gap analysis. You receive a full scorecard, a top-10 priority fix list, and a 30-day action plan.',
  },
  {
    question: 'How long does the audit take to complete?',
    answer: 'From the moment you complete your 15-minute intake call, our AI research agents begin pulling live data across all six audit dimensions. A human strategist then reviews the findings and builds your prioritized action plan. The full report is delivered within 48 business hours, and it is yours to keep whether or not you engage us for further work.',
  },
  {
    question: 'Is the audit really free? What is the catch?',
    answer: 'There is no catch and no credit card required. We built the Demand Audit as a genuine value-first tool because we believe you should see where you stand before spending anything on marketing. The report is comprehensive and actionable on its own. If the data reveals opportunities where we can help, we will let you know — but there is zero obligation.',
  },
  {
    question: 'What makes this audit different from other free SEO tools?',
    answer: 'Most free tools give you a generic score and a list of technical warnings. Our audit is built specifically for local businesses and includes AI citation testing — something almost no other tool offers. We test dozens of real prompts across ChatGPT, Gemini, and Perplexity to see if your business gets recommended, and we benchmark every metric against your actual local competitors rather than national averages.',
  },
  {
    question: 'Do I need to prepare anything before the audit call?',
    answer: 'No preparation is required. During the 15-minute call we will ask a few quick questions about your business, your service area, and who your main competitors are. That is all we need to run a thorough audit. If you have access to your Google Business Profile or Google Analytics, that can help us go deeper, but it is not necessary to get started.',
  },
];


export const metadata = buildMetadata({
  title:              "Free Demand Audit — See Where You're Losing Customers Online",
  description:        "Get a free AI-powered audit of your online presence across Google, Maps, AI assistants, and social media. See exactly where you're losing customers — before you spend a dollar. Northern California businesses.",
  path:               '/tools/demand-audit',
  keywords:           [
    'free SEO audit local business',
    'free demand audit Northern California',
    'AI visibility audit Sacramento',
    'Google My Business audit free',
    'local search audit El Dorado County',
    'competitor gap analysis local business',
    'free online presence audit',
  ],
  ogDescription:      "Free AI-powered audit across Google, Maps, AI assistants, and social media. See exactly where you're losing customers.",
  twitterTitle:       'Free Demand Audit for Local Business',
  twitterDescription: 'Stop guessing. See exactly where you stand across Google, Maps, AI assistants, and social — for free.',
});

const AUDIT_AREAS = [
  {
    num: '01',
    title: 'Google Search Rankings',
    description:
      'We pull your actual keyword positions across the top 100 queries in your category and geography — so you see exactly where you rank and where your competitors are beating you.',
  },
  {
    num: '02',
    title: 'Google Maps & GMB',
    description:
      'Your Google Business Profile is your most powerful local asset. We audit completeness, photo health, review velocity, category accuracy, and local pack visibility.',
  },
  {
    num: '03',
    title: 'AI Visibility (ChatGPT / Gemini / Perplexity)',
    description:
      "When someone asks an AI assistant to recommend a business like yours, do you get mentioned? We test dozens of prompts and document exactly where you appear — and where you don't.",
  },
  {
    num: '04',
    title: 'Social Media Presence',
    description:
      'Inconsistent or dormant social profiles actively hurt your authority score. We audit your profiles across platforms for consistency, engagement, and signal quality.',
  },
  {
    num: '05',
    title: 'Website Performance',
    description:
      'Core Web Vitals, mobile speed, crawlability, structured data, and schema markup — we check every technical signal Google uses to evaluate your site quality.',
  },
  {
    num: '06',
    title: 'Competitor Gap Analysis',
    description:
      'We benchmark your scores against your top 3 local competitors and surface the specific gaps — so you know exactly which moves will have the highest impact first.',
  },
];

const DELIVERABLES = [
  'Full visibility scorecard across all 6 audit dimensions',
  'Top 10 priority fixes ranked by impact',
  'Side-by-side competitor benchmark',
  'AI citation status across ChatGPT, Gemini, and Perplexity',
  '30-day action plan with specific, sequenced tasks',
];

export default function DemandAuditPage() {
  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd
        data={howToSchema(
          'How to Get Your Free Demand Audit',
          'A free AI-powered audit of your online presence across Google, Maps, AI assistants, and social media — delivered within 48 hours.',
          [
            {
              name: 'Book a 15-Minute Call',
              text: 'Pick a time on our calendar. We will ask a few quick questions about your business, your market, and your top competitors.',
            },
            {
              name: 'We Run the Audit',
              text: 'Our AI agents pull live data across all six audit dimensions — Google rankings, GMB health, AI visibility, social presence, website performance, and competitor gaps.',
            },
            {
              name: 'Receive Your Report in 48 Hours',
              text: 'A human strategist reviews the findings and builds your prioritized action plan. You receive the full report within two business days — free to keep whether you work with us or not.',
            },
          ],
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Tools', url: 'https://demandsignals.co/tools' },
          { name: 'Free Demand Audit', url: 'https://demandsignals.co/tools/demand-audit' },
        ])}
      />
      <PageHero
        eyebrow="Free Tool"
        title={
          <>
            <span style={{color:'#FF6B2B'}}>See Exactly</span> Where You Stand —{' '}
            <span style={{color:'#52C9A0'}}>Before You Spend a Dollar.</span>
          </>
        }
        subtitle="Our AI scans your online presence across Google, maps, social, and every AI assistant and tells you exactly where you're losing customers."
        ctaLabel="Book Your Free Audit →"
        ctaHref={BOOKING_URL}
        callout={<><span style={{color:'#52C9A0'}}>Most businesses have no idea</span> what their competitors are doing in local search. Our audit shows you everything — in under 5 minutes, for free.</>}
      />

      {/* What We Audit */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={eyebrowStyle}>The Audit</p>
            <h2 style={h2Style}>What We Audit</h2>
            <p style={subStyle}>
              Six critical visibility layers that determine whether customers find you — or find your competitor instead.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
            }}
          >
            {AUDIT_AREAS.map((area) => (
              <div key={area.num} style={cardStyle}>
                <p style={{ color: 'var(--teal)', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.12em', marginBottom: 14 }}>
                  {area.num}
                </p>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10 }}>
                  {area.title}
                </h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.92rem', lineHeight: 1.65, margin: 0 }}>
                  {area.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={eyebrowStyle}>Deliverables</p>
          <h2 style={h2Style}>What You Get</h2>
          <p style={{ ...subStyle, marginBottom: 48 }}>
            Every audit is prepared by our AI research agents, reviewed by a human strategist, and delivered within 48 hours of your call.
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 auto', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {DELIVERABLES.map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    background: 'rgba(82,201,160,0.12)',
                    border: '1.5px solid var(--teal)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--teal)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    marginTop: 1,
                  }}
                >
                  ✓
                </span>
                <span style={{ color: 'var(--dark)', fontSize: '1rem', lineHeight: 1.6 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How to Get Your Audit */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={eyebrowStyle}>Simple Process</p>
            <h2 style={h2Style}>How to Get Your Audit</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            <div style={cardStyle}>
              <div style={stepCircleStyle}>1</div>
              <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>
                Book a 15-Min Call
              </h3>
              <p style={{ color: 'var(--slate)', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>
                Pick a time that works for you. We'll ask a few quick questions about your business, your market, and your top competitors — nothing complicated.
              </p>
            </div>

            <div style={cardStyle}>
              <div style={stepCircleStyle}>2</div>
              <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>
                We Run the Audit and Deliver in 48 Hours
              </h3>
              <p style={{ color: 'var(--slate)', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>
                Our AI agents pull live data across all six audit layers. A human strategist reviews the findings and builds your action plan. You get the full report within two business days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>FAQ</span>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 0' }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {faqs.map(faq => (
              <div key={faq.question} style={{ background: 'var(--light)', borderRadius: 14, padding: '24px 28px' }}>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 10, lineHeight: 1.4 }}>{faq.question}</h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.7, margin: 0 }}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 18, lineHeight: 1.2 }}>
            Stop Guessing. Start with Data.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: 36 }}>
            The audit is free. The call is 15 minutes. The action plan is yours to keep — whether you work with us or not.
          </p>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
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
            }}
          >
            Book a Free Call →
          </a>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', marginTop: 20 }}>
            Questions? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--teal)', textDecoration: 'none' }}>
              {CONTACT_EMAIL}
            </a>
          </p>
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

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 14,
  padding: '32px 28px',
};

const stepCircleStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  background: 'var(--teal)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontWeight: 800,
  fontSize: '1.2rem',
  marginBottom: 18,
};
