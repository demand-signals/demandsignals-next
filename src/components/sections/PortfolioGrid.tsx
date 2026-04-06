import Link from 'next/link';

const clients = [
  { name: 'SB Construction', category: 'Contractor', location: 'El Dorado Hills, CA' },
  { name: 'Hangtown Range', category: 'Firearms Retail', location: 'Placerville, CA' },
  { name: 'Southside MMA', category: 'MMA Gym', location: 'Phuket, Thailand' },
  { name: 'Hill McGlynn', category: 'Recruitment', location: 'Northern CA' },
  { name: 'Sphere Drafting', category: 'Engineering', location: 'Northern CA' },
  { name: 'Jack Russell Farm Brewery', category: 'Brewery', location: 'Camino, CA' },
];

export default function PortfolioGrid() {
  return (
    <section
      style={{
        background: '#fff',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Recent Work
          </span>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.2, margin: '14px 0 16px' }}>
            We Don&apos;t Talk About Results. We Ship Them.
          </h2>
          <p style={{ color: 'var(--slate)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 580, margin: '0 auto' }}>
            Real businesses we&apos;ve launched in the last 6 months — every one ranking, converting, and running on AI.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}
        >
          {clients.map((client) => (
            <div
              key={client.name}
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }}
            >
              {/* Browser frame mockup */}
              <div
                style={{
                  height: 200,
                  background: 'var(--dark)',
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '0',
                }}
              >
                {/* Browser chrome bar */}
                <div style={{
                  height: 28, background: 'var(--dark-2)', display: 'flex',
                  alignItems: 'center', padding: '0 12px', gap: 6,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f56' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#27c93f' }} />
                  <div style={{
                    flex: 1, height: 14, background: 'rgba(255,255,255,0.06)',
                    borderRadius: 4, marginLeft: 8, maxWidth: 180,
                  }} />
                </div>
                {/* Site preview area */}
                <div style={{
                  position: 'absolute', top: 28, left: 0, right: 0, bottom: 0,
                  background: `linear-gradient(135deg, rgba(104,197,173,0.2) 0%, rgba(29,35,48,0.8) 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Live Project</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{client.name}</div>
                  </div>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(104,197,173,0.18)',
                      border: '1px solid rgba(104,197,173,0.4)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--teal)',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {client.category}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div
                style={{
                  padding: '20px 20px 22px',
                  background: '#fff',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--dark)',
                    margin: '0 0 4px',
                  }}
                >
                  {client.name}
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--slate)',
                    margin: 0,
                  }}
                >
                  {client.location}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 44 }}>
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
            View Full Portfolio →
          </Link>
        </div>
      </div>
    </section>
  );
}
