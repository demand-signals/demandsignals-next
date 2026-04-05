import Link from 'next/link';

const rows = [
  { industry: 'General Contracting', type: 'Full site + longtail SEO — 93 geo-targeted pages, #1 for 40+ local terms', services: ['WordPress', 'Local SEO', 'GEO'], shipped: 'Mar 28, 2026' },
  { industry: 'Gun Range & Retail', type: 'Site + CA compliance tool + AI agent integration + Clover POS', services: ['Next.js', 'AI Agents', 'E-commerce'], shipped: 'Mar 21, 2026' },
  { industry: 'Marine Fuel Services', type: 'Site + service area targeting + GMB domination', services: ['WordPress', 'GBP Admin', 'Geo-Targeting'], shipped: 'Mar 14, 2026' },
  { industry: 'Pool Services', type: 'Site + service area pages + local demand system', services: ['WordPress', 'Local SEO', 'Content'], shipped: 'Mar 7, 2026' },
  { industry: 'Med Spa', type: 'Site + booking integration + GEO optimization', services: ['WordPress', 'GEO', 'AI Content'], shipped: 'Feb 28, 2026' },
  { industry: 'Architectural Drafting', type: 'Site + project showcase + local SEO', services: ['WordPress', 'Portfolio', 'Local SEO'], shipped: 'Feb 20, 2026' },
  { industry: 'Recruitment', type: 'Site + job board + candidate flow — 3x qualified calls in 90 days', services: ['Next.js', 'AI Outreach', 'Automation'], shipped: 'Feb 13, 2026' },
  { industry: 'Wellness & Therapy', type: 'Site + appointment system + content engine', services: ['WordPress', 'AI Content', 'Booking'], shipped: 'Feb 5, 2026' },
  { industry: 'Restaurant', type: 'Site + menu system + online ordering', services: ['WordPress', 'E-commerce', 'GBP'], shipped: 'Jan 29, 2026' },
  { industry: 'DMV Services', type: 'Site + service scheduling + local AI visibility', services: ['WordPress', 'GEO', 'AI Agents'], shipped: 'Jan 21, 2026' },
  { industry: 'Craft Brewery', type: 'Site + events + taproom — 2K+ Instagram followers', services: ['WordPress', 'Social Media', 'Content'], shipped: 'Jan 14, 2026' },
  { industry: 'Legal Services', type: 'Site + client intake automation + AI document generation', services: ['Next.js', 'AI Agents', 'Automation'], shipped: 'Jan 6, 2026' },
  { industry: 'SaaS Product', type: 'Product site + onboarding flow + GEO optimization', services: ['Next.js', 'GEO', 'AI Content'], shipped: 'Dec 30, 2025' },
  { industry: 'MMA Gym (International)', type: 'Full platform: member portal, courses, merch, dual-currency payments, gamification', services: ['Next.js', 'E-commerce', 'AI Agents'], shipped: 'Dec 22, 2025' },
];

export default function ProofTable() {
  return (
    <section
      style={{
        background: 'var(--light)',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2
          style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
            fontWeight: 800,
            color: 'var(--dark)',
            textAlign: 'center',
            marginBottom: 16,
            lineHeight: 1.2,
          }}
        >
          14 Projects. Every Industry. All in the Last 6 Months.
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--slate)', fontSize: '1.05rem', marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
          We ship over a project per week. Here&apos;s what we&apos;ve delivered recently.
        </p>

        <div
          style={{
            overflowX: 'auto',
            borderRadius: 12,
            border: '1px solid var(--border)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#fff',
              fontSize: '0.92rem',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--dark)',
                  color: '#fff',
                }}
              >
                {['Industry', 'What We Shipped', 'Services', 'Shipped'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.industry}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? '#fff' : 'var(--light)',
                    transition: 'background var(--t)',
                  }}
                >
                  <td
                    style={{
                      padding: '14px 20px',
                      fontWeight: 700,
                      color: 'var(--dark)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.industry}
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                      color: 'var(--dark)',
                      lineHeight: 1.5,
                    }}
                  >
                    {row.type}
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {row.services.map((s) => (
                        <span
                          key={s}
                          style={{
                            background: 'rgba(104,197,173,0.12)',
                            color: 'var(--teal-dark)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 100,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                      color: 'var(--slate)',
                      whiteSpace: 'nowrap',
                      fontSize: '0.85rem',
                    }}
                  >
                    {row.shipped}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <Link
            href="/portfolio"
            style={{
              color: 'var(--teal-dark)',
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
              borderBottom: '2px solid var(--teal)',
              paddingBottom: 2,
              transition: 'color var(--t)',
            }}
          >
            See Full Portfolio →
          </Link>
        </div>
      </div>
    </section>
  );
}
