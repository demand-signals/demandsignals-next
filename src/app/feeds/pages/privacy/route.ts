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
- **Analytics:** We use Vercel Analytics, a privacy-first analytics service that collects aggregate pageview and visitor data without setting cookies or using personally identifiable information. No data is shared with third parties.
- **Cookies:** We use only essential cookies for site functionality (e.g., form submission state). We do not set analytics cookies, retargeting pixels, or cross-site tracking technologies.

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
    heading: '3. Analytics and Data Collection',
    content: `We use **Vercel Analytics** to understand aggregate traffic patterns on our website. Vercel Analytics is a privacy-first analytics service that:

- Does **not** set any cookies on your device
- Does **not** collect personally identifiable information
- Does **not** track you across websites
- Does **not** share data with third parties or advertising networks
- Collects only aggregate pageview counts, referral sources, and geographic region data

Because Vercel Analytics does not use cookies or personal identifiers, no cookie consent banner is required. There is nothing to opt out of — your visit is counted anonymously and cannot be tied back to you as an individual.

For more information, visit [Vercel Analytics Privacy Policy](https://vercel.com/docs/analytics/privacy-policy).

**3.2 PostHog Product Analytics**

We also use **PostHog**, hosted on PostHog Cloud (US), to understand how visitors interact with our website. PostHog may collect:

- Anonymized session recordings (mouse movements, clicks, and scrolls)
- Aggregated heatmap data showing where visitors click and scroll
- Pageview events and navigation patterns

PostHog data is used solely to improve our website's usability and content. We do not use PostHog for advertising, cross-site tracking, or sharing data with third parties. Session recordings are anonymized — form inputs and sensitive text are masked automatically.

For more information, visit [PostHog Privacy Policy](https://posthog.com/privacy).`,
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
