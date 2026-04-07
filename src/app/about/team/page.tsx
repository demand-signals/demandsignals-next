import { buildMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqSchema } from '@/lib/schema'
import { PageHero } from '@/components/sections/PageHero'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

const faqs = [
  {
    question: 'How does the human + AI model deliver better results than a traditional agency?',
    answer: 'Traditional agencies staff people to do tasks that AI now executes faster, more consistently, and at a fraction of the cost. Our model directs specialized AI agents at the repetitive, high-volume work — content production, rank monitoring, review responses, data extraction — while our human strategists focus entirely on judgment, strategy, and client relationships. The result is more output, better quality, faster iteration, and lower overhead than any traditional team can match.',
  },
  {
    question: 'What oversight do humans have over AI-generated work?',
    answer: 'Every piece of work that reaches a client is reviewed by a human strategist before delivery. Our AI agents handle research, drafting, optimization, and monitoring, but a human professional ensures accuracy, brand consistency, strategic alignment, and quality on every output. We run a system of editorial checkpoints and approval queues that keep humans accountable for what goes out under your brand.',
  },
  {
    question: 'How do your AI systems stay current with algorithm changes and market shifts?',
    answer: 'Our agent systems are continuously updated as search algorithms, AI model behaviors, and market conditions shift. We monitor industry signals daily, run our own research agents to detect ranking changes, and update prompt configurations, content strategies, and technical implementations as needed. Clients on managed plans benefit from these updates automatically — you don\'t need to ask for them.',
  },
  {
    question: 'Can you scale up or down based on how much I need?',
    answer: 'Yes. Our AI infrastructure scales with your needs. Clients can start with a single service — say, AI review management — and add content, outreach, or SEO services as they see results and want to expand. Scaling up doesn\'t require hiring and onboarding new people; it means configuring more agent capacity. And scaling down is just as simple, without layoff risk or agency contract penalties.',
  },
  {
    question: 'What is it actually like to work with Demand Signals day-to-day?',
    answer: 'You have a dedicated human strategist as your primary contact — reachable by email, phone, and video call. You receive regular performance reports and can request reviews or strategy updates at any time. The AI systems work in the background; you see the outputs (content drafts for approval, performance dashboards, review response queues) through straightforward tools, not complex software. Most clients describe it as having a high-output marketing team they never have to manage.',
  },
]

export const metadata = buildMetadata({
  title:       'Our Team — The People & AI Behind Demand Signals',
  description: 'Meet the team behind Demand Signals — 30 years of web development and marketing experience, powered by AI agent systems that run 24/7.',
  path:        '/about/team',
})

const AI_AGENTS = [
  { icon: '🔍', name: 'Website Intelligence Loop', role: 'Search & AI Visibility', desc: 'Monitors rankings daily, identifies opportunities, rewrites underperforming pages, and maintains schema and llms.txt.' },
  { icon: '✍️', name: 'Content & Social Loop', role: 'Content Generation', desc: 'Writes blog posts, social media, GBP content, and review responses. Plans calendars monthly, executes daily.' },
  { icon: '⭐', name: 'Reputation Loop', role: 'Review Management', desc: 'Monitors reviews across platforms, drafts professional responses, tracks sentiment, and alerts on critical reviews.' },
]

export default function TeamPage() {
  return (
    <>
      <JsonLd data={faqSchema(faqs)} />

      <PageHero
        eyebrow="Our Team"
        title={<><span style={{color:'#52C9A0'}}>Humans + AI.</span>{' '}<span style={{color:'#FF6B2B'}}>Working Together.</span></>}
        subtitle="30 years of web development and marketing experience — amplified by AI systems that handle the repetitive work so we can focus on strategy, relationships, and results."
        callout={<>We&apos;re not a headcount business. We&apos;re an <span style={{color:'#52C9A0'}}>intelligence operation</span> — a lean human team directing purpose-built AI agents that work around the clock on your behalf.</>}
        ctaLabel="Work With Us →"
        ctaHref="/contact"
      />

      <section style={{ background: 'var(--light)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Founder */}
          <ScrollReveal direction="up">
            <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', border: '1px solid var(--border)', marginBottom: 56 }}>
              <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #52C9A0, #4fa894)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', flexShrink: 0 }}>
                  👤
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <h2 style={{ color: 'var(--dark)', fontWeight: 800, fontSize: '1.5rem', marginBottom: 4 }}>Hunter</h2>
                  <p style={{ color: 'var(--teal)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 16 }}>Managing Director</p>
                  <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem' }}>
                    30-year veteran in web development and digital marketing. Has shipped client projects across every industry — from gun ranges to law firms to MMA gyms in Thailand. Leads strategy, closes deals, and oversees every AI system Demand Signals deploys. Based in Northern California, serving clients across the USA, Thailand, Australia and beyond.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* AI Team heading */}
          <ScrollReveal direction="up" delay={0.05}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
                The AI Team
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, margin: 0 }}>
                AI Systems That Run 24/7
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.65, maxWidth: 560, margin: '16px auto 0' }}>
                Our domain loop architecture replaces traditional marketing roles with AI systems that monitor, reason, act, and improve — continuously and autonomously.
              </p>
            </div>
          </ScrollReveal>

          {/* Agent cards */}
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            {AI_AGENTS.map((agent) => (
              <StaggerItem key={agent.name}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', border: '1px solid var(--border)', height: '100%' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>{agent.icon}</div>
                  <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>{agent.name}</h3>
                  <p style={{ color: 'var(--teal)', fontSize: '0.82rem', fontWeight: 600, marginBottom: 12 }}>{agent.role}</p>
                  <p style={{ color: 'var(--slate)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{agent.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

        </div>
      </section>

      <FaqAccordion faqs={faqs} />

      <AnimatedCTA
        heading="Want to Work With Us?"
        text="Whether you need a website, an AI system, or a full demand generation overhaul — we ship fast and deliver results that compound over time."
        primaryLabel="Start the Conversation →"
        primaryHref="/contact"
        secondaryLabel="See Our Work"
        secondaryHref="/portfolio"
      />
    </>
  )
}
