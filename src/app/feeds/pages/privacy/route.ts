import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const SECTIONS = [
  {
    heading: '1. Information We Collect',
    content: `**1.1 Information You Provide Directly**

- **Contact forms:** Name, email address, phone number, business name, website URL, and any message content you submit through our contact, quote request, or report request forms.
- **Newsletter sign-ups:** Email address and, optionally, your name and business name.
- **Booking/scheduling:** When you book a call through our Google Calendar integration, your name, email, and selected time slot are processed by Google. We receive the appointment details.
- **Client engagements:** Business information, access credentials, analytics data, and other materials you provide as part of a service engagement, governed by your service agreement.

**1.2 Information Collected Automatically**

- **Server logs:** IP address, browser type, operating system, referring URL, pages visited, and timestamps. These are standard web server logs retained for security and operational purposes.
- **Analytics:** We use Google Analytics 4 (GA4) to understand how visitors interact with our website. GA4 collects data such as pages visited, session duration, device type, browser, approximate geographic location, and referral sources. When you consent to analytics cookies, this data is associated with a randomly generated client identifier.
- **Cookies:** We use essential cookies for site functionality (e.g., form submission state, cookie preferences). When you consent, we also use analytics cookies set by Google Analytics. We do not use retargeting pixels or cross-site tracking technologies unless you explicitly opt in via our cookie preferences panel.

**1.3 Information We Do Not Collect**

- We do not collect payment information directly — all payments are processed through third-party payment processors (e.g., Stripe, PayPal) with their own privacy policies.
- We do not collect biometric data, geolocation data, or data from social media profiles unless you explicitly provide it.
- We do not purchase consumer data from data brokers or third parties.`,
  },
  {
    heading: '2. How We Use Your Information',
    content: `We use the information we collect for the following purposes:

- **Service delivery:** To respond to inquiries, deliver intelligence reports, fulfill service engagements, and communicate project updates.
- **Marketing communications:** To send occasional emails about our services, blog posts, or industry insights. You can opt out at any time using the unsubscribe link in any email.
- **Site improvement:** To analyze aggregate usage patterns, identify technical issues, and improve site performance and content.
- **Security:** To detect and prevent fraud, abuse, and unauthorized access to our systems.
- **Legal compliance:** To comply with applicable laws, regulations, and legal processes.`,
  },
  {
    heading: '3. Google Analytics 4 and Data Collection',
    content: `We use Google Analytics 4 ("GA4") with measurement ID G-JYSS0XVLTY to analyze website traffic and improve our services.

**3.1 Google Signals** — When Google Signals is active and you have turned on Ads Personalization in your Google account, Analytics may associate session data collected from our site with Google's information from your signed-in Google account. You can opt out by turning off Ads Personalization in your Google Account settings or declining analytics cookies in our cookie preferences panel.

**3.2 User-ID and User-Provided Data Collection** — We may use GA4's User-ID feature to connect your behavior across different sessions and devices when you are identifiable through a login or form submission. User-provided data is one-way hashed before transmission — Google cannot reverse it to the original value.

**3.3 Granular Location and Device Data** — We have activated granular location and device data collection in GA4, including city-level location and device details such as device model, operating system, and screen resolution.

**3.4 Ads Personalization** — When linked with advertising accounts, this allows us to export Google Analytics audiences to linked advertising accounts for delivering relevant, personalized ad experiences. You can opt out by declining marketing cookies.

**3.5 Data Collection Acknowledgement** — By accepting analytics and/or marketing cookies on our site, you acknowledge that Google Analytics collects session data, device information, and approximate location as described above. You may withdraw consent at any time using the cookie icon in the bottom-left corner of any page.`,
  },
  {
    heading: '4. AI Systems and Data Processing',
    content: `Demand Signals uses AI systems (including language models, content generation tools, and automation agents) as part of our service delivery. When we process your business data through AI systems:

- Client data is used solely for delivering the contracted services — never for training AI models.
- We use enterprise-grade AI APIs (e.g., Anthropic Claude API, OpenAI API) that do not retain or train on customer data per their data processing agreements.
- AI-generated content is reviewed by our team before publication unless otherwise agreed in your service terms.
- We do not use AI to make automated decisions that produce legal or similarly significant effects on individuals.`,
  },
  {
    heading: '5. Information Sharing and Disclosure',
    content: `We do not sell, rent, or trade your personal information. We may share information in these limited circumstances:

- **Service providers:** We work with trusted third-party providers for email delivery (e.g., Gmail/Google Workspace), hosting (Vercel), analytics, and domain services. These providers are contractually obligated to protect your data.
- **Client-authorized sharing:** When delivering services, we may interact with your platforms using credentials you provide. We access only what is necessary for the agreed scope of work.
- **Legal requirements:** We may disclose information if required by law, subpoena, court order, or governmental regulation.
- **Business transfers:** In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.`,
  },
  {
    heading: '6. Data Retention',
    content: `- **Contact form submissions:** Retained for up to 2 years after the last communication, then deleted.
- **Newsletter subscribers:** Retained until you unsubscribe, then deleted within 30 days.
- **Client project data:** Retained for the duration of the engagement plus 1 year for reference, unless a longer period is specified in your service agreement.
- **Server logs:** Retained for up to 90 days for security and operational purposes.
- **Analytics data:** Aggregated analytics data (which cannot identify individuals) may be retained indefinitely.

You may request deletion of your personal data at any time (see Section 8).`,
  },
  {
    heading: '7. Data Security',
    content: `We implement reasonable technical and organizational safeguards to protect your information, including:

- HTTPS/TLS encryption on all web traffic
- Encrypted storage for sensitive credentials and API keys
- Access controls limiting data access to authorized personnel
- Regular security reviews of our infrastructure and third-party integrations
- Secure hosting on Vercel's SOC 2 Type II certified infrastructure

No method of electronic transmission or storage is 100% secure. If we become aware of a data breach that affects your personal information, we will notify you in accordance with applicable law.`,
  },
  {
    heading: '8. Your Rights (California Residents — CCPA/CPRA)',
    content: `If you are a California resident, you have the following rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):

- **Right to Know:** You may request a copy of the personal information we have collected about you in the preceding 12 months.
- **Right to Delete:** You may request that we delete your personal information, subject to certain legal exceptions.
- **Right to Correct:** You may request correction of inaccurate personal information.
- **Right to Opt Out of Sale/Sharing:** We do not sell or share your personal information for cross-context behavioral advertising. There is nothing to opt out of.
- **Right to Non-Discrimination:** We will not discriminate against you for exercising any of your privacy rights.

To exercise any of these rights, contact us at DemandSignals@gmail.com or call (916) 542-2423. We will respond to verified requests within 45 days.`,
  },
  {
    heading: '9. Other State Privacy Rights',
    content: `Residents of Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), and other states with consumer privacy laws may have similar rights to access, delete, and correct their data, and to opt out of targeted advertising. Since we do not sell data or engage in targeted advertising, most opt-out rights are already satisfied. For data access or deletion requests, contact us using the information in Section 13.`,
  },
  {
    heading: '10. Children\'s Privacy',
    content: `Our services are not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately and we will delete it.`,
  },
  {
    heading: '11. Third-Party Links',
    content: `Our website may contain links to third-party websites (e.g., Google Calendar for booking, social media profiles). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any information.`,
  },
  {
    heading: '12. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make material changes, we will update the "Last updated" date at the top of this page. We encourage you to review this policy periodically.`,
  },
  {
    heading: '13. Contact Us',
    content: `**Demand Signals**
Northern California, United States
Email: DemandSignals@gmail.com
Phone: (916) 542-2423
Hours: Monday-Friday, 10 AM - 8 PM Pacific Time`,
  },
]

export async function GET(request: Request) {
  const detail = getDetailLevel(request)

  let md: string

  if (detail === 'summary') {
    const headings = SECTIONS
      .map(s => `- ${s.heading}`)
      .join('\n')

    md = [
      '# Privacy Policy — Demand Signals',
      '',
      'Last updated: April 7, 2026',
      '',
      '## Sections',
      '',
      headings,
      '',
      `**Full policy:** [Privacy Policy](${SITE_URL}/privacy)  `,
      `**Full markdown:** [Privacy Feed (full)](${SITE_URL}/feeds/pages/privacy?detail=full)`,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Privacy Policy](${SITE_URL}/privacy)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
      `**Blog:** [Blog Index](${SITE_URL}/feeds/blog.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  } else {
    const sectionsBlock = SECTIONS
      .map(s => `## ${s.heading}\n\n${s.content}`)
      .join('\n\n')

    md = [
      '# Privacy Policy — Demand Signals',
      '',
      'Last updated: April 7, 2026',
      '',
      'Demand Signals ("we," "us," or "our") operates the website demandsignals.co and provides AI-powered demand generation, website development, and digital marketing services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or engage our services.',
      '',
      sectionsBlock,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Privacy Policy](${SITE_URL}/privacy)  `,
      `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
      `**All FAQs:** [Master FAQ](${SITE_URL}/faqs.md)  `,
      `**Blog:** [Blog Index](${SITE_URL}/feeds/blog.md)  `,
      `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
    ].join('\n')
  }

  const cached = checkConditional(request, md)
  if (cached) return cached

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md),
  })
}
