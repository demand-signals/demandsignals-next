import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'Agent & App Hosting — Managed Infrastructure | Demand Signals',
  description: 'Managed hosting on Vercel, Cloudflare, and DSIG. Zero-config deployments, edge CDN, SSL, monitoring, and 99.99% uptime for every site and app we build.',
  path:        '/websites-apps/hosting',
  keywords:    ['managed hosting', 'Vercel hosting', 'Cloudflare CDN', 'app hosting', 'managed infrastructure', 'web hosting Northern California'],
})

export default function HostingPage() {
  return (
    <ServicePageTemplate
      eyebrow="Agent & App Hosting"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Managed Infrastructure</span><br /><span style={{color:'#52C9A0'}}>Zero DevOps Required.</span></>}
      subtitle="Enterprise-grade hosting on Vercel, Cloudflare, and DSIG. Automated deployments, edge CDN, SSL, and monitoring — you never think about servers."
      ctaLabel="Get Hosted →"
      calloutHtml={<>Demand Signals hosts every site on <span style={{color:'#52C9A0'}}>enterprise-grade infrastructure</span> — Vercel&apos;s edge network delivers sub-100ms load times from 100+ global locations, and our 99.99% uptime SLA means less than 53 minutes of downtime per year.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Websites & Apps', path: '/websites-apps' },
        { name: 'Agent & App Hosting', path: '/websites-apps/hosting' },
      ]}
      schemaName="Managed Hosting & Infrastructure"
      schemaDescription="Enterprise-grade managed hosting on Vercel, Cloudflare, and DSIG with automated deployments and monitoring."
      schemaUrl="/websites-apps/hosting"
      featuresHeading="Infrastructure That Just Works"
      features={[
        { icon: '🌍', title: 'Edge CDN Deployment', description: 'Your site served from 100+ edge locations worldwide via Vercel and Cloudflare. Sub-100ms load times regardless of where your visitors are.' },
        { icon: '🔒', title: 'SSL & Security', description: 'Automatic SSL certificates, DDoS protection, WAF rules, and malware scanning. Security isn\'t an add-on — it\'s included in every deployment.' },
        { icon: '🚀', title: 'Zero-Config Deployments', description: 'Push code to GitHub and your site deploys automatically. Preview deployments for every branch. Rollback to any previous version in seconds.' },
        { icon: '📊', title: 'Monitoring & Alerts', description: 'Uptime monitoring, error tracking, and performance analytics. We catch issues before your customers do and fix them proactively.' },
        { icon: '💾', title: 'Daily Backups', description: 'Automated daily backups for databases and content. Point-in-time recovery for Supabase databases. You never lose data.' },
        { icon: '⚡', title: 'Performance Optimization', description: 'Image optimization, code splitting, lazy loading, and caching strategies tailored to your application. Fast pages rank better and convert more.' },
      ]}
      techStack={[
        { label: 'Next.js Hosting', value: 'Vercel Pro (edge functions, ISR, streaming)' },
        { label: 'WordPress Hosting', value: 'DSIG Managed WordPress' },
        { label: 'CDN / DNS', value: 'Cloudflare (all domains)' },
        { label: 'Database', value: 'Supabase Pro (PostgreSQL, daily backups)' },
        { label: 'SSL', value: 'Automatic via Cloudflare + Vercel' },
        { label: 'Monitoring', value: 'Pipeline monitoring + Telegram alerts' },
        { label: 'Uptime', value: '99.99% SLA' },
      ]}
      techDescription="We use the same infrastructure that powers Fortune 500 companies — Vercel, Cloudflare, Supabase — at a fraction of the cost. Enterprise-grade reliability without enterprise-grade pricing."
      faqs={[
        { question: 'Is hosting included in your management packages?', answer: 'Yes. Hosting is included in every monthly management package. You don\'t pay separately for servers, CDN, SSL, or monitoring. One monthly fee covers everything.' },
        { question: 'Can you host sites and apps you didn\'t build?', answer: 'Yes, if they run on compatible technology (Next.js, React, WordPress, Node.js). We\'ll evaluate your existing project and migrate it to our infrastructure if it makes sense. Some legacy applications may require refactoring.' },
        { question: 'What happens if my site goes down?', answer: 'Our monitoring systems detect downtime within 60 seconds and alert our team immediately. Most issues are resolved within minutes due to automated rollback capabilities. Vercel and Cloudflare provide built-in redundancy and failover.' },
        { question: 'Can I move my site away from your hosting later?', answer: 'Yes. Everything we build uses open-source technology and standard deployment practices. There\'s no vendor lock-in. Your code, your data, your domain — all portable.' },
      ]}
      ctaHeading="Ready for Hosting That You Never Think About?"
      ctaText="We handle the infrastructure so you can focus on your business. No servers to manage, no SSL to renew, no uptime to worry about."
      ctaPrimaryLabel="Get Started →"
      serviceCategory="websites-apps"
      proofSection={
        <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(104,197,173,0.12)', color: '#68c5ad', padding: '6px 18px', borderRadius: 100, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Infrastructure Stats
                  </span>
                  <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 16px' }}>
                    Infrastructure That Performs
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>
                    Enterprise infrastructure without enterprise complexity. Vercel, Cloudflare, and Supabase deliver world-class performance at startup pricing.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {[
                      { value: '99.99%', label: 'Uptime Guarantee' },
                      { value: '<100ms', label: 'Global Latency' },
                      { value: '300+', label: 'Edge Locations' },
                      { value: '0 Config', label: 'Deploy Complexity' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '28px 16px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#68c5ad', marginBottom: 8 }}>{s.value}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
      }
    />
  )
}
