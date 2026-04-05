'use client';

import { useState } from 'react';

const REPORT_TYPES = [
  {
    icon: '🔍',
    title: 'Competitor Intelligence Report',
    value: 'Competitor Intelligence',
    badge: '$800 value — Free',
    description:
      'See what your top 3 competitors are doing — their keyword strategy, their GMB health, their backlink profile, where they\'re winning and where they\'re exposed.',
    deliverables: [
      'Competitor keyword rankings',
      'GMB performance comparison',
      'Backlink gap analysis',
      'Content strategy breakdown',
      '3 immediate opportunities',
    ],
  },
  {
    icon: '📈',
    title: 'Market Demand Analysis',
    value: 'Market Demand Analysis',
    badge: '$650 value — Free',
    description:
      'Map the full demand landscape for your business category and geography — total search volume, seasonal patterns, underserved queries, and where the highest-value customers are searching.',
    deliverables: [
      'Total addressable search volume',
      'Top 50 target keywords',
      'Seasonal demand calendar',
      'Geographic heat map',
      'Recommended content priorities',
    ],
  },
  {
    icon: '🔮',
    title: 'SEO + GEO + AEO Audit',
    value: 'SEO+GEO+AEO Audit',
    badge: '$1,200 value — Free',
    description:
      'A full three-layer discovery audit — your Google rankings, AI citation status, and voice search visibility. See exactly where you\'re visible and where you\'re invisible.',
    deliverables: [
      'Current ranking positions (top 100 keywords)',
      'AI citation analysis (ChatGPT, Perplexity, Gemini)',
      'Schema markup audit',
      'AEO/Voice optimization score',
      'Priority fix list',
    ],
  },
  {
    icon: '📋',
    title: 'Strategic Project Plan',
    value: 'Strategic Project Plan',
    badge: '$600 value — Free',
    description:
      'A complete 90-day roadmap built for your specific business — prioritized tasks, KPI targets, budget allocation, and a week-by-week implementation calendar.',
    deliverables: [
      '90-day action plan',
      'KPI targets and measurement framework',
      'Budget allocation recommendations',
      'Week-by-week task calendar',
      'Implementation priority matrix',
    ],
  },
];

const HOW_IT_WORKS = [
  { step: '1', label: 'Submit your request', detail: 'Fill out the form below with your business details and the report you want.' },
  { step: '2', label: 'Our agents analyze your data', detail: 'Our AI research agents pull real market data, competitor signals, and ranking data.' },
  { step: '3', label: 'Human review and quality check', detail: 'Our team reviews every report for accuracy, context, and actionability.' },
  { step: '4', label: 'Report delivered to your inbox within 48 hours', detail: 'You receive a polished, actionable PDF report at no cost.' },
];

export default function ResearchReportsPage() {
  const [form, setForm] = useState({
    name: '',
    business: '',
    email: '',
    phone: '',
    report_type: '',
    industry: '',
    question: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/report-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  return (
    <>
      <title>Free Intelligence Reports — Demand Signals</title>

      {/* Hero */}
      <section style={{ background: 'var(--dark)', paddingTop: '120px', paddingBottom: '72px', textAlign: 'center' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 14 }}>
            Free Intelligence Reports
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.12, marginBottom: 20 }}>
            Know Exactly Where You Stand<br />Before You Spend a Dollar
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
            Our AI research agents build custom intelligence reports in 48 hours. Real data. Real recommendations. Zero cost for your first report.
          </p>
        </div>
      </section>

      {/* Report Type Cards */}
      <section style={{ background: 'var(--light)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 28 }}>
            {REPORT_TYPES.map((report) => (
              <article key={report.value} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.8rem' }}>{report.icon}</span>
                    <h2 style={{ color: 'var(--dark)', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{report.title}</h2>
                  </div>
                  <span style={{
                    background: 'var(--teal)',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}>
                    {report.badge}
                  </span>
                </div>
                <p style={{ color: 'var(--slate)', lineHeight: 1.65, fontSize: '0.95rem', marginBottom: 20 }}>
                  {report.description}
                </p>
                <div>
                  <p style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    Deliverables
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {report.deliverables.map((d) => (
                      <li key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--slate)', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--teal)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 10 }}>
              Simple Process
            </p>
            <h2 style={{ color: 'var(--dark)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, margin: 0 }}>
              How It Works
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  background: 'var(--teal)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}>
                  {step.step}
                </div>
                <h3 style={{ color: 'var(--dark)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>{step.label}</h3>
                <p style={{ color: 'var(--slate)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request Form */}
      <section style={{ background: 'var(--dark)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, marginBottom: 14 }}>
              Request Your Free Report
            </h2>
            <p style={{ color: '#a0aec0', fontSize: '1rem', lineHeight: 1.6 }}>
              Tell us about your business and we'll get your report started within 24 hours.
            </p>
          </div>

          {status === 'success' ? (
            <div style={{ background: 'rgba(104,197,173,0.15)', border: '2px solid var(--teal)', borderRadius: 12, padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>✅</div>
              <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: 10 }}>Request Received!</h3>
              <p style={{ color: '#a0aec0', lineHeight: 1.6 }}>We'll begin your report within 24 hours and deliver it to your inbox within 48 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={darkLabelStyle}>Name *</label>
                  <input name="name" required value={form.name} onChange={handleChange} style={darkInputStyle} placeholder="Your name" />
                </div>
                <div>
                  <label style={darkLabelStyle}>Business *</label>
                  <input name="business" required value={form.business} onChange={handleChange} style={darkInputStyle} placeholder="Company name" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={darkLabelStyle}>Email *</label>
                  <input name="email" type="email" required value={form.email} onChange={handleChange} style={darkInputStyle} placeholder="you@company.com" />
                </div>
                <div>
                  <label style={darkLabelStyle}>Phone</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} style={darkInputStyle} placeholder="(530) 000-0000" />
                </div>
              </div>
              <div>
                <label style={darkLabelStyle}>Report Type *</label>
                <select name="report_type" required value={form.report_type} onChange={handleChange} style={darkInputStyle}>
                  <option value="">— Select a report —</option>
                  <option value="Competitor Intelligence">Competitor Intelligence Report</option>
                  <option value="Market Demand Analysis">Market Demand Analysis</option>
                  <option value="SEO+GEO+AEO Audit">SEO + GEO + AEO Audit</option>
                  <option value="Strategic Project Plan">Strategic Project Plan</option>
                </select>
              </div>
              <div>
                <label style={darkLabelStyle}>Industry</label>
                <select name="industry" value={form.industry} onChange={handleChange} style={darkInputStyle}>
                  <option value="">— Select your industry —</option>
                  <option value="Contractor & Construction">Contractor & Construction</option>
                  <option value="Legal & Professional">Legal & Professional</option>
                  <option value="Medical & Wellness">Medical & Wellness</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Specialty Retail">Specialty Retail</option>
                  <option value="Fitness & Sports">Fitness & Sports</option>
                  <option value="Auto & Marine">Auto & Marine</option>
                  <option value="Health & Beauty">Health & Beauty</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={darkLabelStyle}>What's your biggest marketing challenge?</label>
                <textarea
                  name="question"
                  rows={4}
                  value={form.question}
                  onChange={handleChange}
                  style={{ ...darkInputStyle, resize: 'vertical' }}
                  placeholder="Describe your current situation and what you'd most like to understand..."
                />
              </div>
              {status === 'error' && (
                <p style={{ color: '#fc8181', fontSize: '0.9rem', margin: 0 }}>{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  background: '#FF6B2B',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  padding: '16px',
                  border: 'none',
                  borderRadius: 100,
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: status === 'loading' ? 0.7 : 1,
                }}
              >
                {status === 'loading' ? 'Submitting...' : 'Request My Free Report →'}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

const darkLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#e2e8f0',
  fontWeight: 600,
  fontSize: '0.88rem',
  marginBottom: 6,
};

const darkInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  fontSize: '0.95rem',
  color: '#fff',
  background: 'rgba(255,255,255,0.07)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
