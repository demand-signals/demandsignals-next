import Link from 'next/link';

const rows = [
  { client: 'SB Construction', industry: 'General Contracting', built: 'Full site + longtail SEO — 93 geo-targeted pages, #1 for 40+ local terms' },
  { client: 'Hangtown Range', industry: 'Gun Range & Retail', built: 'Site + CA compliance tool + AI agent integration + Clover POS' },
  { client: 'Dockside Fuel Services', industry: 'Marine Fuel Services', built: 'Site + service area targeting + GMB domination' },
  { client: 'TruBlu Solutions', industry: 'Pool Services', built: 'Site + service area pages + local demand system' },
  { client: 'Savia Azul', industry: 'Med Spa', built: 'Site + booking integration + GEO optimization' },
  { client: 'Sphere Drafting', industry: 'Architectural Drafting', built: 'Site + project showcase + local SEO' },
  { client: 'Hill McGlynn', industry: 'Recruitment', built: 'Site + job board + candidate flow — 3x qualified calls in 90 days' },
  { client: 'Mind Tree', industry: 'Wellness', built: 'Site + appointment system + content engine' },
  { client: 'Halal Grill', industry: 'Restaurant', built: 'Site + menu system + online ordering' },
  { client: 'QuickTags', industry: 'DMV Services', built: 'Site + service scheduling + local AI visibility' },
  { client: 'Jack Russell Brewery', industry: 'Craft Brewery', built: 'Site + events + taproom — 2K+ Instagram followers' },
  { client: 'Law by Leo', industry: 'Legal Services', built: 'Site + client intake automation + AI document generation' },
  { client: 'Dynapod', industry: 'SaaS Product', built: 'Product site + onboarding flow + GEO optimization' },
  { client: 'Southside MMA', industry: 'MMA Gym (Thailand)', built: 'Full platform: member portal, courses, merch, dual-currency payments, gamification' },
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
            marginBottom: 48,
            lineHeight: 1.2,
          }}
        >
          14 Businesses. Every Industry. All in the Last 6 Months.
        </h2>

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
                {['Client', 'Industry', 'What We Built'].map((h) => (
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
                  key={row.client}
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
                    {row.client}
                  </td>
                  <td
                    style={{
                      padding: '14px 20px',
                      color: 'var(--slate)',
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
                    {row.built}
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
