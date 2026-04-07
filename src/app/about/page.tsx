import { buildMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqSchema, breadcrumbSchema } from '@/lib/schema'
import { PageHero } from '@/components/sections/PageHero'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { AnimatedCTA } from '@/components/sections/AnimatedCTA'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

const faqs = [
  {
    question: 'How will working with Demand Signals actually change my business results?',
    answer: 'Clients typically see three things improve simultaneously: search visibility (ranking in Google, AI assistants, and local maps), lead volume (more qualified inbound inquiries), and operational efficiency (less time spent on marketing tasks that AI now handles). The combination compounds over time — better visibility brings more leads, better content builds more authority, and better reputation attracts higher-quality clients. Most clients see measurable movement within 60–90 days and significant business impact within six months.',
  },
  {
    question: 'How quickly can I expect to see a return on investment?',
    answer: 'It depends on the services engaged, but most clients break even within the first two to three months when compared to what they were previously spending on traditional agency retainers or in-house staff. AI systems that replace manual tasks — content writing, review responses, lead research — deliver immediate cost savings. Revenue impact from SEO and demand generation typically builds over 60–180 days as rankings and visibility compound.',
  },
  {
    question: 'What makes AI-powered demand generation different from hiring a marketing team?',
    answer: 'A marketing hire works business hours, handles one task at a time, takes vacations, and costs $50,000–$80,000 per year in salary and benefits. Our AI systems monitor your search presence daily, publish content on schedule, respond to reviews within minutes, and analyze your competitors continuously — all for a fraction of that cost. A dedicated human strategist oversees everything and handles the judgment calls that require real experience. You get enterprise-level output without enterprise-level headcount.',
  },
  {
    question: 'Do you work with businesses that already have a marketing strategy in place?',
    answer: 'Yes — and we often work alongside existing teams. We can plug into your current content workflow, amplify your SEO strategy with AI-generated supporting content, add AI search optimization on top of your existing site, or automate specific functions like review management without disrupting what\'s already working. A free intelligence report helps us identify exactly where the gaps are before recommending anything.',
  },
  {
    question: 'What does getting started with Demand Signals look like?',
    answer: 'It starts with a free 30-minute strategy call where we learn about your business, goals, and current marketing situation. From there, we run a free intelligence report that analyzes your search presence, competitor landscape, and top opportunities. You get a clear picture of where you stand and what the highest-ROI moves are — with no obligation. Most clients are ready to move forward within a week of seeing their report.',
  },
]

export const metadata = buildMetadata({
  title:       'About Demand Signals',
  description: "We're an AI-first demand generation agency based in Northern California — built to help local and regional businesses compete at a national level using automation, AI agents, and real market data.",
  path:        '/about',
})

const VALUE_CARDS = [
  {
    icon: '🤖',
    title: 'AI-First by Design',
    body: 'We don\'t bolt AI onto old methods. Every system we build starts with intelligence — AI agents that research, write, optimize, and report so your business moves faster than your competitors.',
  },
  {
    icon: '📍',
    title: 'Northern California Roots',
    body: 'Based in the Sierra Nevada foothills, we serve clients across the US, Thailand, Australia and beyond. We know local markets and understand what it takes for regional businesses to punch above their weight.',
  },
  {
    icon: '📊',
    title: 'Data Before Dollars',
    body: 'We believe you should know where you stand before you spend anything. That\'s why we offer free intelligence reports — so every engagement starts with real insight, not guesswork.',
  },
]

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'About', url: 'https://demandsignals.co/about' },
      ])} />
      <JsonLd data={faqSchema(faqs)} />

      <PageHero
        eyebrow="Who We Are"
        title={<>About <span style={{color:'#52C9A0'}}>Demand Signals</span> — <span style={{color:'#FF6B2B'}}>AI-First. Always On.</span></>}
        subtitle="We're an AI-first demand generation agency based in Northern California — built to help local and regional businesses compete at a national level using automation, AI agents, and real market data."
        callout={<>We replace marketing employees and agency retainers with <span style={{color:'#52C9A0'}}>AI systems that run 24/7</span> — so you get enterprise-grade output at small business pricing, without managing a team.</>}
        ctaLabel="See What We Do →"
        ctaHref="/contact"
      />

      {/* Value Cards */}
      <section style={{ background: 'var(--light)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28, marginBottom: 56 }}>
            {VALUE_CARDS.map((card) => (
              <StaggerItem key={card.title}>
                <div style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: '32px 28px',
                  height: '100%',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 14 }}>{card.icon}</div>
                  <h2 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{card.title}</h2>
                  <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>{card.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <ScrollReveal direction="up" delay={0.1}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 44px' }}>
              <h2 style={{ color: 'var(--dark)', fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>
                Our Agents Are Our Team
              </h2>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 16 }}>
                Demand Signals runs on a hybrid model — a lean human team directing a farm of specialized AI agents. Research agents. Content agents. SEO agents. Voice agents. Workflow automation agents. Each one is purpose-built and fine-tuned for a specific task.
              </p>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 16 }}>
                This architecture lets us deliver enterprise-grade output at small business pricing. We&apos;re not a traditional agency with junior copywriters billing hours — we&apos;re an intelligence operation that runs 24/7.
              </p>
              <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
                Every engagement gets a dedicated human strategist who oversees the agents, reviews outputs, and ensures everything we deliver actually moves the needle for your business.
              </p>
            </div>
          </ScrollReveal>

        </div>
      </section>

      <FaqAccordion faqs={faqs} />

      <AnimatedCTA
        heading="Ready to See What We Can Do?"
        text="Start with a free intelligence report or book a 30-minute strategy call. No pitch, no pressure — just a clear picture of your biggest opportunities."
        primaryLabel="Get a Free Report →"
        primaryHref="/tools/research-reports"
        secondaryLabel="Contact Us"
        secondaryHref="/contact"
      />
    </>
  )
}
