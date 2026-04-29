// Deterministic pre-parser for the first user message on /quote.
//
// When a prospect answers the opener with a single utterance like:
//   "Demand Signals in El Dorado Hills"
//   "Acme Plumbing, Folsom"
//   "ABC Roofing located in Sacramento"
// the AI was extracting business_name but ignoring the location, then
// re-asking for the business name. That's the bug.
//
// This module runs BEFORE the AI sees the message and pulls both fields
// in one pass. Capture-as-we-go: if it parses, we update the session
// before the AI invocation so the AI's dynamic context already shows
// both slots filled.
//
// Conservative on purpose. Anything ambiguous falls through to the AI.

export interface ExtractedIntro {
  businessName?: string
  location?: string
}

const PATTERNS: RegExp[] = [
  // "Acme located in Folsom" / "Acme based in Folsom" / "Acme out of Folsom"
  /^(.+?)\s+(?:located\s+in|based\s+in|out\s+of)\s+(.+?)\.?\s*$/i,
  // "Acme in Folsom" — common conversational form
  /^(.+?)\s+in\s+(.+?)\.?\s*$/i,
  // "Acme, Folsom" / "Acme, Folsom CA"
  /^(.+?),\s+(.+?)\.?\s*$/,
]

const LOCATION_STOPWORDS = new Set([
  'business',
  'biz',
  'company',
  'shop',
  'store',
  'service',
  'services',
  'team',
  'group',
  'agency',
  'studio',
  'office',
  'office space',
  'general',
])

const NAME_MIN_LEN = 2
const NAME_MAX_LEN = 80
const LOCATION_MIN_LEN = 2
const LOCATION_MAX_LEN = 80

export function extractNameAndLocation(rawText: string): ExtractedIntro {
  const text = rawText.trim()
  if (text.length < 5 || text.length > 200) return {}

  // Reject obvious non-answers up front.
  // "yes", "no", "what", "I'm a gardener" — let the AI handle those.
  if (/^(yes|no|sure|ok|okay|hey|hi|hello)\b/i.test(text)) return {}
  // If it starts with a verb pattern ("we are", "I am", "we do"), it's
  // describing the business not naming + locating it.
  if (/^(?:we\s+(?:are|do|sell|build|run|offer)|i'?m|i\s+am|we'?re)\b/i.test(text)) return {}

  for (const pattern of PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue
    const candidateName = match[1].trim()
    const candidateLocation = match[2].trim()

    if (
      candidateName.length < NAME_MIN_LEN ||
      candidateName.length > NAME_MAX_LEN ||
      candidateLocation.length < LOCATION_MIN_LEN ||
      candidateLocation.length > LOCATION_MAX_LEN
    ) {
      continue
    }

    // Reject if the "location" is actually a stopword (e.g. "Acme in business")
    if (LOCATION_STOPWORDS.has(candidateLocation.toLowerCase())) continue

    // Reject if the location starts with an article (probably a phrase, not a place)
    if (/^(?:the|a|an)\s+/i.test(candidateLocation)) continue

    return {
      businessName: candidateName,
      location: candidateLocation,
    }
  }

  return {}
}
