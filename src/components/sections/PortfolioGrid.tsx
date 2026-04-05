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
        <h2
          style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
            fontWeight: 800,
            color: 'var(--dark)',
            textAlign: 'center',
            marginBottom: 56,
            lineHeight: 1.2,
          }}
        >
          Clients Who Stand Out.
        </h2>

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
              {/* Placeholder image area */}
              <div
                style={{
                  height: 200,
                  background: 'var(--dark-2)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(135deg, rgba(104,197,173,0.25) 0%, rgba(29,35,48,0.6) 100%)',
                  }}
                />
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
