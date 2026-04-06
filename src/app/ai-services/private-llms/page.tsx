import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'Private LLMs — Self-Hosted AI for Sensitive Data | Demand Signals',
  description: 'Self-hosted language models for businesses with sensitive data. Keep proprietary information off third-party servers while leveraging AI capabilities.',
  path:        '/ai-services/private-llms',
  keywords:    ['private LLM', 'self-hosted AI', 'on-premise LLM', 'enterprise AI', 'data sovereignty AI'],
})

export default function Page() {
  return (
    <>
    <ServicePageTemplate
      eyebrow="Private LLMs"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Private LLMs</span><br /><span style={{color:'#52C9A0'}}>Your Data Stays Yours.</span></>}
      subtitle="Self-hosted language models for businesses with sensitive data. Full AI capabilities without sending proprietary information to third-party servers."
      ctaLabel="Explore Private LLMs →"
      calloutHtml={<>Demand Signals deploys <span style={{color:'#52C9A0'}}>private, self-hosted language models</span> for businesses where data sovereignty is non-negotiable — because 61% of enterprises cite data privacy as their top barrier to AI adoption, and fine-tuned private models can match frontier model performance on domain-specific tasks.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'AI & Agent Services', path: '/ai-services' },
        { name: 'Private LLM Deployment', path: '/ai-services/private-llms' },
      ]}
      schemaName="Private LLM Deployment"
      schemaDescription="Self-hosted language model deployment for data-sensitive businesses."
      schemaUrl="/ai-services/private-llms"
      featuresHeading="AI Without the Data Risk"
      features={[
        { icon: '🔒', title: 'Data Sovereignty', description: 'Your data never leaves your infrastructure. No third-party API calls for sensitive operations. Complete control over where your information lives.' },
        { icon: '🏗️', title: 'On-Premise Deployment', description: 'Self-hosted models running on your infrastructure or private cloud. We handle setup, configuration, and optimization.' },
        { icon: '🧠', title: 'Custom Fine-Tuning', description: 'Models fine-tuned on your business data — terminology, processes, products, and domain knowledge. Better results than generic models.' },
        { icon: '⚡', title: 'Low-Latency Inference', description: 'On-premise models respond faster than API calls to external services. Critical for real-time applications and high-volume processing.' },
        { icon: '🔄', title: 'Hybrid Architecture', description: 'Use private LLMs for sensitive data and public APIs for non-sensitive tasks. The best of both worlds — security where it matters, capability everywhere else.' },
        { icon: '📊', title: 'Usage Monitoring', description: 'Full visibility into model usage, performance, costs, and accuracy. No surprise API bills. Predictable, fixed infrastructure costs.' },
      ]}
      aiCalloutHeading="The businesses that need this already know they need it."
      aiCalloutText="If you're in legal, healthcare, finance, or government — or if you handle proprietary client data — you probably can't send that data to ChatGPT or Claude's API. Private LLMs give you the same AI capabilities without the data risk. We deploy, configure, and maintain the infrastructure."
      faqs={[
        { question: 'Which models can you deploy privately?', answer: 'We deploy open-source models like Llama, Mistral, and Phi on your infrastructure. Model selection depends on your use case, hardware, and performance requirements. We recommend the right model during the consultation.' },
        { question: 'What hardware do I need?', answer: 'It depends on the model size and throughput requirements. Small models run on a single GPU server. Larger models may need multi-GPU setups. We can also deploy on private cloud infrastructure (AWS, GCP, Azure) with dedicated instances.' },
        { question: 'How do private LLMs compare to ChatGPT or Claude?', answer: 'For general knowledge tasks, frontier models like Claude and GPT-4 are more capable. For domain-specific tasks with fine-tuning, private models can match or exceed frontier model performance on your specific use case — while keeping data completely private.' },
        { question: 'What does ongoing maintenance of a private LLM look like?', answer: 'We handle model updates, security patches, performance monitoring, and fine-tuning refreshes as part of our managed service. When new open-source model versions release with better performance, we benchmark them against your current deployment and recommend upgrades when the improvement justifies the migration. Infrastructure costs are fixed and predictable — no per-token API billing surprises.' },
        { question: 'Can a private LLM be fine-tuned on my company\'s proprietary data?', answer: 'Absolutely — that is one of the primary advantages. We fine-tune models on your internal documents, customer interactions, product catalogs, and domain terminology so the model understands your business at a level no generic API can match. Fine-tuning typically requires a curated dataset of 500-5,000 examples, which we help you prepare during the onboarding process. The result is a model that speaks your language and understands your industry nuances.' },
      ]}
      ctaHeading="Need AI That Keeps Your Data Private?"
      ctaText="We'll assess your data sensitivity requirements and recommend the right private LLM architecture."
      ctaPrimaryLabel="Assess My Requirements →"
      ctaPrimaryHref="/contact"
      serviceCategory="ai-services"
    />
      {/* Proof Section */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Data Privacy
          </span>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
            Data Stays Home
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
            Frontier AI capabilities without sending data to third parties. Private LLMs solve the biggest barrier to enterprise AI adoption.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { value: '61%', label: 'Cite Privacy as Top Barrier' },
              { value: 'Llama', label: 'Mistral / Phi Models' },
              { value: 'On-Prem', label: 'Or Private Cloud' },
              { value: 'Zero', label: 'Data Leaves Your Network' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '28px 16px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#68c5ad', marginBottom: 8 }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
