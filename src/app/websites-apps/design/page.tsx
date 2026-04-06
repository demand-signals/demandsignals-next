import { buildMetadata } from '@/lib/metadata'
import { ServicePageTemplate } from '@/components/templates/ServicePageTemplate'

export const metadata = buildMetadata({
  title:       'UI/UX Design — AI-Assisted Design Systems | Demand Signals',
  description: 'Figma-based design systems, high-fidelity UI, user research, and AI-assisted prototyping. Brand-consistent design that ships with your product.',
  path:        '/websites-apps/design',
  keywords:    ['UI UX design', 'Figma design systems', 'web design', 'AI-assisted design', 'design systems Sacramento'],
})

export default function DesignPage() {
  return (
    <ServicePageTemplate
      eyebrow="UI/UX Design"
      titleHtml={<><span style={{color:'#FF6B2B'}}>Design That Ships</span><br /><span style={{color:'#52C9A0'}}>Not Design That Sits.</span></>}
      subtitle="Figma design systems, AI-assisted prototyping, and dev-ready handoff. Every design we create is built to be implemented — not to win awards that don't convert."
      ctaLabel="Start My Design Project →"
      calloutHtml={<>Demand Signals designs for <span style={{color:'#52C9A0'}}>conversion, not awards</span> — because 94% of first impressions are design-related, and sites with consistent design systems see up to 33% faster development cycles from design to production code.</>}
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Websites & Apps', path: '/websites-apps' },
        { name: 'UI/UX Design', path: '/websites-apps/design' },
      ]}
      schemaName="UI/UX Design Services"
      schemaDescription="Figma-based design systems, AI-assisted prototyping, and dev-ready handoff for web and mobile applications."
      schemaUrl="/websites-apps/design"
      featuresHeading="Design That Converts"
      features={[
        { icon: '🎨', title: 'Design Systems', description: 'Complete Figma component libraries with consistent spacing, typography, color, and interaction patterns. Every element reusable, every variant documented.' },
        { icon: '📐', title: 'High-Fidelity UI', description: 'Pixel-perfect mockups for every screen and state. Not wireframes you still need to design — finished UI ready for development.' },
        { icon: '🧪', title: 'AI-Assisted Prototyping', description: 'AI generates layout variations, copy alternatives, and interaction patterns in minutes. More options explored, better decisions made, faster timelines.' },
        { icon: '📊', title: 'Conversion-Focused', description: 'Every design decision backed by conversion principles. CTA placement, visual hierarchy, trust signals, and user flow optimization built into the design — not added later.' },
        { icon: '📱', title: 'Responsive Design', description: 'Desktop, tablet, and mobile layouts designed as first-class citizens. Not desktop-first with mobile as an afterthought.' },
        { icon: '🔧', title: 'Dev-Ready Handoff', description: 'Figma files with proper auto-layout, component naming, and design tokens that map directly to Tailwind CSS classes. Developers can implement without guessing.' },
      ]}
      aiCalloutHeading="AI makes design faster — not cheaper."
      aiCalloutText="We use AI to explore more design directions in less time, generate copy variations, and prototype interactions rapidly. The result isn't a cheaper design — it's a better one, because we test more options and make better decisions in the same timeline."
      faqs={[
        { question: 'Do you design for both web and mobile?', answer: 'Yes. Every design project includes responsive layouts for desktop, tablet, and mobile. For mobile apps, we design native iOS and Android patterns that feel platform-appropriate while maintaining brand consistency.' },
        { question: 'Can you work with our existing brand guidelines?', answer: 'Absolutely. We build design systems that extend your existing brand — matching colors, typography, voice, and visual style. If you don\'t have brand guidelines, we\'ll establish them as part of the design process.' },
        { question: 'Do you only design, or do you also build?', answer: 'We do both. Most clients hire us to design AND build — the handoff is seamless because the same team handles both. But if you have your own development team, we deliver Figma files with complete specs and design tokens ready for implementation.' },
        { question: 'How many design revisions are included?', answer: 'We work iteratively — showing you designs early and refining based on feedback. Typically 2-3 rounds of revision per screen. The AI-assisted process means revisions happen faster because we can generate alternatives quickly.' },
      ]}
      ctaHeading="Ready for Design That Actually Converts?"
      ctaText="Tell us about your project and we'll scope a design approach that fits your brand, your users, and your timeline."
      ctaPrimaryLabel="Start My Design →"
      serviceCategory="websites-apps"
    />
  )
}
