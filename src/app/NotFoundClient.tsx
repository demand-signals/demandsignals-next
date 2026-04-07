'use client'

import Link from 'next/link'

export default function NotFoundClient() {
  return (
    <section className="retro-404">
      <style>{`
        .retro-404 {
          background: #0a0a2e;
          min-height: calc(100vh - 72px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px 80px;
          position: relative;
          overflow: hidden;
        }

        /* ── Scanline overlay ── */
        .retro-404::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.08) 2px,
            rgba(0, 0, 0, 0.08) 4px
          );
          pointer-events: none;
          z-index: 10;
        }

        /* ── Stars ── */
        .retro-stars {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .retro-star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: #fff;
          border-radius: 50%;
          animation: twinkle 3s ease-in-out infinite alternate;
        }
        @keyframes twinkle {
          0% { opacity: 0.2; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.5); }
        }

        /* ── Ground / launch pad ── */
        .retro-ground {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: linear-gradient(0deg, #1a0a3e 0%, transparent 100%);
          z-index: 1;
        }
        .retro-pad {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 220px;
          height: 8px;
          background: #333;
          border-radius: 4px;
          box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
          z-index: 2;
          animation: padFade 0.8s ease-out 2s forwards;
        }
        @keyframes padFade {
          to { opacity: 0; }
        }

        /* ── Ship container (handles the launch) ── */
        .retro-ship-wrap {
          position: absolute;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          will-change: transform, opacity;
          animation: shipShake 1.2s ease-in-out forwards, shipFly 2.3s cubic-bezier(0.4, 0, 0.2, 1) 1.2s forwards;
        }
        @keyframes shipShake {
          0%  { transform: translateX(-50%) translateY(0) scale(1); }
          10% { transform: translateX(-52%) translateY(0) scale(1); }
          20% { transform: translateX(-48%) translateY(0) scale(1); }
          30% { transform: translateX(-51%) translateY(-2px) scale(1); }
          40% { transform: translateX(-49%) translateY(-1px) scale(1); }
          50% { transform: translateX(-51%) translateY(-3px) scale(1); }
          60% { transform: translateX(-49%) translateY(-2px) scale(1); }
          70% { transform: translateX(-50.5%) translateY(-4px) scale(1); }
          80% { transform: translateX(-49.5%) translateY(-3px) scale(1); }
          90% { transform: translateX(-50%) translateY(-5px) scale(1); }
          100% { transform: translateX(-50%) translateY(-5px) scale(1); }
        }
        @keyframes shipFly {
          0%   { transform: translateX(-50%) translateY(-5px) scale(1); opacity: 1; }
          40%  { transform: translateX(-50%) translateY(-40vh) scale(0.6); opacity: 1; }
          70%  { transform: translateX(-50%) translateY(-60vh) scale(0.3); opacity: 1; }
          90%  { transform: translateX(-50%) translateY(-68vh) scale(0.1); opacity: 0.8; }
          100% { transform: translateX(-50%) translateY(-70vh) scale(0.03); opacity: 0; }
        }

        /* ── Flame ── */
        .retro-flame {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 80px;
          opacity: 0;
          animation: flameOn 3.5s ease-in forwards;
        }
        @keyframes flameOn {
          0%, 28% { opacity: 0; height: 0; }
          34% { opacity: 1; height: 60px; }
          55% { opacity: 1; height: 120px; }
          85% { opacity: 1; height: 150px; }
          95% { opacity: 0.5; height: 80px; }
          100% { opacity: 0; height: 0; }
        }

        /* ── Explosion ── */
        .retro-explosion {
          position: absolute;
          top: calc(30vh - 72px);
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          width: 200px;
          height: 200px;
          z-index: 5;
          animation: explode 0.8s ease-out 3.5s forwards;
        }
        @keyframes explode {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          30% { transform: translate(-50%, -50%) scale(2.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }

        /* ── Explosion particles ── */
        .retro-particle {
          position: absolute;
          top: calc(30vh - 72px);
          left: 50%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          opacity: 0;
          z-index: 5;
        }
        .retro-particle:nth-child(1) { background: #FF00FF; animation: particle 1s ease-out 3.5s forwards; --px: -80px; --py: -60px; }
        .retro-particle:nth-child(2) { background: #00FFFF; animation: particle 1s ease-out 3.55s forwards; --px: 70px; --py: -80px; }
        .retro-particle:nth-child(3) { background: #39FF14; animation: particle 1s ease-out 3.6s forwards; --px: -50px; --py: 40px; }
        .retro-particle:nth-child(4) { background: #FF6B2B; animation: particle 1s ease-out 3.5s forwards; --px: 90px; --py: 30px; }
        .retro-particle:nth-child(5) { background: #FF00FF; animation: particle 1s ease-out 3.55s forwards; --px: -100px; --py: -20px; }
        .retro-particle:nth-child(6) { background: #00FFFF; animation: particle 1s ease-out 3.6s forwards; --px: 40px; --py: -90px; }
        .retro-particle:nth-child(7) { background: #39FF14; animation: particle 1s ease-out 3.65s forwards; --px: -30px; --py: 70px; }
        .retro-particle:nth-child(8) { background: #FF6B2B; animation: particle 1s ease-out 3.5s forwards; --px: 60px; --py: 60px; }
        .retro-particle:nth-child(9) { background: #fff; animation: particle 1.2s ease-out 3.5s forwards; --px: -120px; --py: -40px; width: 4px; height: 4px; }
        .retro-particle:nth-child(10) { background: #fff; animation: particle 1.2s ease-out 3.55s forwards; --px: 110px; --py: -50px; width: 4px; height: 4px; }
        .retro-particle:nth-child(11) { background: #FF00FF; animation: particle 1.1s ease-out 3.6s forwards; --px: 0px; --py: -100px; width: 8px; height: 8px; }
        .retro-particle:nth-child(12) { background: #00FFFF; animation: particle 1.1s ease-out 3.55s forwards; --px: -70px; --py: 80px; width: 8px; height: 8px; }

        @keyframes particle {
          0% { opacity: 1; transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--px), var(--py)) scale(0); }
        }

        /* ── 404 text ── */
        .retro-404-text {
          position: relative;
          z-index: 6;
          font-size: clamp(5rem, 18vw, 12rem);
          font-weight: 900;
          line-height: 1;
          color: #fff;
          text-shadow:
            0 0 20px #FF00FF,
            0 0 40px #FF00FF,
            0 0 80px #FF00FF,
            0 0 120px rgba(255, 0, 255, 0.4);
          opacity: 0;
          transform: scale(2);
          animation: textReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 3.8s forwards;
          margin-bottom: 16px;
          letter-spacing: 0.05em;
        }
        @keyframes textReveal {
          0% { opacity: 0; transform: scale(2); filter: blur(20px); }
          50% { opacity: 1; filter: blur(4px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }

        /* Neon flicker on the 404 */
        .retro-404-text::after {
          content: '404';
          position: absolute;
          inset: 0;
          color: transparent;
          text-shadow:
            0 0 10px #00FFFF,
            0 0 30px rgba(0, 255, 255, 0.5);
          animation: flicker 4s ease-in-out 4.6s infinite;
        }
        @keyframes flicker {
          0%, 100% { opacity: 0; }
          4% { opacity: 1; }
          6% { opacity: 0.2; }
          8% { opacity: 1; }
          70% { opacity: 0; }
          72% { opacity: 0.6; }
          74% { opacity: 0; }
        }

        /* ── Subtitle ── */
        .retro-subtitle {
          position: relative;
          z-index: 6;
          color: #00FFFF;
          font-size: clamp(1.1rem, 3vw, 1.6rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
          opacity: 0;
          animation: fadeSlideUp 0.6s ease-out 4.2s forwards;
          margin-bottom: 12px;
        }

        .retro-subtext {
          position: relative;
          z-index: 6;
          color: #a0aec0;
          font-size: 1rem;
          line-height: 1.7;
          max-width: 480px;
          text-align: center;
          opacity: 0;
          animation: fadeSlideUp 0.6s ease-out 4.4s forwards;
          margin-bottom: 36px;
        }

        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* ── Nav links ── */
        .retro-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          position: relative;
          z-index: 6;
          opacity: 0;
          animation: fadeSlideUp 0.6s ease-out 4.6s forwards;
          margin-bottom: 24px;
        }
        .retro-nav a {
          display: inline-block;
          padding: 12px 24px;
          border-radius: 100px;
          border: 1.5px solid rgba(0, 255, 255, 0.3);
          color: #00FFFF;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .retro-nav a:hover {
          background: rgba(0, 255, 255, 0.1);
          border-color: #00FFFF;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
        }

        .retro-cta {
          position: relative;
          z-index: 6;
          display: inline-block;
          background: #FF6B2B;
          color: #fff;
          font-weight: 700;
          font-size: 1rem;
          padding: 14px 32px;
          border-radius: 100px;
          text-decoration: none;
          opacity: 0;
          animation: fadeSlideUp 0.6s ease-out 4.8s forwards;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .retro-cta:hover {
          box-shadow: 0 0 30px rgba(255, 107, 43, 0.4);
          transform: translateY(-2px);
        }
      `}</style>

      {/* Star field */}
      <div className="retro-stars">
        {Array.from({ length: 60 }, (_, i) => (
          <div
            key={i}
            className="retro-star"
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              animationDelay: `${(i * 0.31) % 3}s`,
              animationDuration: `${2 + (i % 3)}s`,
              width: i % 5 === 0 ? 3 : 2,
              height: i % 5 === 0 ? 3 : 2,
            }}
          />
        ))}
      </div>

      {/* Ground and launch pad */}
      <div className="retro-ground" />
      <div className="retro-pad" />

      {/* Ship */}
      <div className="retro-ship-wrap">
        <svg width="200" height="140" viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* UFO body (disc) */}
          <ellipse cx="40" cy="36" rx="38" ry="12" fill="#1a1a4e" stroke="#FF00FF" strokeWidth="2" />
          <ellipse cx="40" cy="36" rx="38" ry="12" fill="url(#bodyGrad)" opacity="0.6" />

          {/* Dome */}
          <path d="M24 36 Q24 12 40 8 Q56 12 56 36" fill="#0d0d3a" stroke="#00FFFF" strokeWidth="2" />
          <path d="M28 36 Q28 16 40 12 Q52 16 52 36" fill="rgba(0,255,255,0.05)" />

          {/* Dome window */}
          <ellipse cx="40" cy="22" rx="8" ry="6" fill="rgba(0,255,255,0.15)" stroke="#00FFFF" strokeWidth="1.5">
            <animate attributeName="fill" values="rgba(0,255,255,0.15);rgba(0,255,255,0.4);rgba(0,255,255,0.15)" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Lights around disc */}
          <circle cx="12" cy="38" r="3" fill="#39FF14">
            <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="26" cy="44" r="3" fill="#FF00FF">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="0.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="40" cy="47" r="3" fill="#00FFFF">
            <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="54" cy="44" r="3" fill="#FF6B2B">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="0.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="68" cy="38" r="3" fill="#39FF14">
            <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />
          </circle>

          {/* Landing legs */}
          <line x1="28" y1="46" x2="22" y2="56" stroke="#666" strokeWidth="2" strokeLinecap="round" />
          <line x1="52" y1="46" x2="58" y2="56" stroke="#666" strokeWidth="2" strokeLinecap="round" />

          <defs>
            <linearGradient id="bodyGrad" x1="2" y1="24" x2="78" y2="48">
              <stop offset="0%" stopColor="#FF00FF" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#0a0a2e" stopOpacity="0" />
              <stop offset="100%" stopColor="#00FFFF" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>

        {/* Flame */}
        <div className="retro-flame">
          <svg width="60" height="120" viewBox="0 0 30 80" fill="none">
            <path d="M15 0 Q20 20 25 40 Q20 60 15 80 Q10 60 5 40 Q10 20 15 0Z" fill="url(#flameGrad)">
              <animate attributeName="d" dur="0.15s" repeatCount="indefinite"
                values="M15 0 Q20 20 25 40 Q20 60 15 80 Q10 60 5 40 Q10 20 15 0Z;
                        M15 0 Q22 15 28 40 Q18 65 15 80 Q12 65 2 40 Q8 15 15 0Z;
                        M15 0 Q20 20 25 40 Q20 60 15 80 Q10 60 5 40 Q10 20 15 0Z" />
            </path>
            <defs>
              <linearGradient id="flameGrad" x1="15" y1="0" x2="15" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="20%" stopColor="#FFFF00" />
                <stop offset="50%" stopColor="#FF6B2B" />
                <stop offset="100%" stopColor="#FF00FF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Explosion burst */}
      <div className="retro-explosion">
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="30" fill="#FF00FF" opacity="0.6" />
          <circle cx="100" cy="100" r="60" fill="#FF00FF" opacity="0.3" />
          <circle cx="100" cy="100" r="90" fill="#00FFFF" opacity="0.1" />
          {/* Spikes */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30 * Math.PI) / 180
            const x1 = 100 + Math.cos(angle) * 20
            const y1 = 100 + Math.sin(angle) * 20
            const x2 = 100 + Math.cos(angle) * 95
            const y2 = 100 + Math.sin(angle) * 95
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={i % 3 === 0 ? '#FF00FF' : i % 3 === 1 ? '#00FFFF' : '#39FF14'}
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.7"
              />
            )
          })}
        </svg>
      </div>

      {/* Explosion particles */}
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="retro-particle" />
      ))}

      {/* 404 text */}
      <div className="retro-404-text" aria-label="404">404</div>

      {/* Subtitle */}
      <h1 className="retro-subtitle">Lost in Space</h1>
      <p className="retro-subtext">
        The page you&apos;re looking for has been abducted by aliens.
        Here are some helpful links to get you back to Earth.
      </p>

      {/* Nav links */}
      <div className="retro-nav">
        {[
          { label: 'Homepage', href: '/' },
          { label: 'Our Services', href: '/websites-apps' },
          { label: 'Blog', href: '/blog' },
          { label: 'Contact Us', href: '/contact' },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* CTA */}
      <Link href="/contact" className="retro-cta">
        Get in Touch
      </Link>
    </section>
  )
}
