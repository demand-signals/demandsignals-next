import { buildMetadata } from '@/lib/metadata';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqSchema } from '@/lib/schema';

const faqs = [
  {
    question: 'What does Demand Signals do?',
    answer: 'Demand Signals is an AI-first demand generation agency that replaces traditional marketing employees and agency retainers with AI-powered systems. We build AI-optimized websites, generate content automatically, manage online reputation, run social media, and handle business operations — all driven by specialized AI agents supervised by human strategists. The result is enterprise-grade marketing output at small business pricing.',
  },
  {
    question: 'Where is Demand Signals based and who do you serve?',
    answer: 'We are based in the Sierra Nevada foothills of Northern California and serve clients across the United States, Thailand, Australia, and beyond. While we have deep expertise in local and regional markets, our AI-powered systems work for businesses of any size in any geography. We specialize in helping local businesses compete at a national level through automation and real market data.',
  },
  {
    question: 'How does Demand Signals use AI differently from other agencies?',
    answer: 'Most agencies bolt AI onto existing manual processes. We built every system from the ground up with AI at the core. Our architecture uses specialized AI agent loops — research agents, content agents, SEO agents, reputation agents, and voice agents — each purpose-built for a specific task and running 24/7. A human strategist oversees every engagement to ensure quality, but the heavy lifting is done by agents that never sleep.',
  },
  {
    question: 'Do I need to understand AI to work with Demand Signals?',
    answer: 'Not at all. You approve — AI does the rest. We handle all the technical complexity behind the scenes. Every engagement includes a dedicated human strategist who translates your business goals into system configurations, reviews AI outputs, and ensures everything we deliver moves the needle. You interact with us the same way you would any agency, but the speed and consistency of delivery is dramatically higher.',
  },
  {
    question: 'What industries does Demand Signals work with?',
    answer: 'We work across a wide range of industries including medical and dental practices, law firms, contractors, real estate, fitness studios, restaurants, retail, automotive, and professional services. Our AI systems are industry-agnostic by design — they analyze your specific market, competitors, and customer behavior to build strategies tailored to your category and geography rather than using one-size-fits-all templates.',
  },
];

export const metadata = buildMetadata({
  title:       'About Demand Signals',
  description: "We're an AI-first demand generation agency based in Northern California — built to help local and regional businesses compete at a national level using automation, AI agents, and real market data.",
  path:        '/about',
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 14 }}>
            Who We Are
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            About <span style={{color:'#52C9A0'}}>Demand Signals</span> — <span style={{color:'#FF6B2B'}}>AI-First. Always On.</span>
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
            We're an AI-first demand generation agency based in Northern California — built to help local and regional businesses compete at a national level using automation, AI agents, and real market data.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28, marginBottom: 56 }}>
            {[
              {
                icon: '🤖',
                title: 'AI-First by Design',
                body: 'We don\'t bolt AI onto old methods. Every system we build starts with intelligence — AI agents that research, write, optimize, and report so your business moves faster than your competitors.',
              },
              {
                icon: '📍',
                title: 'Northern California Roots',
                body: 'Based in the Sierra Nevada foothills, we serve clients across the US and Australia. We know local markets and understand what it takes for regional businesses to punch above their weight.',
              },
              {
                icon: '📊',
                title: 'Data Before Dollars',
                body: 'We believe you should know where you stand before you spend anything. That\'s why we offer free intelligence reports — so every engagement starts with real insight, not guesswork.',
              },
            ].map((card) => (
              <div key={card.title} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '32px 28px',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{card.icon}</div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>{card.title}</h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>{card.body}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 44px' }}>
            <h2 style={{ color: 'var(--dark)', fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>
              Our Agents Are Our Team
            </h2>
            <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 16 }}>
              Demand Signals runs on a hybrid model — a lean human team directing a farm of specialized AI agents. Research agents. Content agents. SEO agents. Voice agents. Workflow automation agents. Each one is purpose-built and fine-tuned for a specific task.
            </p>
            <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', marginBottom: 16 }}>
              This architecture lets us deliver enterprise-grade output at small business pricing. We're not a traditional agency with junior copywriters billing hours — we're an intelligence operation that runs 24/7.
            </p>
            <p style={{ color: 'var(--slate)', lineHeight: 1.75, fontSize: '1rem', margin: 0 }}>
              Every engagement gets a dedicated human strategist who oversees the agents, reviews outputs, and ensures everything we deliver actually moves the needle for your business.
            </p>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: 'var(--teal)', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>FAQ</span>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 0' }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {faqs.map(faq => (
              <div key={faq.question} style={{ background: 'var(--light)', borderRadius: 14, padding: '24px 28px' }}>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '1rem', marginBottom: 10, lineHeight: 1.4 }}>{faq.question}</h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.93rem', lineHeight: 1.7, margin: 0 }}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, marginBottom: 16 }}>
            Ready to See What We Can Do?
          </h2>
          <p style={{ color: '#a0aec0', lineHeight: 1.65, marginBottom: 28 }}>
            Start with a free intelligence report or book a 30-minute strategy call.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/tools/research-reports" style={{
              background: '#FF6B2B',
              color: '#fff',
              fontWeight: 700,
              padding: '13px 28px',
              borderRadius: 100,
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}>
              Get a Free Report →
            </a>
            <a href="/contact" style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 600,
              padding: '13px 28px',
              borderRadius: 100,
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.5)',
              fontSize: '0.95rem',
            }}>
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
