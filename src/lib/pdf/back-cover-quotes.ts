// Rotating quote pool for the back cover of SOW PDFs.
//
// Selection is deterministic per SOW (seeded on sow_number) so the same
// SOW always renders the same quote across re-renders. Different SOWs
// get different quotes naturally because the seed differs. This avoids
// the "client comparing v1 and v2 of the same SOW sees different quotes
// and gets confused" failure mode that pure random would create.
//
// Hunter-curated list, 2026-04-29.

export interface BackCoverQuote {
  text: string
  author: string
}

export const BACK_COVER_QUOTES: BackCoverQuote[] = [
  { text: 'The secret of getting ahead is getting started. The secret of getting started is breaking your complex overwhelming tasks into small manageable tasks and starting on the first one.', author: 'Mark Twain' },
  { text: 'Believe in yourself. You are braver than you think, more talented than you know, and capable of more than you imagine.', author: 'Roy T. Bennett' },
  { text: 'What would life be if we had no courage to attempt anything?', author: 'Vincent Van Gogh' },
  { text: 'Optimism is the faith that leads to achievement; nothing can be done without hope.', author: 'Helen Keller' },
  { text: 'What you do makes a difference, and you have to decide what kind of difference you want to make.', author: 'Jane Goodall' },
  { text: 'You never change your life until you step out of your comfort zone; change begins at the end of your comfort zone.', author: 'Roy T. Bennett' },
  { text: 'You cannot wait for inspiration. You have to go after it with a club.', author: 'Jack London' },
  { text: 'Always do your best. What you plant now, you will harvest tomorrow.', author: 'Og Mandino' },
  { text: 'Motivation will almost always beat mere talent.', author: 'Norman Ralph Augustine' },
  { text: 'Act as if what you do makes a difference. It does.', author: 'William James' },
  { text: 'You will attract way more buyers if you are offering to teach them something of value to them than you will ever attract by simply trying to sell them your product or service.', author: 'Chet Holmes' },
  { text: 'I like to think of sales as the ability to gracefully persuade, not manipulate, a person or persons into a win-win situation.', author: 'Bo Bennett' },
  { text: 'Setting goals is the first step in turning the invisible into the visible.', author: 'Tony Robbins' },
  { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  { text: 'Quality performance starts with a positive attitude.', author: 'Jeffrey Gitomer' },
  { text: 'You cannot cross the sea merely by standing and staring at the water.', author: 'Rabindranath Tagore' },
  { text: 'Begin by always expecting good things to happen.', author: 'Tom Hopkins' },
  { text: 'No matter what happens, or how bad it seems today, life does go on, and it will be better tomorrow.', author: 'Maya Angelou' },
  { text: 'You miss 100% of the shots you do not take.', author: 'Wayne Gretzky' },
  { text: 'Risks must be taken because the greatest hazard in life is to risk nothing.', author: 'Leo F. Buscaglia' },
  { text: 'All the effort in the world would not matter if you are not inspired.', author: 'Chuck Palahniuk' },
  { text: 'Opportunities do not happen. You create them.', author: 'Chris Grosser' },
  { text: 'Winning isn’t everything, but wanting to win is.', author: 'Vince Lombardi' },
  { text: 'Tough times never last, but tough people do.', author: 'Robert Schuller' },
  { text: 'The scalable, profitable strategy is to change the game, not to become the most average.', author: 'Seth Godin' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'I am who I am today because of the choices I made yesterday.', author: 'Eleanor Roosevelt' },
  { text: 'When you do something, put your heart into it. Give it everything you have got — then relax! Concentrated attention and effort, then relaxing, became a habit with me.', author: 'William Clement Stone' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Ryun' },
  { text: 'The most unprofitable item ever manufactured is an excuse.', author: 'John Mason' },
  { text: 'Striving for success without hard work is like trying to harvest where you have not planted.', author: 'David Bly' },
  { text: 'There is no substitute for hard work.', author: 'Thomas A. Edison' },
  { text: 'Take up one idea. Make that one idea your life — think of it, dream of it, live on that idea. Let the brain, muscles, nerves, every part of your body, be full of that idea, and just leave every other idea alone. This is the way to success.', author: 'Swami Vivekananda' },
  { text: 'The vision of a champion is bent over, drenched in sweat, at the point of exhaustion when nobody else is looking.', author: 'Mia Hamm' },
  { text: 'Today is always the most productive day of your week.', author: 'Mark Hunter' },
  { text: 'I am only one, but still I am one. I cannot do everything, but still I can do something; and because I cannot do everything, I will not refuse to do something that I can do.', author: 'Helen Keller' },
  { text: 'Winners embrace hard work. They love the discipline of it, the trade-off they are making to win. Losers, on the other hand, see it as punishment. And that is the difference.', author: 'Lou Holtz' },
  { text: 'A goal is a dream with a deadline.', author: 'Napoleon Hill' },
  { text: 'You have to learn to keep your eyes on an ultimate goal. If you lose sight of that goal, you have to get out.', author: 'Hamdi Ulukaya' },
  { text: 'Desire is the key to motivation, but it is determination and commitment to an unrelenting pursuit of your goal — a commitment to excellence — that will enable you to attain the success you seek.', author: 'Mario Andretti' },
  { text: 'Great things are not done by impulse, but by a series of small things brought together.', author: 'Vincent Van Gogh' },
  { text: 'Sales success comes after you stretch yourself past your limits on a daily basis.', author: 'Omar Periu' },
  { text: 'If you are not taking care of your customer, your competitor will.', author: 'Bob Hooey' },
  { text: 'Failure will never overtake me if my determination to succeed is strong enough.', author: 'Og Mandino' },
  { text: 'Do not settle for average. Bring your best to the moment. Then, whether it fails or succeeds, at least you know you gave all you had. We need to live the best that is in us.', author: 'Angela Bassett' },
  { text: 'When you are at the end of your rope, tie a knot and hold on.', author: 'Theodore Roosevelt' },
  { text: 'When the going gets tough, put one foot in front of the other and just keep going. Do not give up.', author: 'Roy T. Bennett' },
  { text: 'Take the stones people throw at you. And use them to build a monument.', author: 'Ratan Tata' },
  { text: 'Success is the ability to go from failure to failure without losing your enthusiasm.', author: 'Zig Ziglar' },
  { text: 'Sales is an outcome, not a goal. It is a function of doing numerous things right, starting from the moment you target a potential prospect until you finalize the deal.', author: 'Jill Konrath' },
  { text: 'A pessimist sees the difficulty in every opportunity; an optimist sees the opportunity in every difficulty.', author: 'Winston Churchill' },
  { text: 'Refuse to attach a negative meaning to the word "no." View it as feedback. "No" tells you to change your approach, create more value or try again later.', author: 'Anthony Iannarino' },
  { text: 'Often when you think you are at the end of something, you are at the beginning of something else.', author: 'Fred Rogers' },
  { text: 'Wanting something is not enough. You must hunger for it. Your motivation must be absolutely compelling in order to overcome the obstacles that will invariably come your way.', author: 'Les Brown' },
  { text: 'Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time.', author: 'Thomas Edison' },
  { text: 'You have to learn to take rejection not as an indication of personal failing but as a wrong address.', author: 'Ray Bradbury' },
  { text: 'The key to realizing a dream is to focus not on success but on significance — and then even the small steps and little victories along your path will take on greater meaning.', author: 'Oprah Winfrey' },
  { text: 'Do not be afraid to give up the good to go for the great.', author: 'John D. Rockefeller' },
]

/**
 * Deterministic FNV-1a 32-bit hash. Same input → same output.
 * Used to pick a stable quote per sow_number across re-renders.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * Pick a back-cover quote for a SOW. Stable per seed (use sow_number)
 * so re-rendering the same SOW always shows the same quote.
 *
 * Sentinel: if seed matches `quote:N` (where N is a non-negative integer
 * less than BACK_COVER_QUOTES.length), short-circuit the hash and return
 * BACK_COVER_QUOTES[N] directly. Used by the admin SOW editor's "Pick a
 * quote" modal to lock in a specific quote regardless of seed math.
 *
 * Out-of-range or malformed `quote:` sentinels fall through to the hash
 * path so a typo never crashes the PDF render.
 */
export function pickBackCoverQuote(seed: string): BackCoverQuote {
  if (!seed) return BACK_COVER_QUOTES[0]

  // Direct-pick sentinel.
  const m = seed.match(/^quote:(\d+)$/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (Number.isInteger(n) && n >= 0 && n < BACK_COVER_QUOTES.length) {
      return BACK_COVER_QUOTES[n]
    }
    // Fall through on out-of-range.
  }

  const idx = fnv1a(seed) % BACK_COVER_QUOTES.length
  return BACK_COVER_QUOTES[idx]
}

/**
 * Reverse-lookup: given a quote object, find its index. Used by the
 * admin SOW editor to show "Quote #N of M" labelling. Returns -1 if
 * not in the catalog (shouldn't happen in practice).
 */
export function findBackCoverQuoteIndex(q: BackCoverQuote): number {
  return BACK_COVER_QUOTES.findIndex((c) => c.text === q.text && c.author === q.author)
}
