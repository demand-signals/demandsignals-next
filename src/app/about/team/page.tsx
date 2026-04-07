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

const LEADERSHIP = [
  {
    avatar: '/tiffany-avatar.svg',
    alt: 'Tiffany — Chief Technology Officer',
    name: 'Tiffany',
    title: 'Chief Technology Officer',
    titleColor: 'var(--teal)',
    bio1: `Tiffany architects the intelligence layer that powers everything Demand Signals delivers. With a background spanning enterprise software engineering, machine learning infrastructure, and distributed systems, she designed and built the multi-agent orchestration platform that sits at the core of every client engagement — from content pipelines to voice reception systems to real-time rank monitoring loops.`,
    bio2: `Before joining Demand Signals, Tiffany led engineering teams at two Series B SaaS companies, shipping AI-native products used by thousands of businesses globally. She holds deep expertise in LLM fine-tuning, retrieval-augmented generation, and the kind of prompt engineering that actually moves metrics. When she\'s not building agent swarms, she\'s usually mentoring engineers or breaking things intentionally to find out what breaks first.`,
  },
  {
    avatar: '/sarah-avatar.svg',
    alt: 'Sarah — Chief Operating Officer',
    name: 'Sarah',
    title: 'Chief Operating Officer',
    titleColor: '#FF6B2B',
    bio1: `Sarah is the operational force behind Demand Signals — the one who makes sure that what gets promised actually gets delivered, every time, at scale. She manages client success, delivery operations, and the internal systems that keep the agency running at a pace most traditional firms can\'t match. Her background spans growth marketing, project operations, and revenue strategy across agencies, SaaS, and regional enterprise.`,
    bio2: `Sarah built her career turning high-potential teams into high-output machines — and at Demand Signals, that means doing the same with human + AI hybrid workflows. She owns the client relationship lifecycle, oversees quality control on all AI-generated outputs before they go to clients, and drives the continuous improvement process that keeps the agency ahead of both competitors and algorithm shifts. Clients consistently describe Sarah as the reason they stay.`,
  },
]

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
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* Founder */}
          <ScrollReveal direction="up">
            <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', border: '1px solid var(--border)', marginBottom: 56 }}>
              <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 110, height: 110, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '3px solid rgba(82,201,160,0.3)' }}>
                  <img src="/hunter-avatar.jpg" alt="Hunter — Managing Director" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <h2 style={{ color: 'var(--dark)', fontWeight: 800, fontSize: '1.5rem', marginBottom: 4 }}>Hunter</h2>
                  <p style={{ color: 'var(--teal)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 16 }}>Managing Director</p>
                  <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 14 }}>
                    Hunter built and shipped his first client website while still in high school — and hasn&apos;t stopped shipping since. He leads Demand Signals from the front: setting strategy, closing deals, and overseeing every system the agency deploys. Based in Northern California, serving clients across the USA, Thailand, Australia and beyond.
                  </p>
                  <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem' }}>
                    Behind him is a team of talented human strategists, developers, and creatives — each one empowered by enterprise-grade AI infrastructure and swarms of specialized agents. It&apos;s the combination that makes the difference: real human judgment at the top, AI doing the heavy lifting below, and enterprise-grade systems tying it all together.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Leadership team */}
          <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 56 }}>
            {LEADERSHIP.map((person) => (
              <StaggerItem key={person.name}>
                <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ width: 110, height: 110, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '3px solid rgba(82,201,160,0.3)' }}>
                      <img src={person.avatar} alt={person.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <h2 style={{ color: 'var(--dark)', fontWeight: 800, fontSize: '1.5rem', marginBottom: 4 }}>{person.name}</h2>
                      <p style={{ color: person.titleColor, fontWeight: 600, fontSize: '0.9rem', marginBottom: 16 }}>{person.title}</p>
                      <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 14 }}>{person.bio1}</p>
                      <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem' }}>{person.bio2}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* AI Team heading */}
          <ScrollReveal direction="up" delay={0.05}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
                The Infrastructure
              </p>
              <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, margin: 0 }}>
                Human Talent. AI Firepower. Enterprise Infrastructure.
              </h2>
              <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.65, maxWidth: 620, margin: '16px auto 0' }}>
                Every person on our team operates with AI agent swarms and enterprise-grade systems at their fingertips — multiplying their output, eliminating the repetitive work, and letting them focus entirely on what moves the needle for clients.
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
