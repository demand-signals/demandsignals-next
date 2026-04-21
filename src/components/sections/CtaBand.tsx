'use client'

import { BOOKING_URL, CONTACT_EMAIL } from '@/lib/constants'

const DEFAULT_STEPS = [
  { n: '01', t: '5-min audit', d: 'We review your current stack live' },
  { n: '02', t: '3-pt roadmap', d: 'Tailored quick wins, emailed same-day' },
  { n: '03', t: 'Fixed quote', d: 'No retainers. Scoped. No surprises.' },
]

export default function CtaBand() {
  return (
    <section id="book" className="ds-cta">
      {/* Animated signal rings — decorative */}
      <div className="ds-cta__rings" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="ds-cta__ring"
            style={{ inset: `${i * 10}%`, animationDelay: `${i * 0.4}s` }}
          />
        ))}
        <div className="ds-cta__core" />
      </div>

      {/* Ambient gradient glows */}
      <div className="ds-cta__ambient" aria-hidden="true" />

      <div className="ds-cta__inner">
        <div className="ds-cta__content">
          <div className="ds-cta__eyebrow">
            <span className="ds-cta__dot" />
            <span className="ds-cta__eyebrow-text">15 MIN · FREE · NO OBLIGATION</span>
          </div>

          <h2 className="ds-cta__heading">
            Ready to become the{' '}
            <span className="ds-cta__emph">signal</span>
            {' '}in your market?
          </h2>

          <p className="ds-cta__body">
            Book a 15-minute call. We&apos;ll audit your current setup, show you what&apos;s broken, and give you a tailored roadmap. If we&apos;re not a fit, you&apos;ll know in the first 5 minutes.
          </p>

          <div className="ds-cta__steps">
            {DEFAULT_STEPS.map(s => (
              <div key={s.n} className="ds-cta__step">
                <div className="ds-cta__step-n">{s.n}</div>
                <div className="ds-cta__step-t">{s.t}</div>
                <div className="ds-cta__step-d">{s.d}</div>
              </div>
            ))}
          </div>

          <div className="ds-cta__buttons">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ds-cta__primary"
            >
              Book Your Free Call →
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="ds-cta__secondary">
              Email us instead
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .ds-cta {
          position: relative; overflow: hidden;
          padding: 112px 24px;
          background: linear-gradient(160deg, #0f1a2d 0%, #1e2740 60%, #252c3d 100%);
          color: #fff;
          font-family: var(--font-sans, 'Geist', system-ui, sans-serif);
        }
        .ds-cta__rings {
          position: absolute; top: 50%; right: -8%;
          transform: translateY(-50%);
          width: 720px; height: 720px;
          pointer-events: none;
        }
        .ds-cta__ring {
          position: absolute;
          border: 1px solid rgba(104, 197, 173, 0.2);
          border-radius: 50%;
          animation: ds-cta-ring 4s infinite ease-out;
        }
        .ds-cta__core {
          position: absolute; inset: 42%;
          border-radius: 50%;
          background: radial-gradient(circle, #52C9A0, #4fa894);
          box-shadow: 0 0 80px rgba(82, 201, 160, 0.6);
        }
        .ds-cta__ambient {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse at 10% 90%, rgba(255,107,43,0.15), transparent 50%),
            radial-gradient(ellipse at 70% 10%, rgba(74,127,229,0.1), transparent 50%);
        }
        .ds-cta__inner {
          position: relative; z-index: 2;
          max-width: 1200px; margin: 0 auto;
        }
        .ds-cta__content { max-width: 640px; }

        .ds-cta__eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 7px 16px;
          background: rgba(82,201,160,0.15);
          border: 1px solid rgba(82,201,160,0.3);
          border-radius: 100px;
          margin-bottom: 28px;
        }
        .ds-cta__dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #52c9a0; box-shadow: 0 0 10px #52c9a0;
          animation: ds-cta-pulse 2s infinite;
        }
        .ds-cta__eyebrow-text {
          color: #52C9A0; font-size: .8rem; font-weight: 700;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          letter-spacing: 0.05em;
        }

        .ds-cta__heading {
          font-size: clamp(2.2rem, 5vw, 3.6rem);
          font-weight: 900; line-height: 1.05;
          letter-spacing: -0.025em;
          margin: 0 0 24px;
        }
        .ds-cta__emph {
          background: linear-gradient(90deg, #52C9A0, #4A7FE5, #FF6B2B);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ds-cta__body {
          font-size: 1.15rem; color: rgba(255,255,255,0.7);
          max-width: 540px; margin: 0 0 36px; line-height: 1.6;
        }

        .ds-cta__steps {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; margin-bottom: 36px; max-width: 560px;
        }
        .ds-cta__step {
          padding: 16px 18px; border-radius: 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .ds-cta__step-n {
          font-size: .7rem; font-weight: 700; color: #52C9A0;
          letter-spacing: 0.08em; margin-bottom: 8px;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
        }
        .ds-cta__step-t { font-size: .95rem; font-weight: 700; margin-bottom: 4px; }
        .ds-cta__step-d { font-size: .8rem; color: rgba(255,255,255,0.6); line-height: 1.4; }

        .ds-cta__buttons { display: flex; gap: 14px; flex-wrap: wrap; }
        .ds-cta__primary {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 18px 36px; background: #ff6b2b; color: #fff;
          font-weight: 700; font-size: 1.05rem; border-radius: 100px;
          box-shadow: 0 12px 40px rgba(255,107,43,0.5);
          text-decoration: none;
          transition: transform .15s, box-shadow .15s;
        }
        .ds-cta__primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 48px rgba(255,107,43,0.6);
        }
        .ds-cta__secondary {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 17px 34px;
          border: 2px solid rgba(255,255,255,0.3);
          color: #fff; background: rgba(255,255,255,0.05);
          font-weight: 700; font-size: 1.05rem; border-radius: 100px;
          text-decoration: none;
        }

        @keyframes ds-cta-ring {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0;   }
        }
        @keyframes ds-cta-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.4); }
        }

        @media (max-width: 860px) {
          .ds-cta__steps { grid-template-columns: 1fr; }
          .ds-cta__rings { display: none; }
        }
      `}</style>
    </section>
  )
}
