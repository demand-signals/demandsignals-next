'use client'

import Link from 'next/link'
import { BOOKING_URL } from '@/lib/constants'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

const agentTypes = [
  { icon: '✍️', label: 'Content Agents', count: '40+' },
  { icon: '📊', label: 'SEO & Analytics', count: '25+' },
  { icon: '📣', label: 'Social & Outreach', count: '30+' },
  { icon: '⭐', label: 'Review & Reputation', count: '15+' },
  { icon: '🔍', label: 'Research & Intel', count: '20+' },
  { icon: '⚙️', label: 'Ops & Automation', count: '35+' },
]

export default function ReplacesGrid() {
  return (
    <section
      style={{
        background: 'var(--dark)',
        padding: '96px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header with FUD hook */}
        <ScrollReveal direction="up">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ display: 'inline-block', background: 'rgba(255,107,43,0.15)', color: '#FF6B2B', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              The Window Is Closing
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '14px 0 20px' }}>
              We Deliver More Results in Less Time with Smaller Budgets.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 900, margin: '0 auto 16px' }}>
              Right now, <span style={{ color: '#FF6B2B', fontWeight: 700 }}>95% of corporate AI projects are failing</span>. Fortune 500 companies are firing thousands of humans only to burn millions on AI replacements that never ship. Their committees are still debating frameworks while their budgets evaporate.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 900, margin: '0 auto' }}>
              This is your window, the opportunity is now. While the giants stumble, you can deploy AI agents that actually work — this month, not next year. But they won&apos;t fail forever. Move now. The Human and AI Teams at Demand Signals are the pilots that keep your operations flying higher and faster than ever before — generating more results with less investment.
            </p>
          </div>
        </ScrollReveal>

        {/* Agent warehouse section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(104,197,173,0.08) 0%, rgba(255,107,43,0.06) 100%)',
          border: '1px solid rgba(104,197,173,0.15)',
          borderRadius: 20,
          padding: '48px 40px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            {/* Left — copy */}
            <div>
              <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.15)', color: '#68c5ad', padding: '5px 14px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                Agent Warehouse
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>
                Hundreds of Agent Types. Ready to Deploy.
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 16 }}>
                We don&apos;t build agents from scratch for every client. We maintain a warehouse of battle-tested agent types — content writers, SEO monitors, review responders, outreach runners, data analysts, and dozens more. Each one has been deployed, tuned, and proven across real businesses.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 24 }}>
                <strong style={{ color: '#fff' }}>Our process:</strong> Audit your operations → select the right agents → configure for your brand, market, and systems → deploy → monitor and optimize. Most clients are fully operational within 2-4 weeks.
              </p>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#FF6B2B',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '12px 24px',
                  borderRadius: 100,
                  textDecoration: 'none',
                }}
              >
                See Which Agents Fit Your Business →
              </a>
            </div>

            {/* Right — agent type grid */}
            <StaggerContainer style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {agentTypes.map(a => (
                <StaggerItem key={a.label} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '18px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{a.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--teal)', fontWeight: 600 }}>{a.count} agents</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>

        {/* Infrastructure section */}
        <ScrollReveal direction="up" delay={0.1}>
        <div style={{
          marginTop: 32,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '40px 36px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
            {/* Left — cloud */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '1.4rem' }}>☁️</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Cloud-Hosted Agents</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', lineHeight: 1.7, margin: '0 0 14px' }}>
                Most businesses start here. Your AI agents run on enterprise cloud infrastructure — Vercel edge functions, Supabase databases, and orchestration layers like n8n and custom Node.js pipelines. No servers to manage, no DevOps to hire. We handle the entire stack: API keys, model routing, vector databases, cron jobs, and monitoring dashboards.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Vercel Edge', 'Supabase', 'Claude API', 'GPT-4o', 'n8n', 'PostgreSQL', 'Redis', 'Cloudflare Workers'].map(t => (
                  <span key={t} style={{ background: 'rgba(104,197,173,0.1)', color: 'var(--teal)', fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 100 }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Right — on-premise */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '1.4rem' }}>🏢</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>On-Premise &amp; Private LLMs</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', lineHeight: 1.7, margin: '0 0 14px' }}>
                Sensitive data stays in your building. We deploy self-hosted language models — Llama 3, Mistral, Phi — running on your own hardware or private cloud. Your data never leaves your network. Same agent capabilities, same orchestration, same results — just inside your firewall. We handle the GPU provisioning, model quantization, and inference optimization so it runs fast on hardware you can actually afford.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['Llama 3', 'Mistral', 'Phi-3', 'Ollama', 'vLLM', 'Docker', 'NVIDIA CUDA', 'Private VPC'].map(t => (
                  <span key={t} style={{ background: 'rgba(255,107,43,0.1)', color: '#FF6B2B', fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 100 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: 700, margin: '0 auto' }}>
              The tech stack is complex — model selection, vector embeddings, RAG pipelines, fine-tuning, API orchestration, edge deployment, GPU allocation. <strong style={{ color: 'rgba(255,255,255,0.7)' }}>You don&apos;t need to understand any of it.</strong> That&apos;s our job. You just see the results in your dashboard.
            </p>
          </div>
        </div>
        </ScrollReveal>

      </div>

      <style>{`
        @media (max-width: 768px) {
          .agent-warehouse-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
