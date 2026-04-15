import { buildMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'
import { AiStatusDashboard } from './AiStatusDashboard'

const faqs = [
  {
    question: 'What AI platforms does this status page monitor?',
    answer: 'We currently monitor Claude (Anthropic), ChatGPT (OpenAI), DeepSeek, and Google Gemini. We pull live data from each platform\'s official status API every 60 seconds. New platforms are added as AI adoption grows.',
  },
  {
    question: 'How often does the status data refresh?',
    answer: 'Status data refreshes automatically every 60 seconds. The API caches responses for 60 seconds to avoid hammering upstream providers while still giving you near-real-time visibility into outages.',
  },
  {
    question: 'Is ChatGPT down right now?',
    answer: 'Check the OpenAI card on this page for real-time status. Green means operational, yellow means degraded performance, orange means partial outage, and red means a major outage. Active incidents are shown with details and timestamps.',
  },
  {
    question: 'Is Claude AI down right now?',
    answer: 'Check the Anthropic card on this page for real-time Claude status. We monitor claude.ai, the Claude API, Claude Code, and Claude Cowork individually so you can see exactly which services are affected during an incident.',
  },
  {
    question: 'Why do you show a unified AI status page?',
    answer: 'When you depend on multiple AI platforms, checking four different status pages during an outage wastes time. Our unified dashboard shows every major AI provider on one screen with live polling, so you can instantly see what\'s down and switch to an alternative.',
  },
]

export const metadata = buildMetadata({
  title: 'AI Status Dashboard — Is ChatGPT, Claude, Gemini, or DeepSeek Down?',
  description: 'Live unified status page for all major AI platforms. Real-time monitoring of Claude, ChatGPT, Google Gemini, and DeepSeek uptime, outages, and incidents.',
  path: '/tools/ai-status',
})

export default function AiStatusPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Tools', url: '/tools' },
          { name: 'AI Status Dashboard', url: '/tools/ai-status' },
        ])}
      />
      <JsonLd data={faqSchema(faqs)} />

      <AiStatusDashboard faqs={faqs} />
    </>
  )
}
