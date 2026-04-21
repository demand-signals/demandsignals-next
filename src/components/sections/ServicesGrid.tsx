'use client'

import { useState } from 'react'
import Link from 'next/link'

type Service = {
  id: string
  color: string
  emoji: string
  eyebrow: string
  title: string
  short: string
  bullets: string[]
  href: string
}

const SERVICES: Service[] = [
  {
    id: 'websites',
    color: '#2563EB',
    emoji: '🌐',
    eyebrow: 'Websites & Apps',
    title: 'AI-ready websites that rank themselves',
    short: 'WordPress, React/Next.js, mobile apps — built with GEO and local SEO wired in from day one.',
    bullets: ['WordPress & Next.js sites', 'Mobile apps (iOS/Android)', 'Edge hosting & analytics', 'Conversion tracking built-in'],
    href: '/websites-apps',
  },
  {
    id: 'demand',
    color: '#059669',
    emoji: '📡',
    eyebrow: 'Demand Generation',
    title: 'Show up where your customers are looking',
    short: 'Local SEO + GEO optimization gets you cited by ChatGPT, Google, and Perplexity.',
    bullets: ['LLM & GEO optimization', 'Local SEO + citations', 'Geo-targeted campaigns', 'GBP management'],
    href: '/demand-generation',
  },
  {
    id: 'content',
    color: '#DB2777',
    emoji: '✍️',
    eyebrow: 'Content & Social',
    title: 'Your content engine, fully automated',
    short: 'AI writes your blog, social posts, and GBP updates — in your brand voice, on schedule.',
    bullets: ['AI content generation', '5–7 social posts/week', 'Brand voice tuning', 'Review response automation'],
    href: '/content-social',
  },
  {
    id: 'agents',
    color: '#7C3AED',
    emoji: '🤖',
    eyebrow: 'AI & Agents',
    title: 'Agent swarms that run your ops 24/7',
    short: 'Custom agent swarms handle outreach, support, and workflow automation on autopilot.',
    bullets: ['AI agent swarms', 'Workforce automation', 'Private LLMs', 'AI outreach systems'],
    href: '/ai-services',
  },
  {
    id: 'strategy',
    color: '#EA580C',
    emoji: '🎯',
    eyebrow: 'Strategy',
    title: 'An AI roadmap tailored to your business',
    short: 'We audit your operation and build a phased plan to 3× your output without more headcount.',
    bullets: ['AI adoption audit', 'Tool stack consolidation', 'Team training', 'Quarterly roadmap'],
    href: '/ai-services/ai-automation-strategies',
  },
]

export function ServicesGrid() {
  const [activeId, setActiveId] = useState(SERVICES[0].id)
  const cur = SERVICES.find(s => s.id === activeId) || SERVICES[0]

  return (
    <section id="services" aria-labelledby="services-heading" className="ds-ww">
      <div className="ds-ww__inner">
        {/* Header */}
        <div className="ds-ww__head">
          <span className="ds-ww__eyebrow">WHAT WE DO</span>
          <h2 id="services-heading" className="ds-ww__h2">
            Everything You Need to{' '}
            <span className="ds-ww__h2-emph">Dominate Your Market</span>
          </h2>
          <p className="ds-ww__sub">
            Click any capability to dig in. We can run any one of these, or all five as a single system.
          </p>
        </div>

        {/* Tab strip */}
        <div className="ds-ww__tabs" role="tablist">
          {SERVICES.map(s => {
            const active = s.id === activeId
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveId(s.id)}
                className="ds-ww__tab"
                style={{
                  background: active ? s.color : 'var(--light, #f4f6f9)',
                  color: active ? '#fff' : 'var(--dark, #1e2740)',
                  borderColor: active ? s.color : 'transparent',
                  boxShadow: active ? `0 8px 24px ${s.color}44` : 'none',
                }}
              >
                <span className="ds-ww__tab-emoji">{s.emoji}</span>
                {s.eyebrow}
              </button>
            )
          })}
        </div>

        {/* Panel */}
        <div className="ds-ww__panel">
          <div className="ds-ww__content">
            <span
              className="ds-ww__badge"
              style={{ background: cur.color + '18', color: cur.color }}
            >
              {cur.eyebrow}
            </span>
            <h3 className="ds-ww__title">{cur.title}</h3>
            <p className="ds-ww__short">{cur.short}</p>
            <ul className="ds-ww__bullets">
              {cur.bullets.map(b => (
                <li key={b}>
                  <span
                    className="ds-ww__check"
                    style={{ background: cur.color + '20', color: cur.color }}
                  >
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href={cur.href}
              className="ds-ww__cta"
              style={{ background: cur.color }}
            >
              Explore {cur.eyebrow} →
            </Link>
          </div>

          <div
            className="ds-ww__visual"
            style={{
              background: `linear-gradient(135deg, ${cur.color}12, ${cur.color}04)`,
              borderColor: cur.color + '22',
            }}
          >
            <ServiceVisual service={cur} />
          </div>
        </div>
      </div>

      <style>{`
        .ds-ww {
          background: #fff;
          padding: 96px 24px;
          font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
        }
        .ds-ww__inner { max-width: 1200px; margin: 0 auto; }
        .ds-ww__head { text-align: center; margin-bottom: 56px; }
        .ds-ww__eyebrow {
          display: inline-block;
          background: rgba(104,197,173,0.12); color: #4fa894;
          padding: 6px 18px; border-radius: 100px;
          font-size: .75rem; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
        }
        .ds-ww__h2 {
          font-size: clamp(1.9rem, 4vw, 2.8rem);
          font-weight: 800; color: var(--dark, #1e2740);
          line-height: 1.15; margin: 16px 0 14px; letter-spacing: -0.01em;
        }
        .ds-ww__h2-emph {
          background: linear-gradient(90deg, #68c5ad, #4a7fe5);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ds-ww__sub {
          color: var(--slate, #5d6780); font-size: 1.05rem;
          max-width: 620px; margin: 0 auto;
        }

        .ds-ww__tabs {
          display: flex; gap: 8px; margin-bottom: 32px;
          flex-wrap: wrap; justify-content: center;
        }
        .ds-ww__tab {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 20px; border-radius: 100px;
          font-family: inherit; font-weight: 600; font-size: .9rem;
          border: 2px solid; cursor: pointer;
          transition: all .2s;
        }
        .ds-ww__tab-emoji { font-size: 1.15rem; }

        .ds-ww__panel {
          display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
          background: var(--light, #f4f6f9);
          border-radius: 24px; padding: 48px;
          border: 1px solid var(--line, #e6eaf0);
          align-items: stretch;
        }
        .ds-ww__badge {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 6px 12px; border-radius: 100px;
          font-size: .75rem; font-weight: 700; letter-spacing: .08em;
          text-transform: uppercase; margin-bottom: 16px;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
        }
        .ds-ww__title {
          font-size: clamp(1.5rem, 2.5vw, 2rem); font-weight: 800;
          margin: 0 0 16px; color: var(--dark, #1e2740);
          line-height: 1.2; letter-spacing: -0.01em;
        }
        .ds-ww__short {
          font-size: 1.05rem; color: var(--slate, #5d6780);
          line-height: 1.65; margin: 0 0 28px;
        }
        .ds-ww__bullets {
          list-style: none; padding: 0; margin: 0 0 28px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .ds-ww__bullets li {
          display: flex; align-items: center; gap: 12px;
          color: var(--dark, #1e2740); font-size: .95rem; font-weight: 500;
        }
        .ds-ww__check {
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .75rem; font-weight: 800; flex-shrink: 0;
        }
        .ds-ww__cta {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; color: #fff; font-weight: 700;
          font-size: .9rem; border-radius: 100px;
          text-decoration: none; width: fit-content;
          transition: transform .15s;
        }
        .ds-ww__cta:hover { transform: translateY(-2px); }

        .ds-ww__visual {
          position: relative; min-height: 340px; border-radius: 20px;
          border: 1px solid; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
        }

        @media (max-width: 860px) {
          .ds-ww__panel { grid-template-columns: 1fr; padding: 32px; }
        }
      `}</style>
    </section>
  )
}

/* ─── Per-service visual diagrams ─── */

function ServiceVisual({ service }: { service: Service }) {
  if (service.id === 'websites') return <WebsiteMock />
  if (service.id === 'demand') return <RadarDiagram />
  if (service.id === 'content') return <ContentFeed />
  if (service.id === 'agents') return <AgentSwarm />
  return <RoadmapSteps />
}

function WebsiteMock() {
  return (
    <div style={{
      width: '85%', aspectRatio: '16/10', background: '#fff',
      borderRadius: 12, boxShadow: '0 20px 60px rgba(37,99,235,0.18)',
      overflow: 'hidden', border: '1px solid #e6eaf0',
    }}>
      <div style={{
        background: '#f4f6f9', padding: '10px 12px', display: 'flex', gap: 6,
        borderBottom: '1px solid #e6eaf0',
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        <span style={{
          marginLeft: 12, fontSize: '.7rem', color: '#888',
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        }}>yourbusiness.com</span>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ height: 12, background: '#2563EB', borderRadius: 4, width: '60%', marginBottom: 10 }} />
        <div style={{ height: 8, background: '#e6eaf0', borderRadius: 4, width: '85%', marginBottom: 6 }} />
        <div style={{ height: 8, background: '#e6eaf0', borderRadius: 4, width: '70%', marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              aspectRatio: '1', background: '#f4f6f9', borderRadius: 8,
              border: '1px solid #e6eaf0', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1.5rem',
            }}>
              {['📊', '⚡', '🎯'][i]}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RadarDiagram() {
  return (
    <div style={{ position: 'relative', width: '80%', aspectRatio: '1', maxWidth: 260 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute', inset: i * 12 + '%',
          border: '2px solid #05966944', borderRadius: '50%',
          animation: `ds-ww-radar 2.4s ${i * 0.3}s infinite ease-out`,
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: '40%',
        background: '#059669', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 40px #05966988',
      }}>
        <span style={{ color: '#fff', fontSize: '1.4rem' }}>📡</span>
      </div>
      {['Google', 'ChatGPT', 'Maps', 'Perplexity'].map((lbl, i) => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2
        const r = 42
        return (
          <div key={lbl} style={{
            position: 'absolute',
            left: `${50 + Math.cos(a) * r}%`,
            top: `${50 + Math.sin(a) * r}%`,
            transform: 'translate(-50%, -50%)',
            padding: '6px 12px', background: '#fff', borderRadius: 100,
            border: '1px solid #e6eaf0', fontSize: '.7rem', fontWeight: 700,
            color: '#059669', whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          }}>{lbl}</div>
        )
      })}
      <style>{`
        @keyframes ds-ww-radar {
          0%   { transform: scale(0.4); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function ContentFeed() {
  const items = [
    'BLOG POST — "5 Signs Your…"',
    'INSTAGRAM — Thursday 10am',
    'GBP UPDATE — New photos',
    'LINKEDIN — Case study thread',
  ]
  return (
    <div style={{ width: '85%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((txt, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', background: '#fff', borderRadius: 10,
          border: '1px solid #e6eaf0',
          animation: `ds-ww-slidein .5s ${i * 0.1}s both`,
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: '50%', background: '#DB277718',
            color: '#DB2777', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.8rem', fontWeight: 800,
          }}>{i + 1}</span>
          <span style={{
            fontSize: '.78rem',
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            color: 'var(--dark, #1e2740)', fontWeight: 600,
          }}>{txt}</span>
          <span style={{ marginLeft: 'auto', fontSize: '.7rem', color: '#059669', fontWeight: 700 }}>✓ Published</span>
        </div>
      ))}
      <style>{`
        @keyframes ds-ww-slidein {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}

function AgentSwarm() {
  return (
    <div style={{ position: 'relative', width: '80%', aspectRatio: '1', maxWidth: 260 }}>
      <div style={{
        position: 'absolute', inset: '42%',
        background: '#7C3AED', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem', color: '#fff',
        boxShadow: '0 0 40px #7C3AED88',
      }}>🧠</div>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        const r = 40
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${50 + Math.cos(a) * r}%`,
            top: `${50 + Math.sin(a) * r}%`,
            transform: 'translate(-50%, -50%)',
            width: 36, height: 36, borderRadius: '50%',
            background: '#fff', border: '2px solid #7C3AED',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.9rem', fontWeight: 800, color: '#7C3AED',
            animation: `ds-ww-agent 2s ${i * 0.2}s infinite`,
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          }}>A{i + 1}</div>
        )
      })}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 100 100">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <line key={i} x1="50" y1="50"
              x2={50 + Math.cos(a) * 40} y2={50 + Math.sin(a) * 40}
              stroke="#7C3AED" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
          )
        })}
      </svg>
      <style>{`
        @keyframes ds-ww-agent {
          0%, 100% { box-shadow: 0 0 0 0 #7C3AED44; }
          50%      { box-shadow: 0 0 0 8px transparent; }
        }
      `}</style>
    </div>
  )
}

function RoadmapSteps() {
  const steps = ['AUDIT — week 1', 'BLUEPRINT — week 2', 'DEPLOY — weeks 3-4', 'OPTIMIZE — ongoing']
  return (
    <div style={{ width: '85%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {steps.map((txt, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
          background: '#fff', borderRadius: 12, border: '1px solid #e6eaf0',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, background: '#EA580C',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.85rem', fontWeight: 800,
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          }}>0{i + 1}</span>
          <span style={{
            fontSize: '.85rem',
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            color: 'var(--dark, #1e2740)', fontWeight: 700, letterSpacing: '0.03em',
          }}>{txt}</span>
          {i < steps.length - 1 && <span style={{ marginLeft: 'auto', color: '#EA580C', fontSize: '1.2rem' }}>→</span>}
        </div>
      ))}
    </div>
  )
}
