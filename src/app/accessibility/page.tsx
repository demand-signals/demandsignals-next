import type { Metadata } from 'next';
import { CONTACT_EMAIL, SITE_NAME, CONTACT_PHONE } from '@/lib/constants';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Accessibility Statement — Demand Signals',
  description: 'Our commitment to digital accessibility and WCAG 2.1 Level AA conformance. Learn about our accessibility practices, known limitations, and how to report issues.',
  alternates: { canonical: 'https://demandsignals.co/accessibility' },
  openGraph: {
    title: 'Accessibility Statement — Demand Signals',
    description: 'Our commitment to digital accessibility and WCAG 2.1 Level AA conformance.',
    url: 'https://demandsignals.co/accessibility',
    siteName: 'Demand Signals',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Accessibility Statement — Demand Signals', type: 'image/png' }],
  },
  twitter: {
    card: 'summary',
    title: 'Accessibility Statement — Demand Signals',
    description: 'Our commitment to digital accessibility and WCAG 2.1 Level AA conformance.',
    site: '@demandsignals',
    creator: '@demandsignals',
  },
};

export default function AccessibilityPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: 'https://demandsignals.co' },
        { name: 'Accessibility', url: 'https://demandsignals.co/accessibility' },
      ])} />
      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '64px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.82rem', marginBottom: 14 }}>Legal</p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
            Accessibility Statement
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Last updated: April 7, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{ background: '#fff', padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', color: 'var(--slate)', lineHeight: 1.8, fontSize: '0.975rem' }}>

          <h2 style={h2}>Our Commitment</h2>
          <p>
            {SITE_NAME} is committed to ensuring our website and digital services are accessible to all people, including individuals with visual, auditory, cognitive, motor, and neurological disabilities. We believe digital accessibility is a fundamental requirement — not an optional feature — and we treat it as an ongoing responsibility in every aspect of our design and development process.
          </p>
          <p>
            As an AI-powered agency that builds websites and applications for clients, we hold ourselves to the same standards we recommend to the businesses we serve.
          </p>

          <h2 style={h2}>Conformance Standard</h2>
          <p>
            We are actively working toward full conformance with the <strong style={bold}>Web Content Accessibility Guidelines (WCAG) 2.1, Level AA</strong>, published by the World Wide Web Consortium (W3C). WCAG 2.1 Level AA is the standard referenced by the Americans with Disabilities Act (ADA) and Section 508 of the Rehabilitation Act, as well as accessibility regulations in the European Union, Canada, Australia, and many other jurisdictions.
          </p>
          <p>
            Our current status is <strong style={bold}>partially conformant</strong> — meaning the majority of our website conforms to WCAG 2.1 Level AA, with specific exceptions documented below that we are actively working to resolve.
          </p>

          <h2 style={h2}>What We&apos;ve Done</h2>
          <p>The following accessibility practices are implemented across our website:</p>

          <h3 style={h3}>Structure and Navigation</h3>
          <ul style={ulStyle}>
            <li>Semantic HTML5 elements (header, nav, main, section, footer, article) throughout all pages</li>
            <li>Logical heading hierarchy (h1 through h6) on every page for screen reader navigation</li>
            <li>ARIA landmarks and roles on interactive components (navigation menus, dropdowns, accordions)</li>
            <li>Skip-to-content link for keyboard users to bypass repeated navigation</li>
            <li>Breadcrumb navigation with proper schema markup on all service and location pages</li>
          </ul>

          <h3 style={h3}>Visual Design</h3>
          <ul style={ulStyle}>
            <li>Minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text against all backgrounds</li>
            <li>No information conveyed by color alone — all status indicators include text labels or icons</li>
            <li>Readable base font size (16px) with responsive scaling using clamp() for comfortable reading on all devices</li>
            <li>Clear visual focus indicators on all interactive elements (links, buttons, form fields)</li>
            <li>Resizable text — all content remains functional at 200% browser zoom</li>
          </ul>

          <h3 style={h3}>Keyboard Accessibility</h3>
          <ul style={ulStyle}>
            <li>All interactive elements (links, buttons, form controls, dropdowns, accordions) are fully operable with keyboard alone</li>
            <li>Logical tab order following the visual layout of each page</li>
            <li>Dropdown navigation menus support Enter/Space to open, Escape to close, and Tab/Arrow keys to navigate items</li>
            <li>No keyboard traps — focus can always move freely through and out of any component</li>
          </ul>

          <h3 style={h3}>Images and Media</h3>
          <ul style={ulStyle}>
            <li>Descriptive alt text on all meaningful images</li>
            <li>Decorative images marked with empty alt attributes or aria-hidden to exclude them from screen reader announcements</li>
            <li>SVG icons include accessible titles or are hidden from assistive technology when purely decorative</li>
          </ul>

          <h3 style={h3}>Forms and Interactive Elements</h3>
          <ul style={ulStyle}>
            <li>All form fields have associated labels (via label elements or aria-label attributes)</li>
            <li>Form validation errors are announced to screen readers and displayed visually near the relevant field</li>
            <li>Required fields are clearly indicated both visually and programmatically</li>
            <li>FAQ accordions use proper ARIA expanded/collapsed states and are operable with keyboard</li>
          </ul>

          <h3 style={h3}>Performance and Compatibility</h3>
          <ul style={ulStyle}>
            <li>Server-side rendering (Next.js SSR/SSG) ensures content is available to screen readers without waiting for JavaScript execution</li>
            <li>Pages are structured to degrade gracefully if JavaScript fails to load</li>
            <li>Tested with major screen readers (NVDA, VoiceOver) and keyboard-only navigation</li>
          </ul>

          <h2 style={h2}>Known Limitations</h2>
          <p>
            Despite our efforts, the following areas have known accessibility gaps that we are actively working to resolve:
          </p>

          <div style={issueCard}>
            <p style={{ margin: '0 0 6px', color: 'var(--dark)', fontWeight: 700 }}>Animated Canvas Elements</p>
            <p style={{ margin: 0 }}>
              Hero sections use an HTML5 Canvas particle animation that cannot be paused by users. Users with motion sensitivity or vestibular disorders may find this uncomfortable. <strong style={bold}>Planned fix:</strong> Add a <code style={code}>prefers-reduced-motion</code> media query to disable canvas animations and replace with a static gradient background.
            </p>
          </div>

          <div style={issueCard}>
            <p style={{ margin: '0 0 6px', color: 'var(--dark)', fontWeight: 700 }}>Scroll-triggered Animations</p>
            <p style={{ margin: 0 }}>
              Some page sections use Framer Motion scroll-triggered fade-in and slide-in animations. While these are brief and subtle, they may present issues for users with motion sensitivity. <strong style={bold}>Planned fix:</strong> Implement <code style={code}>prefers-reduced-motion</code> detection in our ScrollReveal component to disable transitions when the user&apos;s OS-level motion preference is set to reduced.
            </p>
          </div>

          <div style={issueCard}>
            <p style={{ margin: '0 0 6px', color: 'var(--dark)', fontWeight: 700 }}>Third-Party Embedded Content</p>
            <p style={{ margin: 0 }}>
              Our Google Calendar booking widget and any embedded third-party tools may not fully meet WCAG 2.1 Level AA standards. These components are controlled by external providers. We provide alternative contact methods (phone, email) for users who cannot interact with embedded widgets.
            </p>
          </div>

          <div style={issueCard}>
            <p style={{ margin: '0 0 6px', color: 'var(--dark)', fontWeight: 700 }}>PDF Reports</p>
            <p style={{ margin: 0 }}>
              Intelligence reports generated by our tools may not be fully accessible in PDF format. <strong style={bold}>Planned fix:</strong> Offer HTML-based report views as an alternative to PDF downloads.
            </p>
          </div>

          <h2 style={h2}>Assistive Technology Compatibility</h2>
          <p>Our website is designed to be compatible with the following assistive technologies:</p>
          <ul style={ulStyle}>
            <li><strong style={bold}>Screen readers:</strong> NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android)</li>
            <li><strong style={bold}>Browser magnification:</strong> All major browsers at up to 200% zoom</li>
            <li><strong style={bold}>Keyboard navigation:</strong> Full site navigation without mouse</li>
            <li><strong style={bold}>Voice control:</strong> Basic compatibility with Dragon NaturallySpeaking and Voice Control (macOS)</li>
          </ul>
          <p>
            Our website is designed to work with current and recent versions of major browsers (Chrome, Firefox, Safari, Edge).
          </p>

          <h2 style={h2}>Assessment Methods</h2>
          <p>{SITE_NAME} assesses website accessibility through:</p>
          <ul style={ulStyle}>
            <li><strong style={bold}>Automated testing:</strong> Lighthouse accessibility audits and axe-core analysis during development and deployment.</li>
            <li><strong style={bold}>Manual testing:</strong> Keyboard-only navigation testing, screen reader testing (NVDA, VoiceOver), and visual inspection of color contrast and focus indicators.</li>
            <li><strong style={bold}>Code review:</strong> Accessibility checks are part of our development process — semantic HTML, ARIA attributes, and alt text are reviewed before deployment.</li>
            <li><strong style={bold}>User feedback:</strong> We incorporate accessibility-related feedback from users into our improvement roadmap and prioritize reported issues.</li>
          </ul>

          <h2 style={h2}>Reporting an Accessibility Issue</h2>
          <p>
            If you encounter an accessibility barrier on our website, we want to hear about it. Please provide as much detail as possible so we can identify and fix the issue:
          </p>
          <ul style={ulStyle}>
            <li>The web page URL where you encountered the issue</li>
            <li>A description of the problem and what you were trying to do</li>
            <li>The assistive technology and browser you were using (if applicable)</li>
            <li>Your preferred format for our response (email, phone, etc.)</li>
          </ul>

          <div style={contactBox}>
            <p style={{ margin: '0 0 6px', color: 'var(--dark)', fontWeight: 700 }}>Report an Accessibility Issue</p>
            <p style={{ margin: '0 0 4px' }}>
              Email: <a href={`mailto:${CONTACT_EMAIL}?subject=Accessibility%20Issue`} style={link}>{CONTACT_EMAIL}</a>
            </p>
            <p style={{ margin: '0 0 4px' }}>
              Phone: <a href="tel:+19165422423" style={link}>{CONTACT_PHONE}</a>
            </p>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--dark)', fontSize: '0.93rem' }}>
              We aim to respond to accessibility reports within 2 business days.
            </p>
          </div>

          <h2 style={h2}>Formal Complaints</h2>
          <p>
            If you are not satisfied with our response to an accessibility concern, you may:
          </p>
          <ul style={ulStyle}>
            <li>Escalate your complaint by emailing <a href={`mailto:${CONTACT_EMAIL}?subject=Accessibility%20Complaint`} style={link}>{CONTACT_EMAIL}</a> with &ldquo;Accessibility Complaint&rdquo; in the subject line. All complaints are reviewed by management.</li>
            <li>File a complaint with the U.S. Department of Justice, Civil Rights Division, Disability Rights Section.</li>
            <li>Contact your state&apos;s attorney general or relevant regulatory body.</li>
          </ul>

          <h2 style={h2}>Applicable Laws and Standards</h2>
          <p>This accessibility statement considers the following laws and standards:</p>
          <ul style={ulStyle}>
            <li><strong style={bold}>Americans with Disabilities Act (ADA)</strong> — Title III, as interpreted to apply to websites as places of public accommodation</li>
            <li><strong style={bold}>Section 508 of the Rehabilitation Act</strong> — Applicable to federal agencies and contractors; we follow its technical standards as a best practice</li>
            <li><strong style={bold}>Web Content Accessibility Guidelines (WCAG) 2.1</strong> — Our target conformance level is AA</li>
            <li><strong style={bold}>California Unruh Civil Rights Act</strong> — Requires full and equal access to business establishments, including websites</li>
            <li><strong style={bold}>European Accessibility Act (EAA)</strong> — For clients and visitors in the EU, we strive to meet the accessibility requirements outlined in EN 301 549</li>
          </ul>

          <h2 style={h2}>Continuous Improvement</h2>
          <p>
            Accessibility is not a one-time project — it is an ongoing commitment. We regularly audit our website, incorporate new accessibility best practices, and update this statement as improvements are made. Our goal is full WCAG 2.1 Level AA conformance across all pages and components.
          </p>
          <p>
            As an agency that builds websites for other businesses, we are committed to leading by example. The accessibility standards we apply to our own site inform the standards we recommend and implement for our clients.
          </p>

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
const code: React.CSSProperties = {
  background: 'rgba(104,197,173,0.1)', color: 'var(--teal)', padding: '2px 6px',
  borderRadius: 4, fontSize: '0.88em', fontFamily: 'monospace',
};
const ulStyle: React.CSSProperties = { paddingLeft: 24, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 };
const issueCard: React.CSSProperties = {
  background: 'var(--light)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12,
  padding: '20px 24px', marginBottom: 16, lineHeight: 1.7,
};
const contactBox: React.CSSProperties = {
  background: 'var(--light)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12,
  padding: '24px 28px', margin: '20px 0', lineHeight: 1.7, fontSize: '0.95rem',
};
