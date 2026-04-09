import type { Metadata } from 'next';
import { CONTACT_EMAIL, SITE_NAME, CONTACT_PHONE } from '@/lib/constants';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Terms of Service — Demand Signals',
  description: 'Terms and conditions governing your use of the Demand Signals website and AI-powered demand generation services. Read before engaging our services.',
  alternates: { canonical: 'https://demandsignals.co/terms' },
  openGraph: {
    title: 'Terms of Service — Demand Signals',
    description: 'Terms and conditions governing your use of the Demand Signals website and AI-powered demand generation services.',
    url: 'https://demandsignals.co/terms',
    siteName: 'Demand Signals',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service — Demand Signals',
    description: 'Terms and conditions governing your use of the Demand Signals website and AI-powered demand generation services.',
    site: '@demandsignals',
    creator: '@demandsignals',
  },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Terms of Service', url: 'https://demandsignals.co/terms' },
      ])} />
      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '60px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.82rem', marginBottom: 14 }}>Legal</p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
            Terms of Service
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1rem' }}>
            Last updated: April 7, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{ background: '#fff', padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', color: 'var(--slate)', lineHeight: 1.75, fontSize: '0.975rem' }}>

          <p style={{ marginBottom: 28 }}>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the {SITE_NAME} website at <strong style={bold}>demandsignals.co</strong> and any services provided by Demand Signals (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing our website or engaging our services, you agree to these Terms. If you do not agree, do not use our website or services.
          </p>

          <h2 style={h2}>1. Services Overview</h2>
          <p>
            {SITE_NAME} provides AI-powered demand generation, website development, digital marketing, content creation, and related technology services. These include but are not limited to:
          </p>
          <ul style={ulStyle}>
            <li>Website design and development (WordPress, React/Next.js, mobile applications)</li>
            <li>Search engine optimization (SEO), generative engine optimization (GEO), and answer engine optimization (AEO)</li>
            <li>AI content generation, social media management, and review response automation</li>
            <li>AI agent deployment, workforce automation, and infrastructure consulting</li>
            <li>Free tools including demand audits and intelligence reports</li>
          </ul>
          <p>
            The specific scope, deliverables, timelines, and pricing for paid services will be defined in a separate service agreement, proposal, or statement of work (&ldquo;Service Agreement&rdquo;) between you and Demand Signals. In the event of a conflict between these Terms and a Service Agreement, the Service Agreement controls for the specific engagement.
          </p>

          <h2 style={h2}>2. Free Tools and Reports</h2>
          <p>
            We offer free tools and intelligence reports through our website (e.g., Demand Audit, Research Reports). These are provided &ldquo;as is&rdquo; for informational purposes only and do not constitute an ongoing service engagement, professional advice, or a guarantee of results.
          </p>
          <ul style={ulStyle}>
            <li>Free reports may contain AI-generated analysis. While we strive for accuracy, we make no warranties regarding completeness or fitness for a particular purpose.</li>
            <li>Free reports and tools may be discontinued, modified, or limited at our discretion without notice.</li>
            <li>Use of free tools does not create a client relationship or obligate either party to further engagement.</li>
          </ul>

          <h2 style={h2}>3. Client Accounts and Access</h2>
          <p>
            When you engage our services, you may provide us with access to third-party accounts and platforms (e.g., Google Business Profile, hosting accounts, social media accounts, analytics dashboards). By doing so, you represent that:
          </p>
          <ul style={ulStyle}>
            <li>You have the authority to grant such access.</li>
            <li>You will provide accurate and complete credentials.</li>
            <li>You understand we will access these accounts only as needed to perform the agreed services.</li>
            <li>You will revoke access upon conclusion of the service engagement if you wish to do so.</li>
          </ul>
          <p>
            We are not responsible for changes made to your accounts by third parties, account suspensions by platform providers, or data loss resulting from platform outages outside our control.
          </p>

          <h2 style={h2}>4. Intellectual Property</h2>

          <h3 style={h3}>4.1 Our Intellectual Property</h3>
          <p>
            All content on this website — including text, graphics, logos, icons, code, designs, and branding — is the property of {SITE_NAME} and is protected by applicable copyright, trademark, and intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from our website content without prior written consent.
          </p>

          <h3 style={h3}>4.2 Client Deliverables</h3>
          <p>
            Custom deliverables created specifically for your business (e.g., website code, designs, content, reports) become your property upon full payment of all applicable fees, unless otherwise specified in your Service Agreement. We retain the right to showcase completed work in our portfolio unless you request otherwise in writing.
          </p>

          <h3 style={h3}>4.3 AI-Generated Content</h3>
          <p>
            Content produced using AI tools (including language models, image generators, and automation systems) as part of your service engagement is delivered to you under the same ownership terms as other deliverables. You are responsible for reviewing AI-generated content before publication and ensuring it complies with applicable laws, regulations, and platform policies.
          </p>

          <h3 style={h3}>4.4 Open-Source and Third-Party Components</h3>
          <p>
            Websites and applications we build may incorporate open-source libraries and third-party services (e.g., Next.js, React, Tailwind CSS, Vercel). These components are governed by their respective licenses. We will disclose major dependencies upon request.
          </p>

          <h2 style={h2}>5. Payment Terms</h2>
          <ul style={ulStyle}>
            <li>Payment terms, amounts, and schedules are defined in your Service Agreement.</li>
            <li>Unless otherwise agreed, invoices are due within 15 days of issuance.</li>
            <li>Late payments may incur a fee of 1.5% per month on the outstanding balance.</li>
            <li>We reserve the right to pause or suspend services if payment is more than 30 days overdue.</li>
            <li>Refund policies, if applicable, are specified in individual Service Agreements.</li>
          </ul>

          <h2 style={h2}>6. Service Level and Guarantees</h2>
          <p>
            We commit to delivering high-quality work within agreed timelines. However:
          </p>
          <ul style={ulStyle}>
            <li>We do not guarantee specific search engine rankings, traffic volumes, or revenue outcomes. SEO, GEO, and AEO are influenced by many factors outside our control, including algorithm changes, competitor actions, and market conditions.</li>
            <li>Uptime and availability of websites we host are subject to the SLAs of the underlying hosting provider (e.g., Vercel, Cloudflare). We will communicate any known outages promptly.</li>
            <li>AI systems may produce imperfect outputs. We implement quality controls and review processes, but cannot guarantee that AI-generated content will be error-free in all cases.</li>
          </ul>

          <h2 style={h2}>7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul style={ulStyle}>
            <li>Use our website or services for any unlawful purpose or in violation of any applicable laws.</li>
            <li>Submit false, misleading, or fraudulent information through our forms or during service engagements.</li>
            <li>Attempt to gain unauthorized access to our systems, networks, or other users&apos; data.</li>
            <li>Scrape, crawl, or harvest content from our website using automated tools without written permission (search engine crawlers and AI training crawlers that respect our robots.txt are permitted).</li>
            <li>Interfere with or disrupt the operation of our website or services.</li>
            <li>Use our services to create content that is defamatory, obscene, or infringes on third-party rights.</li>
          </ul>
          <p>
            We reserve the right to refuse or terminate service to anyone who violates these terms, at our sole discretion.
          </p>

          <h2 style={h2}>8. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
          </p>
          <ul style={ulStyle}>
            <li>{SITE_NAME} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, business opportunities, or goodwill, arising from your use of our website or services.</li>
            <li>Our total aggregate liability for any claim arising under these Terms or any Service Agreement shall not exceed the total amount you paid to us in the 12 months preceding the claim.</li>
            <li>We are not liable for damages caused by third-party platforms, hosting providers, API services, or payment processors.</li>
          </ul>

          <h2 style={h2}>9. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless {SITE_NAME}, its owners, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorney&apos;s fees) arising from: (a) your use of our website or services; (b) your breach of these Terms; (c) content you provide to us for publication; or (d) your violation of any third-party rights.
          </p>

          <h2 style={h2}>10. Termination</h2>
          <ul style={ulStyle}>
            <li><strong style={bold}>By you:</strong> You may stop using our website at any time. For paid services, termination procedures are defined in your Service Agreement.</li>
            <li><strong style={bold}>By us:</strong> We may suspend or terminate your access to our website or services at any time for violation of these Terms, non-payment, or for any other lawful reason with reasonable notice.</li>
            <li><strong style={bold}>Effect of termination:</strong> Sections regarding intellectual property, limitation of liability, indemnification, and governing law survive termination.</li>
          </ul>

          <h2 style={h2}>11. Dispute Resolution</h2>
          <p>
            In the event of a dispute, the parties agree to first attempt resolution through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration administered by JAMS under its Streamlined Arbitration Rules, conducted in El Dorado County, California. The arbitrator&apos;s decision shall be final and enforceable in any court of competent jurisdiction.
          </p>
          <p>
            <strong style={bold}>Class action waiver:</strong> You agree that any dispute resolution will be conducted on an individual basis and not as a class, consolidated, or representative action.
          </p>

          <h2 style={h2}>12. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law principles. For any matters not subject to arbitration, the courts of El Dorado County, California shall have exclusive jurisdiction.
          </p>

          <h2 style={h2}>13. Modifications to These Terms</h2>
          <p>
            We reserve the right to update these Terms at any time. When we make material changes, we will update the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of our website or services after changes constitutes acceptance of the revised Terms. For active service clients, material changes will be communicated via email.
          </p>

          <h2 style={h2}>14. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect.
          </p>

          <h2 style={h2}>15. Entire Agreement</h2>
          <p>
            These Terms, together with our <a href="/privacy" style={link}>Privacy Policy</a> and any applicable Service Agreements, constitute the entire agreement between you and {SITE_NAME} regarding your use of our website and services.
          </p>

          <h2 style={h2}>16. Contact Us</h2>
          <div style={contactBox}>
            <p style={{ margin: '0 0 4px', color: 'var(--dark)', fontWeight: 700 }}>Demand Signals</p>
            <p style={{ margin: '0 0 4px' }}>Northern California, United States</p>
            <p style={{ margin: '0 0 4px' }}>
              Email: <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a>
            </p>
            <p style={{ margin: '0 0 4px' }}>
              Phone: <a href="tel:+19165422423" style={link}>{CONTACT_PHONE}</a>
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(93,103,128,0.7)' }}>
              Hours: Monday–Friday, 10 AM – 8 PM Pacific Time
            </p>
          </div>

          <p style={{ marginTop: 48, fontSize: '0.88rem', color: '#a0aec0', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 24 }}>
            {SITE_NAME} · Northern California · United States
          </p>
        </div>
      </section>
    </>
  );
}

const h2: React.CSSProperties = {
  color: 'var(--dark)', fontWeight: 700, fontSize: '1.2rem', marginTop: 40, marginBottom: 12,
};
const h3: React.CSSProperties = {
  color: 'var(--dark)', fontWeight: 600, fontSize: '1.05rem', marginTop: 24, marginBottom: 10,
};
const bold: React.CSSProperties = { color: 'var(--dark)' };
const link: React.CSSProperties = { color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' };
const ulStyle: React.CSSProperties = { paddingLeft: 24, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 };
const contactBox: React.CSSProperties = {
  background: 'var(--light)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12,
  padding: '24px 28px', margin: '20px 0', lineHeight: 1.7, fontSize: '0.95rem',
};
