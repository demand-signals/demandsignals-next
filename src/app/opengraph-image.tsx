import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Demand Signals — AI-Powered Demand Generation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#080e1f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            color: '#52C9A0',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          DEMAND SIGNALS
        </div>
        <div
          style={{
            color: '#fff',
            fontSize: 64,
            fontWeight: 900,
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          AI-Powered Demand Generation
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 28,
            marginTop: 32,
            textAlign: 'center',
          }}
        >
          AI Agents · AI Websites · Local SEO · GEO
        </div>
        <div
          style={{
            background: '#FF6B2B',
            color: '#fff',
            padding: '12px 32px',
            borderRadius: 100,
            fontSize: 22,
            fontWeight: 700,
            marginTop: 48,
          }}
        >
          demandsignals.co
        </div>
      </div>
    ),
    size,
  )
}
