import type { Metadata } from 'next';
import { CONTACT_EMAIL, SITE_NAME, CONTACT_PHONE } from '@/lib/constants';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Privacy Policy — Demand Signals',
  description: 'How Demand Signals collects, uses, protects, and shares your personal information. CCPA/CPRA compliant privacy practices for our AI-powered demand generation services.',
  alternates: { canonical: 'https://demandsignals.co/privacy' },
  openGraph: {
    title: 'Privacy Policy — Demand Signals',
    description: 'How Demand Signals collects, uses, protects, and shares your personal information.',
    url: 'https://demandsignals.co/privacy',
    siteName: 'Demand Signals',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Privacy Policy — Demand Signals', type: 'image/png' }],
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy — Demand Signals',
    description: 'How Demand Signals collects, uses, protects, and shares your personal information.',
    site: '@demandsignals',
    creator: '@demandsignals',
  },
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
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.82rem', marginBottom: 14 }}>Legal</p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
            Privacy Policy
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
            Demand Signals (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website <strong style={{ color: 'var(--dark)' }}>demandsignals.co</strong> and provides AI-powered demand generation, website development, and digital marketing services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or engage our services.
          </p>

          <h2 style={h2}>1. Information We Collect</h2>

          <h3 style={h3}>1.1 Information You Provide Directly</h3>
          <ul style={ulStyle}>
            <li><strong style={bold}>Contact forms:</strong> Name, email address, phone number, business name, website URL, and any message content you submit through our contact, quote request, or report request forms.</li>
            <li><strong style={bold}>Newsletter sign-ups:</strong> Email address and, optionally, your name and business name.</li>
            <li><strong style={bold}>Booking/scheduling:</strong> When you book a call through our Google Calendar integration, your name, email, and selected time slot are processed by Google. We receive the appointment details.</li>
            <li><strong style={bold}>Client engagements:</strong> Business information, access credentials, analytics data, and other materials you provide as part of a service engagement, governed by your service agreement.</li>
          </ul>

          <h3 style={h3}>1.2 Information Collected Automatically</h3>
          <ul style={ulStyle}>
            <li><strong style={bold}>Server logs:</strong> IP address, browser type, operating system, referring URL, pages visited, and timestamps. These are standard web server logs retained for security and operational purposes.</li>
            <li><strong style={bold}>Analytics:</strong> We use Google Analytics 4 (GA4) to understand how visitors interact with our website. GA4 collects data such as pages visited, session duration, device type, browser, approximate geographic location, and referral sources. When you consent to analytics cookies, this data is associated with a randomly generated client identifier. See Section 3 for full details on our Google Analytics implementation.</li>
            <li><strong style={bold}>Cookies:</strong> We use essential cookies for site functionality (e.g., form submission state, cookie preferences). When you consent, we also use analytics cookies set by Google Analytics. We do not use retargeting pixels or cross-site tracking technologies unless you explicitly opt in via our cookie preferences panel. See Section 3 for details on each cookie category.</li>
          </ul>

          <h3 style={h3}>1.3 Information We Do Not Collect</h3>
          <ul style={ulStyle}>
            <li>We do not collect payment information directly — all payments are processed through third-party payment processors (e.g., Stripe, PayPal) with their own privacy policies.</li>
            <li>We do not collect biometric data, geolocation data, or data from social media profiles unless you explicitly provide it.</li>
            <li>We do not purchase consumer data from data brokers or third parties.</li>
          </ul>

          <h2 style={h2}>2. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul style={ulStyle}>
            <li><strong style={bold}>Service delivery:</strong> To respond to inquiries, deliver intelligence reports, fulfill service engagements, and communicate project updates.</li>
            <li><strong style={bold}>Marketing communications:</strong> To send occasional emails about our services, blog posts, or industry insights. You can opt out at any time using the unsubscribe link in any email.</li>
            <li><strong style={bold}>Site improvement:</strong> To analyze aggregate usage patterns, identify technical issues, and improve site performance and content.</li>
            <li><strong style={bold}>Security:</strong> To detect and prevent fraud, abuse, and unauthorized access to our systems.</li>
            <li><strong style={bold}>Legal compliance:</strong> To comply with applicable laws, regulations, and legal processes.</li>
          </ul>

          <h2 style={h2}>3. Google Analytics 4 and Data Collection</h2>
          <p>
            We use Google Analytics 4 (&ldquo;GA4&rdquo;) with measurement ID <strong style={bold}>G-JYSS0XVLTY</strong> to analyze website traffic and improve our services. This section describes the data collection features we have enabled and your choices regarding them.
          </p>

          <h3 style={h3}>3.1 Google Signals</h3>
          <p>
            We have enabled <strong style={bold}>Google Signals</strong> in our GA4 property. When Google Signals is active and you have turned on Ads Personalization in your Google account, Analytics may associate session data collected from our site with Google&apos;s information from your signed-in Google account. This provides us with aggregated, anonymized demographic and interest data (such as age ranges and interest categories) to better understand our audience.
          </p>
          <p>
            By enabling Google Signals, we acknowledge that we adhere to the <a href="https://support.google.com/analytics/answer/2700409" style={link} target="_blank" rel="noopener noreferrer">Google Advertising Features Policy</a>, including rules around sensitive categories. You can opt out of Google Signals data collection by:
          </p>
          <ul style={ulStyle}>
            <li>Turning off Ads Personalization in your <a href="https://myaccount.google.com/data-and-privacy" style={link} target="_blank" rel="noopener noreferrer">Google Account settings</a></li>
            <li>Declining analytics cookies in our cookie preferences panel</li>
            <li>Managing or deleting your activity via <a href="https://myactivity.google.com" style={link} target="_blank" rel="noopener noreferrer">My Activity</a></li>
          </ul>

          <h3 style={h3}>3.2 User-ID and User-Provided Data Collection</h3>
          <p>
            We may use GA4&apos;s <strong style={bold}>User-ID</strong> feature to connect your behavior across different sessions and devices when you are identifiable through a login or form submission. Google Analytics interprets each distinct User-ID as a separate user, which helps us understand multi-session engagement more accurately.
          </p>
          <p>
            We may also use <strong style={bold}>user-provided data collection</strong>, which allows us to securely send consented, hashed customer data (such as email addresses) to Google Analytics in a privacy-safe manner. This data is:
          </p>
          <ul style={ulStyle}>
            <li>One-way hashed before transmission — Google cannot reverse it to the original value</li>
            <li>Used to improve conversion measurement accuracy and audience insights</li>
            <li>Subject to the <a href="https://support.google.com/analytics/answer/14077171" style={link} target="_blank" rel="noopener noreferrer">user-provided data feature policy</a></li>
            <li>Never used for customers in sensitive categories as defined by Google&apos;s policies</li>
          </ul>
          <p>
            We do not send personally identifiable information as a User-ID. You are never required to provide identifying data, and you may decline analytics tracking entirely through our cookie preferences panel.
          </p>

          <h3 style={h3}>3.3 Granular Location and Device Data</h3>
          <p>
            We have activated <strong style={bold}>granular location and device data collection</strong> in GA4. This means Analytics collects metadata about your city-level location and device details (such as device model, operating system, and screen resolution). This data helps us understand where our visitors are located and what devices they use, so we can optimize our site accordingly.
          </p>
          <p>
            Region and country-level metadata is collected by default for all traffic to support regional privacy policies. Granular (city-level) data collection is enabled in all 307 supported regions. You can limit this by declining analytics cookies in our cookie preferences panel.
          </p>

          <h3 style={h3}>3.4 Ads Personalization</h3>
          <p>
            We have enabled <strong style={bold}>ads personalization</strong> in our GA4 property. When linked with advertising accounts (such as Google Ads), this allows us to:
          </p>
          <ul style={ulStyle}>
            <li>Export Google Analytics audiences to linked advertising accounts for delivering relevant, personalized ad experiences</li>
            <li>Improve conversion measurement across our marketing campaigns</li>
            <li>Use key events data to optimize ad targeting and bidding</li>
          </ul>
          <p>
            Ads personalization is allowed in all 307 supported regions. You can opt out by declining marketing cookies in our cookie preferences panel, which prevents your data from being used for ads personalization purposes.
          </p>

          <h3 style={h3}>3.5 Data Collection Acknowledgement</h3>
          <p>
            By accepting analytics and/or marketing cookies on our site, you acknowledge that:
          </p>
          <ul style={ulStyle}>
            <li>Google Analytics collects session data, device information, and approximate location as described above</li>
            <li>When Google Signals is active and you are signed in to a Google account with Ads Personalization enabled, session data may be associated with your Google account information</li>
            <li>You may access and delete your Google activity data at any time via <a href="https://myactivity.google.com" style={link} target="_blank" rel="noopener noreferrer">My Activity</a></li>
            <li>You may withdraw consent at any time using the cookie icon in the bottom-left corner of any page</li>
          </ul>
          <p>
            For more information about Google&apos;s data practices, visit <a href="https://support.google.com/analytics/answer/14077171" style={link} target="_blank" rel="noopener noreferrer">Google Analytics Data Collection</a> and <a href="https://policies.google.com/privacy" style={link} target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.
          </p>

          <h2 style={h2}>4. AI Systems and Data Processing</h2>
          <p>
            Demand Signals uses AI systems (including language models, content generation tools, and automation agents) as part of our service delivery. When we process your business data through AI systems:
          </p>
          <ul style={ulStyle}>
            <li>Client data is used solely for delivering the contracted services — never for training AI models.</li>
            <li>We use enterprise-grade AI APIs (e.g., Anthropic Claude API, OpenAI API) that do not retain or train on customer data per their data processing agreements.</li>
            <li>AI-generated content is reviewed by our team before publication unless otherwise agreed in your service terms.</li>
            <li>We do not use AI to make automated decisions that produce legal or similarly significant effects on individuals.</li>
          </ul>

          <h2 style={h2}>5. Information Sharing and Disclosure</h2>
          <p>We do not sell, rent, or trade your personal information. We may share information in these limited circumstances:</p>
          <ul style={ulStyle}>
            <li><strong style={bold}>Service providers:</strong> We work with trusted third-party providers for email delivery (e.g., Gmail/Google Workspace), hosting (Vercel), analytics, and domain services. These providers are contractually obligated to protect your data and use it only for the services they provide to us.</li>
            <li><strong style={bold}>Client-authorized sharing:</strong> When delivering services, we may interact with your platforms (Google Business Profile, social media accounts, hosting providers) using credentials you provide. We access only what is necessary for the agreed scope of work.</li>
            <li><strong style={bold}>Legal requirements:</strong> We may disclose information if required by law, subpoena, court order, or governmental regulation, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
            <li><strong style={bold}>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction. We will notify you of any such change.</li>
          </ul>

          <h2 style={h2}>6. Data Retention</h2>
          <ul style={ulStyle}>
            <li><strong style={bold}>Contact form submissions:</strong> Retained for up to 2 years after the last communication, then deleted.</li>
            <li><strong style={bold}>Newsletter subscribers:</strong> Retained until you unsubscribe, then deleted within 30 days.</li>
            <li><strong style={bold}>Client project data:</strong> Retained for the duration of the engagement plus 1 year for reference, unless a longer period is specified in your service agreement.</li>
            <li><strong style={bold}>Server logs:</strong> Retained for up to 90 days for security and operational purposes.</li>
            <li><strong style={bold}>Analytics data:</strong> Aggregated analytics data (which cannot identify individuals) may be retained indefinitely.</li>
          </ul>
          <p>You may request deletion of your personal data at any time (see Section 8).</p>

          <h2 style={h2}>7. Data Security</h2>
          <p>We implement reasonable technical and organizational safeguards to protect your information, including:</p>
          <ul style={ulStyle}>
            <li>HTTPS/TLS encryption on all web traffic</li>
            <li>Encrypted storage for sensitive credentials and API keys</li>
            <li>Access controls limiting data access to authorized personnel</li>
            <li>Regular security reviews of our infrastructure and third-party integrations</li>
            <li>Secure hosting on Vercel&apos;s SOC 2 Type II certified infrastructure</li>
          </ul>
          <p>
            No method of electronic transmission or storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security. If we become aware of a data breach that affects your personal information, we will notify you in accordance with applicable law.
          </p>

          <h2 style={h2}>8. Your Rights (California Residents — CCPA/CPRA)</h2>
          <p>If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):</p>
          <ul style={ulStyle}>
            <li><strong style={bold}>Right to Know:</strong> You may request a copy of the personal information we have collected about you in the preceding 12 months, including the categories of information, sources, purposes, and third parties with whom it was shared.</li>
            <li><strong style={bold}>Right to Delete:</strong> You may request that we delete your personal information, subject to certain legal exceptions.</li>
            <li><strong style={bold}>Right to Correct:</strong> You may request correction of inaccurate personal information.</li>
            <li><strong style={bold}>Right to Opt Out of Sale/Sharing:</strong> We do not sell or share your personal information for cross-context behavioral advertising. There is nothing to opt out of.</li>
            <li><strong style={bold}>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your privacy rights.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a> or call <a href="tel:+19165422423" style={link}>{CONTACT_PHONE}</a>. We will respond to verified requests within 45 days.
          </p>

          <h2 style={h2}>9. Other State Privacy Rights</h2>
          <p>
            Residents of Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), and other states with consumer privacy laws may have similar rights to access, delete, and correct their data, and to opt out of targeted advertising. Since we do not sell data or engage in targeted advertising, most opt-out rights are already satisfied. For data access or deletion requests, contact us using the information in Section 13.
          </p>

          <h2 style={h2}>10. Children&apos;s Privacy</h2>
          <p>
            Our services are not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately and we will delete it.
          </p>

          <h2 style={h2}>11. Third-Party Links</h2>
          <p>
            Our website may contain links to third-party websites (e.g., Google Calendar for booking, social media profiles). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any information.
          </p>

          <h2 style={h2}>12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make material changes, we will update the &ldquo;Last updated&rdquo; date at the top of this page. We encourage you to review this policy periodically.
          </p>

          <h2 style={h2}>13. Contact Us</h2>
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
