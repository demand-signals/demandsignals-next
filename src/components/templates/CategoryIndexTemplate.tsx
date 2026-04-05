import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/constants'

type ServiceCard = {
  icon: string
  href: string
  title: string
  description: string
  features: string[]
}

type FAQ = {
  question: string
  answer: string
}

export type CategoryIndexProps = {
  eyebrow: string
  titleHtml: React.ReactNode
  subtitle: string
  services: ServiceCard[]
  faqs: FAQ[]
  breadcrumbName: string
  breadcrumbPath: string
  ctaHeading?: string
  ctaText?: string
}

export function CategoryIndexTemplate({
  eyebrow, titleHtml, subtitle, services, faqs,
  breadcrumbName, breadcrumbPath,
  ctaHeading = 'Not Sure Where to Start?',
  ctaText = 'Start with a free intelligence report. We\'ll tell you exactly where your biggest opportunities are — then you decide what to do next.',
}: CategoryIndexProps) {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: SITE_URL },
        { name: breadcrumbName, url: `${SITE_URL}${breadcrumbPath}` },
      ])} />
      {faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}

      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 14 }}>
            {eyebrow}
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            {titleHtml}
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
            {subtitle}
          </p>
        </div>
      </section>

      {/* Service Cards */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28 }}>
            {services.map((service) => (
              <a key={service.title} href={service.href} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                textDecoration: 'none',
                transition: 'box-shadow 0.22s, border-color 0.22s',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 16 }}>{service.icon}</div>
                <h2 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 12, lineHeight: 1.35 }}>
                  {service.title}
                </h2>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.65, marginBottom: 20, flex: 1 }}>
                  {service.description}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {service.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate)', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--teal)', fontWeight: 700 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section style={{ background: '#fff', padding: '72px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
                FAQ
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, margin: 0 }}>
                Frequently Asked Questions
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {faqs.map((faq) => (
                <div key={faq.question} style={{ background: 'var(--light)', borderRadius: 14, padding: '24px 28px' }}>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 10, lineHeight: 1.4 }}>
                    {faq.question}
                  </h3>
                  <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.7, margin: 0 }}>
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ background: '#FF6B2B', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            {ctaHeading}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, marginBottom: 28 }}>
            {ctaText}
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/tools/research-reports" style={{
              background: 'var(--dark)', color: '#fff', fontWeight: 700,
              padding: '13px 28px', borderRadius: 100, textDecoration: 'none',
            }}>
              Get a Free Report →
            </a>
            <a href="/contact" style={{
              background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600,
              padding: '13px 28px', borderRadius: 100, textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.6)',
            }}>
              Talk to Us
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
