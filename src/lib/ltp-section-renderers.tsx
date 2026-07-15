import { type LtpSection } from '@/lib/ltp-page-configs'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal'

export function renderCustomSection(section: LtpSection, idx: number, catColor: string) {
  const bgs = ['var(--light)', '#fff', 'var(--dark)'] as const
  const bg = bgs[idx % 3]
  const dark = bg === 'var(--dark)'
  const h = dark ? '#fff' : 'var(--dark)'
  const p = dark ? 'rgba(255,255,255,0.65)' : 'var(--slate)'
  const cBg = dark ? 'rgba(255,255,255,0.04)' : idx % 3 === 1 ? 'var(--light)' : '#fff'
  const cBd = dark ? 'rgba(255,255,255,0.08)' : 'var(--border)'

  const variant = (section as LtpSection & { variant?: 'a' | 'b' | 'c' | 'd' }).variant ?? 'a'

  switch (section.type) {
    case 'market-snapshot': {
      switch (variant) {
        case 'a':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
                  {section.stats.map((s, i) => (
                    <StaggerItem key={i}>
                      <div style={{ background: cBg, border: `1px solid ${cBd}`, borderRadius: 16, padding: '28px 24px', textAlign: 'center', height: '100%' }}>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: catColor, lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
                        <div style={{ fontWeight: 700, color: h, fontSize: '0.95rem', marginBottom: 6 }}>{s.label}</div>
                        <div style={{ color: p, fontSize: '0.85rem', lineHeight: 1.5 }}>{s.detail}</div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </section>
          )

        case 'b':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px 0' }}>
                  {section.stats.map((s, i) => (
                    <ScrollReveal key={i} direction="up" delay={i * 0.08}>
                      <div style={{ display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ textAlign: 'center', padding: '0 clamp(16px, 3vw, 40px)' }}>
                          <div style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 800, color: catColor, lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
                          <div style={{ fontWeight: 600, color: h, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                        </div>
                        {i < section.stats.length - 1 && (
                          <div style={{ width: 1, background: cBd, alignSelf: 'stretch', flexShrink: 0 }} />
                        )}
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        case 'c': {
          const [hero, ...rest] = section.stats
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <ScrollReveal direction="up">
                  <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 900, color: catColor, lineHeight: 1, marginBottom: 12 }}>{hero.value}</div>
                    <div style={{ fontWeight: 700, color: h, fontSize: 'clamp(1rem, 2vw, 1.4rem)', marginBottom: 8 }}>{hero.label}</div>
                    <div style={{ color: p, fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>{hero.detail}</div>
                  </div>
                </ScrollReveal>
                {rest.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px 32px', borderTop: `1px solid ${cBd}`, paddingTop: 24 }}>
                    {rest.map((s, i) => (
                      <ScrollReveal key={i} direction="up" delay={i * 0.1}>
                        <div style={{ textAlign: 'center', minWidth: 120 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: catColor, marginBottom: 2 }}>{s.value}</div>
                          <div style={{ color: p, fontSize: '0.75rem', fontWeight: 600 }}>{s.label}</div>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        }

        case 'd':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {section.stats.map((s, i) => (
                      <ScrollReveal key={i} direction="left" delay={i * 0.08}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                          <div style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, color: catColor, lineHeight: 1, minWidth: 'fit-content' }}>{s.value}</div>
                          <div style={{ fontWeight: 700, color: h, fontSize: '1rem' }}>{s.label}</div>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                  <ScrollReveal direction="right">
                    <div style={{ background: dark ? 'rgba(255,255,255,0.03)' : `${catColor}08`, borderRadius: 16, padding: '28px 24px', border: `1px solid ${cBd}` }}>
                      <div style={{ color: p, fontSize: '0.95rem', lineHeight: 1.8 }}>
                        {section.stats.filter(s => s.detail).map((s, i) => (
                          <span key={i}>{s.detail}{i < section.stats.filter(x => x.detail).length - 1 ? ' ' : ''}</span>
                        ))}
                      </div>
                    </div>
                  </ScrollReveal>
                </div>
              </div>
            </section>
          )

        default:
          return null
      }
    }

    case 'local-context': {
      switch (variant) {
        case 'a':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 800, color: h, marginBottom: 24, lineHeight: 1.3 }}>
                    {section.headline}
                  </h2>
                  {section.paragraphs.map((para, i) => (
                    <p key={i} style={{ color: p, fontSize: '1.05rem', lineHeight: 1.8, marginBottom: i < section.paragraphs.length - 1 ? 20 : 0 }}>
                      {para}
                    </p>
                  ))}
                </ScrollReveal>
              </div>
            </section>
          )

        case 'b': {
          const leftPara = section.paragraphs[0] ?? ''
          const rightContent = section.paragraphs.length > 1
            ? section.paragraphs[1]
            : leftPara.split(/(?<=\.)\s+/)[0] ?? leftPara
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 800, color: h, marginBottom: 40, lineHeight: 1.3 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'start' }}>
                  <ScrollReveal direction="left">
                    <div>
                      {section.paragraphs.slice(0, section.paragraphs.length > 1 ? 1 : undefined).map((para, i) => (
                        <p key={i} style={{ color: p, fontSize: '1.05rem', lineHeight: 1.8, margin: 0 }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </ScrollReveal>
                  <ScrollReveal direction="right">
                    <div style={{ borderLeft: `4px solid ${catColor}`, paddingLeft: 24, background: dark ? 'rgba(255,255,255,0.02)' : `${catColor}06`, borderRadius: '0 12px 12px 0', padding: '24px 24px 24px 28px' }}>
                      <p style={{ color: h, fontSize: '1.3rem', lineHeight: 1.6, fontStyle: 'italic', fontWeight: 500, margin: 0 }}>
                        {rightContent}
                      </p>
                    </div>
                  </ScrollReveal>
                </div>
              </div>
            </section>
          )
        }

        case 'c':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 800, color: h, marginBottom: 32, lineHeight: 1.3, textAlign: 'left' }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <div style={{ borderLeft: `6px solid ${catColor}`, paddingLeft: 32 }}>
                  {section.paragraphs.map((para, i) => (
                    <ScrollReveal key={i} direction="left" delay={i * 0.1}>
                      <p style={{ color: p, fontSize: '1.1rem', lineHeight: 1.85, marginBottom: i < section.paragraphs.length - 1 ? 24 : 0, textAlign: 'left' }}>
                        {para}
                      </p>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        case 'd':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 800, color: h, marginBottom: 32, lineHeight: 1.3, textAlign: 'center' }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {section.paragraphs.map((para, i) => (
                    <StaggerItem key={i}>
                      <div style={{ background: cBg, border: `1px solid ${cBd}`, borderRadius: 16, padding: '24px 28px' }}>
                        <p style={{ color: p, fontSize: '1.02rem', lineHeight: 1.8, margin: 0 }}>
                          {para}
                        </p>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </section>
          )

        default:
          return null
      }
    }

    case 'service-deep-dive': {
      switch (variant) {
        case 'a':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 660, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                  {section.features.map((f, i) => (
                    <StaggerItem key={i}>
                      <div style={{ background: cBg, border: `1px solid ${cBd}`, borderRadius: 16, padding: '28px 24px', height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ background: catColor, color: '#fff', fontWeight: 800, borderRadius: 8, width: 32, height: 32, minWidth: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                            {i + 1}
                          </div>
                          <h3 style={{ color: h, fontWeight: 700, fontSize: '1.05rem', margin: 0, lineHeight: 1.3 }}>{f.title}</h3>
                        </div>
                        <p style={{ color: p, fontSize: '0.92rem', lineHeight: 1.65, margin: 0 }}>{f.description}</p>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </section>
          )

        case 'b':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 660, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {section.features.map((f, i) => (
                    <ScrollReveal key={i} direction={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.08}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, padding: '28px 0', borderBottom: i < section.features.length - 1 ? `1px solid ${cBd}` : 'none', alignItems: 'center' }}>
                        {i % 2 === 0 ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: catColor }}>{String(i + 1).padStart(2, '0')}</span>
                              <h3 style={{ color: h, fontWeight: 700, fontSize: '1.1rem', margin: 0, lineHeight: 1.3 }}>{f.title}</h3>
                            </div>
                            <p style={{ color: p, fontSize: '0.92rem', lineHeight: 1.65, margin: 0, textAlign: 'right' }}>{f.description}</p>
                          </>
                        ) : (
                          <>
                            <p style={{ color: p, fontSize: '0.92rem', lineHeight: 1.65, margin: 0 }}>{f.description}</p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'flex-end' }}>
                              <h3 style={{ color: h, fontWeight: 700, fontSize: '1.1rem', margin: 0, lineHeight: 1.3 }}>{f.title}</h3>
                              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: catColor }}>{String(i + 1).padStart(2, '0')}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        case 'c':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ color: p, fontSize: '1.05rem', maxWidth: 660, margin: '0 0 40px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {section.features.map((f, i) => (
                    <ScrollReveal key={i} direction="left" delay={i * 0.08}>
                      <div style={{ display: 'flex', gap: 20, padding: '20px 0', borderBottom: i < section.features.length - 1 ? `1px solid ${cBd}` : 'none', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: catColor, opacity: 0.8, lineHeight: 1, minWidth: 60, textAlign: 'center' }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <h3 style={{ color: h, fontWeight: 700, fontSize: '1.05rem', margin: '0 0 4px', lineHeight: 1.3, display: 'inline' }}>{f.title}</h3>
                          <p style={{ color: p, fontSize: '0.88rem', lineHeight: 1.6, margin: '6px 0 0' }}>{f.description}</p>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        case 'd': {
          const pairs: Array<{ title: string; description: string }[]> = []
          for (let i = 0; i < section.features.length; i += 2) {
            pairs.push(section.features.slice(i, i + 2))
          }
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 660, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 28 }}>
                  {pairs.map((pair, pi) => (
                    <StaggerItem key={pi}>
                      <div style={{ background: cBg, border: `1px solid ${cBd}`, borderRadius: 16, padding: '0', overflow: 'hidden', height: '100%' }}>
                        {pair.map((f, fi) => {
                          const globalIdx = pi * 2 + fi
                          return (
                            <div key={fi} style={{ padding: '24px 28px', borderTop: fi > 0 ? `1px solid ${cBd}` : 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: catColor }}>{String(globalIdx + 1).padStart(2, '0')}</span>
                                <h3 style={{ color: h, fontWeight: 700, fontSize: '1rem', margin: 0, lineHeight: 1.3 }}>{f.title}</h3>
                              </div>
                              <p style={{ color: p, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{f.description}</p>
                            </div>
                          )
                        })}
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </section>
          )
        }

        default:
          return null
      }
    }

    case 'competitive-edge': {
      switch (variant) {
        case 'a':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${cBd}`, minWidth: 500 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div style={{ background: catColor, color: '#fff', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '14px 20px' }}>
                        Demand Signals
                      </div>
                      <div style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb', color: dark ? 'rgba(255,255,255,0.7)' : '#6b7280', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '14px 20px' }}>
                        Generic Agencies
                      </div>
                    </div>
                    {section.advantages.map((a, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <div style={{ padding: '16px 20px', borderTop: `1px solid ${cBd}`, background: dark ? 'rgba(82,201,160,0.06)' : 'rgba(82,201,160,0.05)', color: h, fontSize: '0.92rem', lineHeight: 1.5 }}>
                          <span style={{ color: '#52C9A0', marginRight: 8, fontWeight: 700 }}>&#10003;</span>{a.ours}
                        </div>
                        <div style={{ padding: '16px 20px', borderTop: `1px solid ${cBd}`, background: dark ? 'rgba(255,255,255,0.02)' : '#f9fafb', color: p, fontSize: '0.92rem', lineHeight: 1.5 }}>
                          <span style={{ marginRight: 8, opacity: 0.5 }}>&#10007;</span>{a.theirs}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )

        case 'b':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                  {section.advantages.map((a, i) => (
                    <StaggerItem key={i}>
                      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${cBd}`, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: dark ? 'rgba(82,201,160,0.06)' : `${catColor}08`, padding: '20px 24px', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ color: '#52C9A0', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>&#10003;</span>
                            <span style={{ color: h, fontSize: '0.92rem', lineHeight: 1.55 }}>{a.ours}</span>
                          </div>
                        </div>
                        <div style={{ height: 1, background: cBd }} />
                        <div style={{ background: dark ? 'rgba(255,255,255,0.02)' : '#f9fafb', padding: '20px 24px', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ opacity: 0.4, fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>&#10007;</span>
                            <span style={{ color: p, fontSize: '0.92rem', lineHeight: 1.55 }}>{a.theirs}</span>
                          </div>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </section>
          )

        case 'c':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
                  <ScrollReveal direction="left">
                    <div style={{ borderTop: `4px solid ${catColor}`, borderRadius: 16, background: cBg, border: `1px solid ${cBd}`, borderTopWidth: 4, borderTopColor: catColor, borderTopStyle: 'solid', padding: '28px 24px', height: '100%' }}>
                      <h3 style={{ color: catColor, fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Demand Signals</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {section.advantages.map((a, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: h, fontSize: '0.92rem', lineHeight: 1.55 }}>
                            <span style={{ color: '#52C9A0', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
                            {a.ours}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </ScrollReveal>
                  <ScrollReveal direction="right">
                    <div style={{ borderTop: `4px solid ${dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, borderRadius: 16, background: dark ? 'rgba(255,255,255,0.02)' : '#f9fafb', border: `1px solid ${cBd}`, borderTopWidth: 4, borderTopColor: dark ? 'rgba(255,255,255,0.15)' : '#d1d5db', borderTopStyle: 'solid', padding: '28px 24px', height: '100%' }}>
                      <h3 style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#9ca3af', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Generic Agencies</h3>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {section.advantages.map((a, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: p, fontSize: '0.92rem', lineHeight: 1.55 }}>
                            <span style={{ opacity: 0.4, fontWeight: 700, flexShrink: 0 }}>&#10007;</span>
                            {a.theirs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </ScrollReveal>
                </div>
              </div>
            </section>
          )

        case 'd':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  {section.advantages.map((a, i) => (
                    <ScrollReveal key={i} direction="up" delay={i * 0.1}>
                      <div>
                        <div style={{ color: p, fontSize: '0.92rem', lineHeight: 1.55, textDecoration: 'line-through', opacity: 0.5, marginBottom: 8, paddingLeft: 28 }}>
                          <span style={{ marginRight: 8, textDecoration: 'none', display: 'inline-block' }}>&#10007;</span>{a.theirs}
                        </div>
                        <div style={{ color: h, fontSize: '0.95rem', lineHeight: 1.55, fontWeight: 600, paddingLeft: 28 }}>
                          <span style={{ color: '#52C9A0', marginRight: 8, fontWeight: 700 }}>&#10003;</span>{a.ours}
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        default:
          return null
      }
    }

    case 'process-flow': {
      switch (variant) {
        case 'a':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {section.steps.map((s, i) => (
                    <ScrollReveal key={i} direction="left" delay={i * 0.1}>
                      <div style={{ display: 'flex', gap: 24, padding: '28px 0', borderBottom: i < section.steps.length - 1 ? `1px solid ${cBd}` : 'none' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: catColor, minWidth: 48, textAlign: 'center', lineHeight: 1 }}>
                          {s.number}
                        </div>
                        <div>
                          <h3 style={{ color: h, fontWeight: 700, fontSize: '1.1rem', margin: '0 0 8px', lineHeight: 1.3 }}>{s.title}</h3>
                          <p style={{ color: p, fontSize: '0.92rem', lineHeight: 1.65, margin: 0 }}>{s.detail}</p>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        case 'b':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap', gap: '24px 0' }}>
                  {section.steps.map((s, i) => (
                    <ScrollReveal key={i} direction="up" delay={i * 0.1}>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ background: cBg, border: `1px solid ${cBd}`, borderRadius: 16, padding: '24px 20px', minWidth: 180, maxWidth: 220, textAlign: 'center' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: catColor, color: '#fff', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                            {s.number}
                          </div>
                          <h3 style={{ color: h, fontWeight: 700, fontSize: '0.95rem', margin: '0 0 8px', lineHeight: 1.3 }}>{s.title}</h3>
                          <p style={{ color: p, fontSize: '0.82rem', lineHeight: 1.55, margin: 0 }}>{s.detail}</p>
                        </div>
                        {i < section.steps.length - 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', padding: '40px 8px 0', color: catColor, fontSize: '1.5rem', fontWeight: 300, userSelect: 'none' }} className="process-flow-arrow">
                            &#8594;
                          </div>
                        )}
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        case 'c':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <div style={{ position: 'relative', paddingLeft: 40, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: catColor }} />
                  {section.steps.map((s, i) => (
                    <ScrollReveal key={i} direction={i % 2 === 0 ? 'left' : 'right'} delay={i * 0.1}>
                      <div style={{ position: 'relative', marginBottom: i < section.steps.length - 1 ? 40 : 0, marginLeft: i % 2 === 0 ? 0 : 'clamp(20px, 8vw, 60px)' }}>
                        <div style={{ position: 'absolute', left: i % 2 === 0 ? -40 : `calc(-40px - clamp(20px, 8vw, 60px))`, top: 4, width: 32, height: 32, borderRadius: '50%', background: catColor, color: '#fff', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {s.number}
                        </div>
                        <h3 style={{ color: h, fontWeight: 700, fontSize: '1.05rem', margin: '0 0 6px', lineHeight: 1.3 }}>{s.title}</h3>
                        <p style={{ color: p, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{s.detail}</p>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        case 'd':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: section.steps.length >= 6 ? 'repeat(auto-fit, minmax(280px, 1fr))' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                  {section.steps.map((s, i) => (
                    <StaggerItem key={i}>
                      <div style={{ background: cBg, border: `1px solid ${cBd}`, borderRadius: 16, padding: '28px 24px', height: '100%', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 8, right: 12, fontSize: '3rem', fontWeight: 900, color: catColor, opacity: 0.12, lineHeight: 1, userSelect: 'none' }}>
                          {s.number}
                        </div>
                        <h3 style={{ color: h, fontWeight: 700, fontSize: '1.05rem', margin: '0 0 10px', lineHeight: 1.3, position: 'relative' }}>{s.title}</h3>
                        <p style={{ color: p, fontSize: '0.9rem', lineHeight: 1.6, margin: 0, position: 'relative' }}>{s.detail}</p>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </section>
          )

        default:
          return null
      }
    }

    case 'results-preview': {
      switch (variant) {
        case 'a':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
                  {section.metrics.map((m, i) => (
                    <StaggerItem key={i}>
                      <div style={{ background: cBg, border: `1px solid ${cBd}`, borderRadius: 16, padding: '32px 24px', textAlign: 'center', height: '100%' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: catColor, lineHeight: 1, marginBottom: 10 }}>{m.value}</div>
                        <div style={{ fontWeight: 700, color: h, fontSize: '1rem', marginBottom: 8 }}>{m.label}</div>
                        <div style={{ color: p, fontSize: '0.85rem', lineHeight: 1.55 }}>{m.context}</div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </section>
          )

        case 'b': {
          const [heroMetric, ...supporting] = section.metrics
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <ScrollReveal direction="up">
                  <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: catColor, lineHeight: 1, marginBottom: 10 }}>{heroMetric.value}</div>
                    <div style={{ fontWeight: 700, color: h, fontSize: '1.3rem', marginBottom: 8 }}>{heroMetric.label}</div>
                    <div style={{ color: p, fontSize: '0.95rem', lineHeight: 1.55, maxWidth: 460, margin: '0 auto' }}>{heroMetric.context}</div>
                  </div>
                </ScrollReveal>
                {supporting.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px 0', borderTop: `1px solid ${cBd}`, paddingTop: 28 }}>
                    {supporting.map((m, i) => (
                      <ScrollReveal key={i} direction="up" delay={i * 0.1}>
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                          <div style={{ textAlign: 'center', padding: '0 clamp(16px, 3vw, 36px)' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: catColor, marginBottom: 4 }}>{m.value}</div>
                            <div style={{ fontWeight: 600, color: h, fontSize: '0.85rem', marginBottom: 2 }}>{m.label}</div>
                            <div style={{ color: p, fontSize: '0.75rem' }}>{m.context}</div>
                          </div>
                          {i < supporting.length - 1 && (
                            <div style={{ width: 1, background: cBd, alignSelf: 'stretch', flexShrink: 0 }} />
                          )}
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        }

        case 'c':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {section.metrics.map((m, i) => (
                    <ScrollReveal key={i} direction="left" delay={i * 0.08}>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 0', borderBottom: i < section.metrics.length - 1 ? `1px solid ${cBd}` : 'none', gap: 'clamp(16px, 3vw, 32px)', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 800, color: catColor, lineHeight: 1, minWidth: 100 }}>{m.value}</div>
                        <div style={{ fontWeight: 700, color: h, fontSize: '1rem', flex: 1, minWidth: 120 }}>{m.label}</div>
                        <div style={{ color: p, fontSize: '0.88rem', lineHeight: 1.5, flex: 1, minWidth: 180, textAlign: 'right' }}>{m.context}</div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        case 'd':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 16, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                  <p style={{ textAlign: 'center', color: p, fontSize: '1.05rem', maxWidth: 500, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    {section.intro}
                  </p>
                </ScrollReveal>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 48, alignItems: 'center' }}>
                  {section.metrics.map((m, i) => (
                    <ScrollReveal key={i} direction="up" delay={i * 0.12}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 900, color: catColor, lineHeight: 1, marginBottom: 8 }}>{m.value}</div>
                        <div style={{ width: 60, height: 3, background: catColor, margin: '0 auto 12px', borderRadius: 2 }} />
                        <div style={{ fontWeight: 700, color: h, fontSize: '1.05rem', marginBottom: 6 }}>{m.label}</div>
                        <div style={{ color: p, fontSize: '0.88rem', lineHeight: 1.55 }}>{m.context}</div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        default:
          return null
      }
    }

    case 'industry-spotlight': {
      switch (variant) {
        case 'a':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
                  {section.industries.map((ind, i) => (
                    <StaggerItem key={i}>
                      <div style={{ background: cBg, border: `1px solid ${cBd}`, borderRadius: 16, padding: '32px 28px', height: '100%' }}>
                        <h3 style={{ color: catColor, fontWeight: 800, fontSize: '1.1rem', marginBottom: 16 }}>{ind.name}</h3>
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>The Challenge</div>
                          <p style={{ color: p, fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>{ind.challenge}</p>
                        </div>
                        <div>
                          <div style={{ color: '#52C9A0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Our Approach</div>
                          <p style={{ color: p, fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>{ind.solution}</p>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </section>
          )

        case 'b':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {section.industries.map((ind, i) => (
                    <ScrollReveal key={i} direction="up" delay={i * 0.1}>
                      <div style={{ padding: '40px 32px', background: i % 2 === 0 ? (dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)') : 'transparent', borderRadius: 12 }}>
                        <h3 style={{ color: catColor, fontWeight: 800, fontSize: '1.3rem', marginBottom: 20, textAlign: 'left' }}>{ind.name}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
                          <div>
                            <div style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>The Challenge</div>
                            <p style={{ color: p, fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>{ind.challenge}</p>
                          </div>
                          <div>
                            <div style={{ color: '#52C9A0', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Our Approach</div>
                            <p style={{ color: p, fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>{ind.solution}</p>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        case 'c':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                  {section.industries.map((ind, i) => (
                    <StaggerItem key={i}>
                      <div style={{ background: cBg, border: `1px solid ${cBd}`, borderRadius: 12, padding: '24px 20px', height: '100%' }}>
                        <h3 style={{ color: catColor, fontWeight: 800, fontSize: '1rem', marginBottom: 12 }}>{ind.name}</h3>
                        <p style={{ color: p, fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 12px' }}>{ind.challenge}</p>
                        <div style={{ borderTop: `1px solid ${cBd}`, paddingTop: 12 }}>
                          <span style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Our approach: </span>
                          <span style={{ color: p, fontSize: '0.82rem', lineHeight: 1.55 }}>{ind.solution}</span>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </section>
          )

        case 'd':
          return (
            <section key={`s-${idx}`} style={{ background: bg, padding: '80px 24px' }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <ScrollReveal direction="up">
                  <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, color: h, marginBottom: 48, lineHeight: 1.2 }}>
                    {section.headline}
                  </h2>
                </ScrollReveal>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  {section.industries.map((ind, i) => (
                    <ScrollReveal key={i} direction="up" delay={i * 0.1}>
                      <div>
                        <h3 style={{ color: catColor, fontWeight: 800, fontSize: '1.1rem', marginBottom: 12 }}>{ind.name}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0, borderRadius: 12, overflow: 'hidden', border: `1px solid ${cBd}` }}>
                          <div style={{ background: dark ? 'rgba(242,133,0,0.04)' : 'rgba(242,133,0,0.03)', padding: '24px 24px' }}>
                            <div style={{ color: dark ? 'rgba(242,133,0,0.6)' : 'rgba(242,133,0,0.7)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>The Challenge</div>
                            <p style={{ color: p, fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>{ind.challenge}</p>
                          </div>
                          <div style={{ background: dark ? 'rgba(82,201,160,0.04)' : 'rgba(82,201,160,0.03)', padding: '24px 24px' }}>
                            <div style={{ color: '#52C9A0', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Our Approach</div>
                            <p style={{ color: p, fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>{ind.solution}</p>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </section>
          )

        default:
          return null
      }
    }

    default:
      return null
  }
}
