import { type ReactNode } from 'react'

export const pillStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'rgba(104, 197, 173, 0.12)',
  color: 'var(--teal)',
  padding: '6px 18px',
  borderRadius: 100,
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
}

const gradientSpan: React.CSSProperties = {
  background: 'linear-gradient(135deg, #68c5ad, #4fa894)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

export function SectionHeading({
  eyebrow, heading, highlight, sub, dark,
}: {
  eyebrow: string
  heading: string
  highlight?: string
  sub?: ReactNode
  dark?: boolean
}) {
  const headingColor = dark ? '#fff' : 'var(--dark)'
  const subColor = dark ? 'rgba(255,255,255,0.55)' : 'var(--slate)'

  let headingContent: ReactNode = heading
  if (highlight && heading.includes(highlight)) {
    const parts = heading.split(highlight)
    headingContent = (
      <>
        {parts[0]}<span style={gradientSpan}>{highlight}</span>{parts[1]}
      </>
    )
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: 52 }}>
      <span style={pillStyle}>{eyebrow}</span>
      <h2 style={{ color: headingColor, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '14px 0 0', lineHeight: 1.2 }}>
        {headingContent}
      </h2>
      {sub && (
        <p style={{ color: subColor, fontSize: '1.05rem', lineHeight: 1.65, maxWidth: 600, margin: '16px auto 0' }}>
          {sub}
        </p>
      )}
    </div>
  )
}
