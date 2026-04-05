'use client';

import { useState } from 'react';
import { BOOKING_URL, CONTACT_PHONE, CONTACT_EMAIL } from '@/lib/constants';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    business: '',
    email: '',
    phone: '',
    service: '',
    message: '',
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
      const res = await fetch('/api/contact', {
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
      <title>Contact Demand Signals — Start the Conversation</title>

      {/* Dark Hero */}
      <section style={{
        background: 'var(--dark)',
        paddingTop: '120px',
        paddingBottom: '60px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: 12 }}>
            Get In Touch
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
            <span style={{color:'#52C9A0'}}>Let&apos;s Build Something</span>{' '}<span style={{color:'#FF6B2B'}}>That Works.</span>
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            Tell us what you need — a website, AI systems, demand generation, or all three. We&apos;ll tell you exactly how we&apos;d solve it, what it costs, and how fast we can ship.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section style={{ background: '#fff', padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {/* Booking Card */}
          <div style={{
            background: 'var(--dark)',
            borderRadius: 16,
            padding: '36px 40px',
            marginBottom: 40,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📅</div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>
              Prefer to Pick Your Own Time?
            </h2>
            <p style={{ color: '#a0aec0', fontSize: '1rem', lineHeight: 1.6, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
              Book a free 30-minute strategy call directly on our calendar.
            </p>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: '#FF6B2B',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '14px 32px',
                borderRadius: 100,
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
            >
              Schedule My Free Call →
            </a>
            <p style={{ color: '#718096', fontSize: '0.85rem', marginTop: 14 }}>
              30 min · No pitch · Real advice
            </p>
          </div>

          {/* Separator */}
          <div style={{ textAlign: 'center', marginBottom: 40, color: '#a0aec0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span>— or fill out the form below and we'll reach out —</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Contact Form */}
          {status === 'success' ? (
            <div style={{
              background: '#f0fff4',
              border: '2px solid var(--teal)',
              borderRadius: 12,
              padding: '40px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>✅</div>
              <h3 style={{ color: 'var(--dark)', fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>
                Message Received!
              </h3>
              <p style={{ color: 'var(--slate)', fontSize: '1rem', lineHeight: 1.6 }}>
                We respond within 1 business hour during Pacific business hours. Talk soon.
              </p>
            </div>
          ) : (
            <form id="contact-form" action="#" onSubmit={handleSubmit}>
              {/* Row: Name + Business */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input name="name" required value={form.name} onChange={handleChange} style={inputStyle} placeholder="Your name" />
                </div>
                <div>
                  <label style={labelStyle}>Business Name</label>
                  <input name="business" value={form.business} onChange={handleChange} style={inputStyle} placeholder="Your company" />
                </div>
              </div>

              {/* Row: Email + Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input name="email" type="email" required value={form.email} onChange={handleChange} style={inputStyle} placeholder="you@company.com" />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} style={inputStyle} placeholder="(530) 000-0000" />
                </div>
              </div>

              {/* Service Select */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>What are you interested in?</label>
                <select name="service" value={form.service} onChange={handleChange} style={inputStyle}>
                  <option value="">— Select a service —</option>
                  <option value="Website/Web App">Website / Web App</option>
                  <option value="AI Agent Farm">AI Agent Farm</option>
                  <option value="AI Voice System">AI Voice System</option>
                  <option value="Workflow Automation">Workflow Automation</option>
                  <option value="Local Demand Generation">Local Demand Generation</option>
                  <option value="GEO/LLM Optimization">GEO / LLM Optimization</option>
                  <option value="Full Service">Full Service</option>
                  <option value="Not sure yet">Not sure yet</option>
                </select>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Tell us about your situation *</label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="What are you working on? What's your biggest challenge right now?"
                />
              </div>

              {status === 'error' && (
                <p style={{ color: '#e53e3e', marginBottom: 16, fontSize: '0.9rem' }}>{errorMsg}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  width: '100%',
                  background: '#FF6B2B',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  padding: '16px',
                  border: 'none',
                  borderRadius: 100,
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: status === 'loading' ? 0.7 : 1,
                  transition: 'background 0.2s',
                  marginBottom: 12,
                }}
              >
                {status === 'loading' ? 'Sending...' : 'Send It →'}
              </button>
              <p style={{ textAlign: 'center', color: '#718096', fontSize: '0.85rem' }}>
                We respond within 1 business hour during Pacific business hours.
              </p>
            </form>
          )}

          {/* Info Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 56 }}>
            {[
              { icon: '📞', label: 'Phone', value: CONTACT_PHONE, href: `tel:${CONTACT_PHONE}` },
              { icon: '✉️', label: 'Email', value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
              { icon: '📍', label: 'Based In', value: 'Northern California\nServing US & AU', href: null },
            ].map((tile) => (
              <div key={tile.label} style={{
                background: 'var(--light)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '24px 20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{tile.icon}</div>
                <div style={{ color: 'var(--slate)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{tile.label}</div>
                {tile.href ? (
                  <a href={tile.href} style={{ color: 'var(--teal)', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}>{tile.value}</a>
                ) : (
                  <p style={{ color: 'var(--dark)', fontWeight: 600, fontSize: '0.95rem', margin: 0, whiteSpace: 'pre-line' }}>{tile.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--dark)',
  fontWeight: 600,
  fontSize: '0.88rem',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  fontSize: '0.95rem',
  color: 'var(--dark)',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
