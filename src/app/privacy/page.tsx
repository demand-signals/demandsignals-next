import type { Metadata } from 'next';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/constants';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Privacy Policy — Demand Signals',
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Privacy Policy', url: 'https://demandsignals.co/privacy' },
      ])} />
      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '60px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1rem' }}>
            Last updated: April 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{ background: '#fff', padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', color: 'var(--slate)', lineHeight: 1.75, fontSize: '0.975rem' }}>

          <h2 style={sectionHeadStyle}>1. Information We Collect</h2>
          <p>We collect information you provide directly to us through our contact forms, report request forms, and newsletter sign-ups. This includes your name, email address, phone number, business name, and any messages you submit. We do not automatically collect browsing data beyond standard server logs.</p>

          <h2 style={sectionHeadStyle}>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul style={{ paddingLeft: 24, marginBottom: 20 }}>
            <li>Respond to your inquiries and fulfill service requests</li>
            <li>Deliver intelligence reports and other requested materials</li>
            <li>Send occasional marketing communications (you can opt out at any time)</li>
            <li>Improve our website and service offerings</li>
          </ul>

          <h2 style={sectionHeadStyle}>3. Information Sharing</h2>
          <p>We do not sell, rent, or share your personal information with third parties for marketing purposes. We may share data with service providers who assist in operating our platform (e.g., email delivery), subject to confidentiality agreements.</p>

          <h2 style={sectionHeadStyle}>4. Data Retention</h2>
          <p>We retain your information for as long as necessary to provide our services and comply with legal obligations. You may request deletion of your data at any time by contacting us.</p>

          <h2 style={sectionHeadStyle}>5. Cookies</h2>
          <p>Our site may use minimal cookies for analytics and performance. We do not use third-party advertising cookies. You can disable cookies in your browser settings without affecting core site functionality.</p>

          <h2 style={sectionHeadStyle}>6. Security</h2>
          <p>We implement reasonable technical and organizational measures to protect your data. However, no system is completely secure, and we cannot guarantee absolute security.</p>

          <h2 style={sectionHeadStyle}>7. Your Rights</h2>
          <p>Depending on your location, you may have rights to access, correct, or delete your personal data. To exercise any of these rights, contact us directly.</p>

          <h2 style={sectionHeadStyle}>8. Contact</h2>
          <p>
            For privacy-related questions, contact us at:{' '}
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
