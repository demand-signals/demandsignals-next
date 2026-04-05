import type { Metadata } from 'next';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Terms of Service — Demand Signals',
};

export default function TermsPage() {
  return (
    <>
      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '60px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
            Terms of Service
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1rem' }}>
            Last updated: April 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{ background: '#fff', padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', color: 'var(--slate)', lineHeight: 1.75, fontSize: '0.975rem' }}>

          <h2 style={sectionHeadStyle}>1. Acceptance of Terms</h2>
          <p>By accessing or using the {SITE_NAME} website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

          <h2 style={sectionHeadStyle}>2. Services</h2>
          <p>{SITE_NAME} provides AI-powered demand generation, digital marketing strategy, website development, and related services. The specific scope of services will be defined in individual client agreements or proposals.</p>

          <h2 style={sectionHeadStyle}>3. Free Tools and Reports</h2>
          <p>Free intelligence reports and tools offered through this site are provided as-is for informational purposes. While we make every effort to ensure accuracy, we make no warranties regarding completeness or fitness for a particular purpose. Free reports do not constitute an ongoing service engagement.</p>

          <h2 style={sectionHeadStyle}>4. Intellectual Property</h2>
          <p>All content on this website — including text, graphics, code, and branding — is the property of {SITE_NAME} and is protected by applicable intellectual property laws. Reports and deliverables created specifically for your business become your property upon full payment of applicable fees.</p>

          <h2 style={sectionHeadStyle}>5. Limitation of Liability</h2>
          <p>{SITE_NAME} shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services or website. Our total liability for any claim shall not exceed the amount paid for the specific service in question.</p>

          <h2 style={sectionHeadStyle}>6. User Conduct</h2>
          <p>You agree not to use our services or website for any unlawful purpose, to submit false or misleading information, or to interfere with the operation of our systems. We reserve the right to refuse service to anyone for any lawful reason.</p>

          <h2 style={sectionHeadStyle}>7. Privacy</h2>
          <p>Your use of our services is also governed by our <a href="/privacy" style={{ color: 'var(--teal)', fontWeight: 600 }}>Privacy Policy</a>, which is incorporated into these Terms by reference.</p>

          <h2 style={sectionHeadStyle}>8. Modifications</h2>
          <p>We reserve the right to update these Terms at any time. Continued use of our services after changes constitutes acceptance of the updated Terms. We will post the updated date at the top of this page.</p>

          <h2 style={sectionHeadStyle}>9. Governing Law</h2>
          <p>These Terms are governed by the laws of the State of California, without regard to conflict of law principles. Any disputes shall be resolved in the courts of El Dorado County, California.</p>

          <h2 style={sectionHeadStyle}>10. Contact</h2>
          <p>
            For questions about these Terms, contact us at:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--teal)', fontWeight: 600 }}>{CONTACT_EMAIL}</a>
          </p>
          <p style={{ marginTop: 8, fontSize: '0.9rem', color: '#a0aec0' }}>
            {SITE_NAME} · Northern California · United States
          </p>
        </div>
      </section>
    </>
  );
}

const sectionHeadStyle: React.CSSProperties = {
  color: 'var(--dark)',
  fontWeight: 700,
  fontSize: '1.15rem',
  marginTop: 36,
  marginBottom: 12,
};
