import Image from 'next/image'
import { buildMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqSchema, breadcrumbSchema } from '@/lib/schema'
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
    avatar: '/tiffany_profile.jpeg',
    alt: 'Tiffany — Chief Technology Officer',
    name: 'Tiffany',
    title: 'Chief Technology Officer',
    titleColor: 'var(--teal)',
    bio1: `Tiffany is the architect behind the AI infrastructure that powers every Demand Signals engagement. She designed and built the multi-agent orchestration platform from the ground up — the system that coordinates content pipelines, voice reception agents, real-time rank monitoring loops, and autonomous outreach swarms across hundreds of client campaigns simultaneously. Her engineering background spans distributed systems at scale, machine learning operations, and the kind of full-stack AI infrastructure that most agencies outsource to three different vendors.`,
    bio2: `Before Demand Signals, Tiffany served as VP of Engineering at two venture-backed SaaS companies, where she shipped AI-native products to tens of thousands of businesses and built the engineering cultures that sustained them. She holds deep expertise in LLM orchestration, retrieval-augmented generation, vector search architectures, and production-grade prompt engineering — the kind that moves revenue, not just demo metrics. Tiffany is the reason our AI systems don\'t just work in a pitch deck — they work at 3 AM on a Tuesday when no one is watching.`,
  },
  {
    avatar: '/sarah_profile.jpeg',
    alt: 'Sarah — Chief Operating Officer',
    name: 'Sarah',
    title: 'Chief Operating Officer',
    titleColor: '#E8729A',
    bio1: `Sarah runs the machine. As COO, she owns every client engagement from signed contract to delivered results — managing delivery operations, quality assurance, and the human + AI hybrid workflows that let a lean team produce the output of an agency ten times its size. Her background spans growth marketing leadership, revenue operations, and scaling service businesses across agencies, SaaS platforms, and regional enterprises with eight-figure revenue targets.`,
    bio2: `Before Demand Signals, Sarah led operations at a top-50 US digital agency, where she built the systems that took them from 40 to 200+ managed accounts without proportional headcount growth. She brings that same operational rigor here — except now the workforce includes AI agent swarms alongside human strategists. Sarah oversees quality control on every AI-generated deliverable, manages the client success pipeline, and drives the continuous improvement cycles that keep our systems months ahead of the market. When clients say Demand Signals feels like having an unfair advantage, Sarah is the reason it actually is one.`,
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
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'About', url: 'https://demandsignals.co/about' },
        { name: 'Team', url: 'https://demandsignals.co/about/team' },
      ])} />
      <JsonLd data={faqSchema(faqs)} />
      {/* Person schema for each team member */}
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Hunter',
        jobTitle: 'Managing Director',
        worksFor: { '@type': 'Organization', name: 'Demand Signals', url: 'https://demandsignals.co' },
        description: 'Hunter built and shipped his first client website while still in high school. He leads Demand Signals from the front: setting strategy, closing deals, and overseeing every system the agency deploys. Based in Northern California, serving clients across the USA, Thailand, Australia and beyond.',
        image: 'https://demandsignals.co/hunter_profile.jpeg',
        url: 'https://demandsignals.co/about/team',
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Tiffany',
        jobTitle: 'Chief Technology Officer',
        worksFor: { '@type': 'Organization', name: 'Demand Signals', url: 'https://demandsignals.co' },
        description: 'Tiffany is the architect behind the AI infrastructure that powers every Demand Signals engagement. She designed and built the multi-agent orchestration platform from the ground up.',
        image: 'https://demandsignals.co/tiffany_profile.jpeg',
        url: 'https://demandsignals.co/about/team',
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Sarah',
        jobTitle: 'Chief Operating Officer',
        worksFor: { '@type': 'Organization', name: 'Demand Signals', url: 'https://demandsignals.co' },
        description: 'Sarah runs the machine. As COO, she owns every client engagement from signed contract to delivered results — managing delivery operations, quality assurance, and the human + AI hybrid workflows.',
        image: 'https://demandsignals.co/sarah_profile.jpeg',
        url: 'https://demandsignals.co/about/team',
      }} />

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
                  <Image src="/hunter_profile.jpeg" alt="Hunter — Managing Director" width={110} height={110} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
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
                      <Image src={person.avatar} alt={person.alt} width={110} height={110} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
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

      {/* ── Company Mascots ─────────────────────────────────────── */}
      <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
                Office Security
              </p>
              <h2 style={{ color: '#fff', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, margin: 0 }}>
                Meet Tiki & Luna
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.65, maxWidth: 620, margin: '16px auto 0' }}>
                Every great agency needs great mascots. Ours happen to be the most dedicated members of the team — on shift 24/7, never miss a meeting, and always available for moral support.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.1}>
            <div style={{ display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', maxWidth: 900, margin: '0 auto' }}>
              <div style={{ width: 280, height: 280, borderRadius: 20, overflow: 'hidden', flexShrink: 0, border: '3px solid rgba(82,201,160,0.25)' }}>
                <Image src="/tiki_luna_profile.jpeg" alt="Tiki and Luna — Demand Signals company mascots" width={280} height={280} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ marginBottom: 28 }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', marginBottom: 6 }}>
                    Tiki <span style={{ color: 'var(--teal)', fontSize: '0.85rem', fontWeight: 500 }}>— The Belly With Fur</span>
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
                    Husky. Heterochromatic. Horizontally gifted. Tiki is our Chief Morale Officer — the first to greet every visitor, the loudest voice in every Zoom call, and the undisputed champion of strategic napping. His approach to work mirrors our own: go hard, rest hard, repeat. If you&apos;re on a video call with us, expect a cameo.
                  </p>
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', marginBottom: 6 }}>
                    Luna <span style={{ color: '#E8729A', fontSize: '0.85rem', fontWeight: 500 }}>— The Cuddly Queen</span>
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
                    Dark, elegant, and quietly running the entire operation from behind the scenes. Luna is our VP of Vibes — she keeps the energy calm, the laps warm, and the office atmosphere impeccable. Where Tiki brings the chaos, Luna brings the composure. Together, they&apos;re the heart and soul of Demand Signals HQ.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
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
