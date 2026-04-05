import type { Metadata } from 'next';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Accessibility Statement — Demand Signals',
  description:
    'Our commitment to digital accessibility and our approach to meeting WCAG 2.1 Level AA standards.',
};

export default function AccessibilityPage() {
  return (
    <>
      {/* Dark Header */}
      <section
        style={{
          background: 'var(--dark)',
          paddingTop: '120px',
          paddingBottom: '64px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p
            style={{
              color: 'var(--teal)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: '0.82rem',
              marginBottom: 14,
            }}
          >
            Legal
          </p>
          <h1
            style={{
              color: '#fff',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 16,
            }}
          >
            Accessibility Statement
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Last updated: April 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{ background: '#fff', padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', color: 'var(--slate)', lineHeight: 1.8, fontSize: '0.975rem' }}>

          <h2 style={headStyle}>Our Commitment</h2>
          <p>
            {SITE_NAME} is committed to ensuring our website is accessible and usable by all people, including those with visual, auditory, cognitive, and motor disabilities. We believe that digital accessibility is a baseline requirement, not a feature — and we treat it as an ongoing responsibility.
          </p>

          <h2 style={headStyle}>Conformance Status</h2>
          <p>
            We are actively working toward conformance with the <strong style={{ color: 'var(--dark)' }}>Web Content Accessibility Guidelines (WCAG) 2.1, Level AA</strong>. These guidelines explain how to make web content more accessible to people with disabilities. Conformance with these guidelines helps make the web more inclusive for everyone.
          </p>
          <p>
            Our current status is <em>partially conformant</em> — meaning that some content does not yet fully conform to WCAG 2.1 Level AA, but we are actively working to identify and address those gaps.
          </p>

          <h2 style={headStyle}>Known Limitations</h2>
          <p>
            Despite our best efforts, there are areas we are actively working to improve:
          </p>
          <ul style={ulStyle}>
            <li>Some animated canvas elements (used in hero sections) may present challenges for users with motion sensitivity. We intend to add a prefers-reduced-motion override in a future update.</li>
            <li>Certain data-heavy sections may not yet have full ARIA labeling. We are auditing these components and adding appropriate roles and descriptions.</li>
            <li>Third-party embedded content (such as calendar booking widgets) may not fully meet our accessibility standards, as those elements are controlled by external providers.</li>
          </ul>

          <h2 style={headStyle}>Technical Specifications</h2>
          <p>
            This website is built using the following technologies, which are relied upon for conformance:
          </p>
          <ul style={ulStyle}>
            <li>HTML5 — semantic structure and accessible markup</li>
            <li>CSS3 — layout and visual presentation</li>
            <li>JavaScript (ES2020+) — interactive behavior</li>
            <li>Next.js 14+ — server-side rendering and static generation for improved performance and crawlability</li>
          </ul>

          <h2 style={headStyle}>Assessment Approach</h2>
          <p>
            {SITE_NAME} assesses the accessibility of this website through the following methods:
          </p>
          <ul style={ulStyle}>
            <li><strong style={{ color: 'var(--dark)' }}>Self-evaluation</strong> — Our development team regularly reviews pages against WCAG 2.1 success criteria and uses browser-based accessibility tools to identify issues.</li>
            <li><strong style={{ color: 'var(--dark)' }}>Automated testing</strong> — We use Lighthouse and axe-core during development to flag common accessibility violations before deployment.</li>
            <li><strong style={{ color: 'var(--dark)' }}>User feedback</strong> — We actively incorporate accessibility-related feedback from users into our improvement roadmap.</li>
          </ul>

          <h2 style={headStyle}>Feedback and Contact</h2>
          <p>
            We welcome feedback on the accessibility of this website. If you encounter any barriers, have difficulty accessing any content, or would like to request information in an alternative format, please contact us directly:
          </p>
          <div
            style={{
              background: 'var(--light)',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 12,
              padding: '24px 28px',
              margin: '20px 0',
            }}
          >
            <p style={{ margin: '0 0 6px 0', color: 'var(--dark)', fontWeight: 600 }}>Email</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}
            >
              {CONTACT_EMAIL}
            </a>
            <p style={{ margin: '16px 0 6px 0', color: 'var(--dark)', fontWeight: 600 }}>Response Time</p>
            <p style={{ margin: 0, color: 'var(--slate)', fontSize: '0.93rem' }}>
              We aim to respond to accessibility-related inquiries within 2 business days.
            </p>
          </div>

          <h2 style={headStyle}>Formal Complaints</h2>
          <p>
            If you are not satisfied with our response to an accessibility concern, or if you believe we have not adequately addressed your accessibility needs, please escalate your complaint directly to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--teal)', fontWeight: 600 }}>
              {CONTACT_EMAIL}
            </a>{' '}
            and include "Accessibility Complaint" in the subject line. We take every complaint seriously and will escalate internally to ensure resolution.
          </p>
          <p>
            You may also contact relevant regulatory bodies in your jurisdiction if you believe your rights under applicable accessibility laws have not been met.
          </p>

          <p style={{ marginTop: 48, fontSize: '0.88rem', color: '#a0aec0', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 24 }}>
            {SITE_NAME} · Northern California · United States
          </p>
        </div>
      </section>
    </>
  );
}

const headStyle: React.CSSProperties = {
  color: 'var(--dark)',
  fontWeight: 700,
  fontSize: '1.15rem',
  marginTop: 40,
  marginBottom: 12,
};

const ulStyle: React.CSSProperties = {
  paddingLeft: 24,
  marginBottom: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
