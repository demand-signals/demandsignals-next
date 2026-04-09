import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

const SECTIONS = [
  {
    heading: '1. Services Overview',
    content: `Demand Signals provides AI-powered demand generation, website development, digital marketing, content creation, and related technology services. These include but are not limited to:

- Website design and development (WordPress, React/Next.js, mobile applications)
- Search engine optimization (SEO), generative engine optimization (GEO), and answer engine optimization (AEO)
- AI content generation, social media management, and review response automation
- AI agent deployment, workforce automation, and infrastructure consulting
- Free tools including demand audits and intelligence reports

The specific scope, deliverables, timelines, and pricing for paid services will be defined in a separate service agreement, proposal, or statement of work ("Service Agreement") between you and Demand Signals. In the event of a conflict between these Terms and a Service Agreement, the Service Agreement controls for the specific engagement.`,
  },
  {
    heading: '2. Free Tools and Reports',
    content: `We offer free tools and intelligence reports through our website (e.g., Demand Audit, Research Reports). These are provided "as is" for informational purposes only and do not constitute an ongoing service engagement, professional advice, or a guarantee of results.

- Free reports may contain AI-generated analysis. While we strive for accuracy, we make no warranties regarding completeness or fitness for a particular purpose.
- Free reports and tools may be discontinued, modified, or limited at our discretion without notice.
- Use of free tools does not create a client relationship or obligate either party to further engagement.`,
  },
  {
    heading: '3. Client Accounts and Access',
    content: `When you engage our services, you may provide us with access to third-party accounts and platforms (e.g., Google Business Profile, hosting accounts, social media accounts, analytics dashboards). By doing so, you represent that:

- You have the authority to grant such access.
- You will provide accurate and complete credentials.
- You understand we will access these accounts only as needed to perform the agreed services.
- You will revoke access upon conclusion of the service engagement if you wish to do so.

We are not responsible for changes made to your accounts by third parties, account suspensions by platform providers, or data loss resulting from platform outages outside our control.`,
  },
  {
    heading: '4. Intellectual Property',
    content: `**4.1 Our Intellectual Property**

All content on this website — including text, graphics, logos, icons, code, designs, and branding — is the property of Demand Signals and is protected by applicable copyright, trademark, and intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from our website content without prior written consent.

**4.2 Client Deliverables**

Custom deliverables created specifically for your business (e.g., website code, designs, content, reports) become your property upon full payment of all applicable fees, unless otherwise specified in your Service Agreement. We retain the right to showcase completed work in our portfolio unless you request otherwise in writing.

**4.3 AI-Generated Content**

Content produced using AI tools (including language models, image generators, and automation systems) as part of your service engagement is delivered to you under the same ownership terms as other deliverables. You are responsible for reviewing AI-generated content before publication and ensuring it complies with applicable laws, regulations, and platform policies.

**4.4 Open-Source and Third-Party Components**

Websites and applications we build may incorporate open-source libraries and third-party services (e.g., Next.js, React, Tailwind CSS, Vercel). These components are governed by their respective licenses. We will disclose major dependencies upon request.`,
  },
  {
    heading: '5. Payment Terms',
    content: `- Payment terms, amounts, and schedules are defined in your Service Agreement.
- Unless otherwise agreed, invoices are due within 15 days of issuance.
- Late payments may incur a fee of 1.5% per month on the outstanding balance.
- We reserve the right to pause or suspend services if payment is more than 30 days overdue.
- Refund policies, if applicable, are specified in individual Service Agreements.`,
  },
  {
    heading: '6. Service Level and Guarantees',
    content: `We commit to delivering high-quality work within agreed timelines. However:

- We do not guarantee specific search engine rankings, traffic volumes, or revenue outcomes. SEO, GEO, and AEO are influenced by many factors outside our control, including algorithm changes, competitor actions, and market conditions.
- Uptime and availability of websites we host are subject to the SLAs of the underlying hosting provider (e.g., Vercel, Cloudflare). We will communicate any known outages promptly.
- AI systems may produce imperfect outputs. We implement quality controls and review processes, but cannot guarantee that AI-generated content will be error-free in all cases.`,
  },
  {
    heading: '7. Acceptable Use',
    content: `You agree not to:

- Use our website or services for any unlawful purpose or in violation of any applicable laws.
- Submit false, misleading, or fraudulent information through our forms or during service engagements.
- Attempt to gain unauthorized access to our systems, networks, or other users' data.
- Scrape, crawl, or harvest content from our website using automated tools without written permission (search engine crawlers and AI training crawlers that respect our robots.txt are permitted).
- Interfere with or disrupt the operation of our website or services.
- Use our services to create content that is defamatory, obscene, or infringes on third-party rights.

We reserve the right to refuse or terminate service to anyone who violates these terms, at our sole discretion.`,
  },
  {
    heading: '8. Limitation of Liability',
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW:

- Demand Signals shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, business opportunities, or goodwill, arising from your use of our website or services.
- Our total aggregate liability for any claim arising under these Terms or any Service Agreement shall not exceed the total amount you paid to us in the 12 months preceding the claim.
- We are not liable for damages caused by third-party platforms, hosting providers, API services, or payment processors.`,
  },
  {
    heading: '9. Indemnification',
    content: `You agree to indemnify, defend, and hold harmless Demand Signals, its owners, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorney's fees) arising from: (a) your use of our website or services; (b) your breach of these Terms; (c) content you provide to us for publication; or (d) your violation of any third-party rights.`,
  },
  {
    heading: '10. Termination',
    content: `- **By you:** You may stop using our website at any time. For paid services, termination procedures are defined in your Service Agreement.
- **By us:** We may suspend or terminate your access to our website or services at any time for violation of these Terms, non-payment, or for any other lawful reason with reasonable notice.
- **Effect of termination:** Sections regarding intellectual property, limitation of liability, indemnification, and governing law survive termination.`,
  },
  {
    heading: '11. Dispute Resolution',
    content: `In the event of a dispute, the parties agree to first attempt resolution through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration administered by JAMS under its Streamlined Arbitration Rules, conducted in El Dorado County, California. The arbitrator's decision shall be final and enforceable in any court of competent jurisdiction.

**Class action waiver:** You agree that any dispute resolution will be conducted on an individual basis and not as a class, consolidated, or representative action.`,
  },
  {
    heading: '12. Governing Law',
    content: `These Terms are governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law principles. For any matters not subject to arbitration, the courts of El Dorado County, California shall have exclusive jurisdiction.`,
  },
  {
    heading: '13. Modifications to These Terms',
    content: `We reserve the right to update these Terms at any time. When we make material changes, we will update the "Last updated" date at the top of this page. Continued use of our website or services after changes constitutes acceptance of the revised Terms. For active service clients, material changes will be communicated via email.`,
  },
  {
    heading: '14. Severability',
    content: `If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect.`,
  },
  {
    heading: '15. Entire Agreement',
    content: `These Terms, together with our [Privacy Policy](${SITE_URL}/privacy) and any applicable Service Agreements, constitute the entire agreement between you and Demand Signals regarding your use of our website and services.`,
  },
  {
    heading: '16. Contact Us',
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
      '# Terms of Service — Demand Signals',
      '',
      'Last updated: April 7, 2026',
      '',
      '## Sections',
      '',
      headings,
      '',
      `**Full terms:** [Terms of Service](${SITE_URL}/terms)  `,
      `**Full markdown:** [Terms Feed (full)](${SITE_URL}/feeds/pages/terms?detail=full)`,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Terms of Service](${SITE_URL}/terms)  `,
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
      '# Terms of Service — Demand Signals',
      '',
      'Last updated: April 7, 2026',
      '',
      'These Terms of Service ("Terms") govern your access to and use of the Demand Signals website at demandsignals.co and any services provided by Demand Signals ("we," "us," or "our"). By accessing our website or engaging our services, you agree to these Terms. If you do not agree, do not use our website or services.',
      '',
      sectionsBlock,
      '',
      '---',
      '',
      `*[Demand Signals](${SITE_URL}) — AI-Powered Demand Generation*`,
      '',
      `**View on website:** [Terms of Service](${SITE_URL}/terms)  `,
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
