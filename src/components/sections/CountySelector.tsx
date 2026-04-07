'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

type CityInfo = {
  slug: string
  name: string
  population: string
  industries: string[]
}

type CountyInfo = {
  slug: string
  name: string
  tagline: string
  subtitle: string
  description: string
  cities: CityInfo[]
  featured: boolean
  color: string
  stats: Array<{ value: string; label: string }>
}

function CityCard({ city, color }: { city: CityInfo; color: string }) {
  return (
    <Link href={`/locations/${city.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, overflow: 'hidden', height: '100%',
        display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.22s, transform 0.22s',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = color
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
        }}
      >
        <div style={{ height: 3, background: color }} />
        <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            {city.name}
          </h4>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
            {city.population} residents
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
            {city.industries.slice(0, 3).map(ind => (
              <span key={ind} style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 100, padding: '2px 10px',
                fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500,
              }}>
                {ind}
              </span>
            ))}
          </div>
          <span style={{ color, fontWeight: 600, fontSize: '0.82rem', marginTop: 4 }}>
            View Services →
          </span>
        </div>
      </div>
    </Link>
  )
}

function CountyPanel({ county }: { county: CountyInfo }) {
  return (
    <>
      {/* County header row */}
      <div style={{
        display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap',
        marginBottom: 40,
      }}>
        <div style={{ flex: '1 1 400px', minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <p style={{
              color: county.color, fontWeight: 700, fontSize: '0.78rem',
              textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0,
            }}>
              {county.subtitle}
            </p>
            {county.featured && (
              <span style={{
                background: 'rgba(82,201,160,0.15)', border: '1px solid rgba(82,201,160,0.3)',
                borderRadius: 100, padding: '3px 12px',
                fontSize: '0.68rem', fontWeight: 700, color: '#52C9A0',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Our Home County
              </span>
            )}
          </div>
          <h3 style={{
            color: '#fff', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
            fontWeight: 800, marginBottom: 14, lineHeight: 1.2,
          }}>
            {county.name}
          </h3>
          <p style={{
            color: 'rgba(255,255,255,0.65)', fontSize: '1.02rem',
            maxWidth: 560, lineHeight: 1.75,
          }}>
            {county.description}
          </p>
        </div>

        <div style={{ flex: '0 0 auto', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {county.stats.map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '18px 22px', textAlign: 'center', minWidth: 105,
            }}>
              <div style={{ color: county.color, fontWeight: 800, fontSize: '1.3rem', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', marginTop: 6, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* City cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 18,
      }}>
        {county.cities.map(city => (
          <CityCard key={city.slug} city={city} color={county.color} />
        ))}
      </div>
    </>
  )
}

export function CountySelector({ counties }: { counties: CountyInfo[] }) {
  const [active, setActive] = useState(0)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* ── County tab bar ──────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
        marginBottom: 48,
      }}>
        {counties.map((c, i) => {
          const isActive = i === active
          return (
            <button
              key={c.slug}
              onClick={() => setActive(i)}
              style={{
                background: isActive ? c.color : 'rgba(255,255,255,0.06)',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                border: isActive ? `2px solid ${c.color}` : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 100,
                padding: isActive ? '12px 28px' : '12px 24px',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                position: 'relative',
                whiteSpace: 'nowrap',
              }}
            >
              {c.featured && (
                <span style={{
                  position: 'absolute', top: -8, right: -4,
                  background: '#FF6B2B', color: '#fff',
                  borderRadius: 100, padding: '1px 8px',
                  fontSize: '0.58rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  HQ
                </span>
              )}
              {c.name.replace(' County', '')}
            </button>
          )
        })}
      </div>

      {/* ── Active county panel ─────────────────────────────── */}
      <motion.div
        key={counties[active].slug}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CountyPanel county={counties[active]} />
      </motion.div>
    </div>
  )
}
