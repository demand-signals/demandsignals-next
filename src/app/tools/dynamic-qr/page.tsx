import { buildMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, howToSchema, faqSchema } from '@/lib/schema';

const faqs = [
  {
    question: 'What is the difference between a static QR code and a dynamic QR code?',
    answer: 'A static QR code permanently encodes a single URL directly into its pattern — once printed, it can never be changed. A dynamic QR code points to an intermediate redirect that you control, meaning you can update the destination URL at any time without reprinting the physical code. Dynamic QR codes also enable scan tracking, geo-location analytics, and UTM parameter tagging that static codes cannot provide.',
  },
  {
    question: 'Can I update where my QR code points after printing it?',
    answer: 'Yes, that is the core advantage of dynamic QR codes. You can change the destination URL as many times as you need through your dashboard without ever reprinting the physical code. This is ideal for restaurant menus that change seasonally, business cards that need updated portfolio links, or event signage that should redirect to a recap page after the event ends.',
  },
  {
    question: 'What analytics do dynamic QR codes provide?',
    answer: 'Our dynamic QR platform provides real-time scan analytics including total and unique scan counts, scan-over-time charts, device and operating system breakdowns, and geo-location data by city, ZIP code, and neighborhood. Every scan is automatically tagged with UTM parameters for clean attribution in Google Analytics. This turns every physical placement into a measurable marketing channel.',
  },
  {
    question: 'What are the best use cases for dynamic QR codes in local businesses?',
    answer: 'The most effective use cases include restaurant table tents linked to daily-updated menus, business cards with editable portfolio or booking links, vehicle wraps with location-tracked scan data to measure route effectiveness, event signage that can be redirected post-event, and product packaging with links to tutorials or warranty registration. Any physical surface where your links might change or where you want scan analytics is a strong candidate.',
  },
  {
    question: 'Can I customize the design of my QR codes with my brand colors and logo?',
    answer: 'Yes, our platform supports fully branded QR code designs including custom colors, logo overlays, and branded frames. Research shows that branded QR codes generate significantly higher scan rates than generic black-and-white codes because customers trust them more. You can also generate QR codes in bulk for product packaging, event badges, or multi-location rollouts with consistent branding across every code.',
  },
];

export const metadata = buildMetadata({
  title:              'Dynamic QR Codes — Track Every Scan, Update Any Destination',
  description:        'Smart QR codes with real-time scan analytics, geo-location tracking, and editable destinations for local businesses. No reprinting when your links change. Restaurant menus, business cards, signage.',
  path:               '/tools/dynamic-qr',
  keywords:           [
    'dynamic QR codes local business',
    'trackable QR codes Northern California',
    'editable QR code destination',
    'QR scan analytics',
    'restaurant menu QR code',
    'business card QR code tracking',
    'branded QR codes',
  ],
  ogDescription:      'Smart QR codes for local businesses. Real-time scan analytics, geo-location tracking, and editable destinations. No reprinting.',
  twitterTitle:       'Dynamic QR Codes for Local Business',
  twitterDescription: 'Track every scan. Update any destination. No reprinting. Smart QR codes with real-time analytics.',
});

const USE_CASES = [
  {
    title: 'Restaurant Menus',
    description:
      'Update your menu daily — prices, specials, seasonal items — without ever reprinting a QR code. Your table tents stay the same; only the destination changes.',
  },
  {
    title: 'Business Cards',
    description:
      "Update your booking link, portfolio URL, or contact page anytime. Your cards never go stale, even when your website changes.",
  },
  {
    title: 'Truck & Vehicle Wraps',
    description:
      'Track scan location by city, neighborhood, and route. See exactly which areas generate the most interest and optimize your coverage accordingly.',
  },
  {
    title: 'Event Signage',
    description:
      'Point QR codes to event-day information, then instantly redirect to a recap video, photo gallery, or next-event registration — the moment the event ends.',
  },
];

const FEATURES = [
  {
    label: 'Real-Time Scan Analytics',
    detail: 'Total scans, unique scans, scan-over-time charts, and device breakdown — all in a live dashboard.',
  },
  {
    label: 'Geo-Location Tracking',
    detail: 'See where in the world each scan originated. Map scan density by city, ZIP code, or neighborhood.',
  },
  {
    label: 'UTM Parameter Auto-Tagging',
    detail: 'Every scan automatically appends UTM parameters so your Google Analytics and ad attribution stay clean.',
  },
  {
    label: 'Bulk QR Generation',
    detail: 'Generate hundreds of unique QR codes at once — for product packaging, event badges, or a full menu reprint.',
  },
  {
    label: 'Custom Branded QR Designs',
    detail: 'Replace the generic black-and-white grid with your brand colors, logo, and custom frame — QR codes your customers will actually trust.',
  },
];

export default function DynamicQrPage() {
  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd
        data={howToSchema(
          'How to Use Dynamic QR Codes for Your Business',
          'Smart QR codes with real-time scan analytics and editable destinations — no reprinting required when your links change.',
          [
            {
              name: 'Generate Your Dynamic QR Code',
              text: 'Create a dynamic QR code linked to any URL — your menu, booking page, portfolio, or landing page. Choose your design, colors, and optional logo overlay.',
            },
            {
              name: 'Deploy on Any Physical Surface',
              text: 'Print the QR code on business cards, table tents, vehicle wraps, event signage, packaging, or any physical marketing material.',
            },
            {
              name: 'Track Scans and Update Destinations Anytime',
              text: 'Monitor real-time scan analytics by location, device, and time. Update the destination URL at any time without reprinting — your QR code always stays current.',
            },
          ],
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: 'https://demandsignals.co' },
          { name: 'Tools', url: 'https://demandsignals.co/tools' },
          { name: 'Dynamic QR Codes', url: 'https://demandsignals.co/tools/dynamic-qr' },
        ])}
      />
      <PageHero
        eyebrow="Coming Soon — Dynamic QR Codes"
        title={
          <>
            <span style={{color:'#52C9A0'}}>Track Every Scan.</span> Update Any Destination.{' '}
            <span style={{color:'#FF6B2B'}}>No Reprinting.</span>
          </>
        }
        subtitle="Smart QR codes for business cards, menus, signage, and ads — with real-time scan analytics and editable destinations."
        ctaLabel="Get Early Access →"
        ctaHref="/contact"
        callout={<>Static QR codes are a dead end. <span style={{color:'#52C9A0'}}>Dynamic QR codes</span> let you redirect, track, and optimize every scan — without reprinting anything.</>}
      />

      {/* Use Cases */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={eyebrowStyle}>Use Cases</p>
            <h2 style={h2Style}>Offline Marketing That Connects to Online Data</h2>
            <p style={subStyle}>
              Any physical surface with a QR code becomes a trackable, editable marketing channel.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24 }}>
            {USE_CASES.map((uc) => (
              <div key={uc.title} style={cardStyle}>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 10 }}>
                  {uc.title}
                </h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.65, margin: 0 }}>
                  {uc.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={eyebrowStyle}>Platform Features</p>
            <h2 style={h2Style}>Everything You Need to Run QR at Scale</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FEATURES.map((f) => (
              <div
                key={f.label}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 18,
                  background: 'var(--light)',
                  borderRadius: 12,
                  padding: '24px 24px',
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    background: 'var(--teal)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    marginTop: 2,
                  }}
                >
                  ✓
                </span>
                <div>
                  <p style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '0.98rem', marginBottom: 4 }}>
                    {f.label}
                  </p>
                  <p style={{ color: 'var(--slate)', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                    {f.detail}
                  </p>
                </div>
              </div>
            ))}
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

      {/* Early Access CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={badgeStyle}>Coming Soon</div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 800, marginBottom: 18, lineHeight: 1.2 }}>
            Get Early Access to Dynamic QR
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: 36 }}>
            We're opening a limited early access cohort. Sign up and you'll get first access, founding member pricing, and a hands-on onboarding session with our team.
          </p>
          <Link href="/contact" style={ctaButtonStyle}>
            Request Early Access →
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

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 14,
  padding: '32px 28px',
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
