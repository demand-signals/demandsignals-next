import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'
import Link from 'next/link'

export const metadata = buildMetadata({
  title:       'Private LLMs — Self-Hosted AI for Sensitive Data | Demand Signals',
  description: 'Self-hosted language models for businesses with sensitive data. Keep proprietary information off third-party servers while leveraging AI capabilities.',
  path:        '/ai-services/private-llms',
  keywords:    ['private LLM', 'self-hosted AI', 'on-premise LLM', 'enterprise AI', 'data sovereignty AI'],
})

const featuredArticle = (
  <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 999, background: 'rgba(242,133,0,0.12)', color: 'var(--orange)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
        Critical — Attorney-Client Privilege &amp; AI
      </div>
      <h2 style={{ color: '#fff', fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, lineHeight: 1.25, marginBottom: 16 }}>
        A Federal Court Just Ruled Your AI Conversations Are Discoverable
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 20 }}>
        In <em>United States v. Heppner</em> (SDNY, February 2026), Judge Rakoff held that <strong style={{ color: '#fff' }}>documents generated using a public AI tool are not protected by attorney-client privilege</strong>. The court found that Anthropic&apos;s privacy policy — which permits data collection, model training, and disclosure to governmental authorities — destroyed any reasonable expectation of confidentiality. Privilege was waived the moment the data entered the platform.
      </p>
      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 20 }}>
        This ruling doesn&apos;t just apply to consumer chatbots. <strong style={{ color: '#FF6B2B' }}>Most &ldquo;legal AI&rdquo; SaaS platforms are API wrappers around the same public models.</strong> Your case facts travel from the vendor to OpenAI, Anthropic, or Google&apos;s servers — where the provider&apos;s terms govern. Under Heppner, that&apos;s a third-party disclosure. Privilege is gone. And that is a malpractice attack surface.
      </p>
      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 32 }}>
        <strong style={{ color: 'var(--teal)' }}>On-premise private LLMs are the only architecture where privilege is inarguable.</strong> No third-party terms of service. No API calls to subpoena. No data leaving your firm&apos;s network. We deploy complete systems — hardware, model, document onboarding, internal agents, and secure networking — for solo practitioners starting at <strong style={{ color: '#fff' }}>$8,500</strong> and small firms from <strong style={{ color: '#fff' }}>$25,000</strong>.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/blog/heppner-attorney-client-privilege-ai-malpractice" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 8, background: '#FF6B2B', color: '#fff', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}>
          Read the Full Heppner Analysis →
        </Link>
        <Link href="/contact" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 8, background: 'transparent', color: 'var(--teal)', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', border: '2px solid var(--teal)' }}>
          Assess My Firm&apos;s Exposure →
        </Link>
      </div>
    </div>
  </section>
)

export default function Page() {
  return (
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
      featuresHeading="Full AI Capability — Your Sensitive Data Never Leaves Your Network"
      features={[
        { icon: '🔒', title: 'Data Sovereignty', description: 'Your data never leaves your infrastructure. No third-party API calls for sensitive operations. Complete control over where your information lives.' },
        { icon: '🏗️', title: 'On-Premise Deployment', description: 'Self-hosted models running on your infrastructure or private cloud. We handle setup, configuration, and optimization.' },
        { icon: '🧠', title: 'Custom Fine-Tuning', description: 'Models fine-tuned on your business data — terminology, processes, products, and domain knowledge. Better results than generic models.' },
        { icon: '⚡', title: 'Low-Latency Inference', description: 'On-premise models respond faster than API calls to external services. Critical for real-time applications and high-volume processing.' },
        { icon: '🔄', title: 'Hybrid Architecture', description: 'Use private LLMs for sensitive data and public APIs for non-sensitive tasks. The best of both worlds — security where it matters, capability everywhere else.' },
        { icon: '📊', title: 'Usage Monitoring', description: 'Full visibility into model usage, performance, costs, and accuracy. No surprise API bills. Predictable, fixed infrastructure costs.' },
      ]}
      techStack={[
        { label: 'Models', value: 'Llama 3, Mistral, Phi (open-source)' },
        { label: 'Deployment', value: 'On-premise or private cloud (AWS/GCP/Azure)' },
        { label: 'Fine-tuning', value: 'Custom dataset training + RLHF' },
        { label: 'Inference', value: 'Ollama, vLLM, or custom serving layer' },
        { label: 'Monitoring', value: 'Usage tracking + performance dashboards' },
        { label: 'Security', value: 'Air-gapped or VPN-isolated networks' },
      ]}
      techDescription="Private LLMs run on your infrastructure — on-premise hardware or a dedicated private cloud instance. We handle model selection, deployment, fine-tuning, and ongoing maintenance. Your data never leaves your network."
      proofSection={featuredArticle}
      stats={[
        { value: 61, suffix: '%', label: 'Cite Privacy as Top AI Barrier' },
        { value: 3, label: 'Open-Source Model Families' },
        { value: 100, suffix: '%', label: 'Data Stays On Your Network' },
        { value: 5000, label: 'Max Fine-Tuning Examples Needed' },
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
  )
}
