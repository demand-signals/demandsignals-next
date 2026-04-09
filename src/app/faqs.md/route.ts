import { getAllFaqSections, type FaqSection } from '@/lib/all-faqs'
import { feedHeaders, checkConditional, getDetailLevel, SITE_URL } from '@/lib/feed-utils'

function countFaqs(sections: FaqSection[]): number {
  let total = 0
  for (const section of sections) {
    total += section.faqs.length
    if (section.subsections) {
      total += countFaqs(section.subsections)
    }
  }
  return total
}

function renderSection(section: FaqSection, level: number, detail: 'summary' | 'full'): string {
  const heading = '#'.repeat(Math.min(level, 6))
  const lines: string[] = []

  lines.push(`${heading} ${section.title}`)
  lines.push('')
  lines.push(`**Page:** [${section.title}](${SITE_URL}${section.pagePath})`)
  lines.push('')

  if (detail === 'summary') {
    lines.push(`*${section.faqs.length} FAQs*`)
  } else {
    for (const faq of section.faqs) {
      lines.push(`${heading}# ${faq.question}`)
      lines.push('')
      lines.push(faq.answer)
      lines.push('')
      lines.push(`*Source: [${faq.sourceLabel}](${SITE_URL}${faq.sourcePage})*`)
      lines.push('')
    }
  }

  if (section.subsections) {
    for (const sub of section.subsections) {
      lines.push(renderSection(sub, level + 1, detail))
    }
  }

  return lines.join('\n')
}

export async function GET(request: Request) {
  const detail = getDetailLevel(request)
  const sections = getAllFaqSections()
  const totalFaqs = countFaqs(sections)

  // Table of contents
  const toc = sections.map(section => {
    const subCount = countFaqs([section])
    return `- [${section.title}](#${section.slug}) (${subCount} FAQs)`
  }).join('\n')

  const body = sections
    .map(section => renderSection(section, 2, detail))
    .join('\n\n---\n\n')

  const md = [
    '# Demand Signals \u2014 Complete FAQ Directory',
    '',
    `> ${totalFaqs} frequently asked questions across all services and categories.`,
    '',
    '## Table of Contents',
    '',
    toc,
    '',
    '---',
    '',
    body,
    '',
    '---',
    '',
    `**All services:** [Services Directory](${SITE_URL}/feeds/services.md)  `,
    `**Blog:** [Blog & News](${SITE_URL}/feeds/blog.md)  `,
    `**About:** [About Demand Signals](${SITE_URL}/feeds/about)  `,
    `**Contact:** [Get in Touch](${SITE_URL}/contact)  `,
    `**LLM Discovery:** [llms.txt](${SITE_URL}/llms.txt) | [llms-full.txt](${SITE_URL}/llms-full.txt)  `,
    `**Content API:** [content-index.json](${SITE_URL}/content-index.json)`,
  ].join('\n')

  const conditional = checkConditional(request, md)
  if (conditional) return conditional

  return new Response(md, {
    status: 200,
    headers: feedHeaders('text/markdown', md),
  })
}
