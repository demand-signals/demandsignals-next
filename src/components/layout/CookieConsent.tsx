'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type CookiePreference = 'all' | 'necessary' | 'custom' | null

interface CustomChoices {
  analytics: boolean
  marketing: boolean
  preferences: boolean
}

const STORAGE_KEY = 'cookie_preference'
const CUSTOM_CHOICES_KEY = 'cookie_custom_choices'

const spring = { type: 'spring' as const, stiffness: 260, damping: 20 }

const CookieIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
    <path d="M8.5 8.5v.01" />
    <path d="M16 15.5v.01" />
    <path d="M12 12v.01" />
  </svg>
)

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const ShieldIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const Toggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
}) => (
  <button
    onClick={() => !disabled && onChange && onChange(!checked)}
    style={{
      width: 40,
      height: 22,
      borderRadius: 11,
      background: checked ? '#52C9A0' : '#d1d5db',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      position: 'relative',
      transition: 'background 0.2s',
      flexShrink: 0,
    }}
    aria-checked={checked}
    role="switch"
    disabled={disabled}
  >
    <span
      style={{
        position: 'absolute',
        top: 3,
        left: checked ? 21 : 3,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    />
  </button>
)

export function CookieConsent() {
  const [preference, setPreference] = useState<CookiePreference>(null)
  const [open, setOpen] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [visible, setVisible] = useState(false)
  const [customChoices, setCustomChoices] = useState<CustomChoices>({
    analytics: true,
    marketing: false,
    preferences: true,
  })

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CookiePreference | null
    if (stored) {
      setPreference(stored)
      setVisible(true)
    } else {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const savePreference = (pref: CookiePreference) => {
    if (!pref) return
    localStorage.setItem(STORAGE_KEY, pref)
    setPreference(pref)
    setOpen(false)
    setShowPanel(false)
  }

  const handleAccept = () => savePreference('all')

  const handleReject = () => savePreference('necessary')

  const handleSaveCustom = () => {
    localStorage.setItem(CUSTOM_CHOICES_KEY, JSON.stringify(customChoices))
    savePreference('custom')
  }

  const isSettled = preference !== null

  const mainBg = isSettled
    ? '#9ca3af'
    : '#52C9A0'

  const circleBtn: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    cursor: isSettled ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    flexShrink: 0,
    position: 'relative',
  }

  if (!visible) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 64,
          left: 20,
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        {/* Sub-buttons */}
        <AnimatePresence>
          {open && !isSettled && (
            <>
              {/* Red — Reject */}
              <motion.button
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -138 }}
                exit={{ opacity: 0, y: 0 }}
                transition={spring}
                onClick={handleReject}
                title="Reject All"
                style={{
                  ...circleBtn,
                  background: '#dc2626',
                  position: 'absolute',
                  bottom: 0,
                }}
              >
                <XIcon />
              </motion.button>

              {/* Yellow — Customize */}
              <motion.button
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -92 }}
                exit={{ opacity: 0, y: 0 }}
                transition={spring}
                onClick={() => setShowPanel(true)}
                title="Customize"
                style={{
                  ...circleBtn,
                  background: '#eab308',
                  position: 'absolute',
                  bottom: 0,
                }}
              >
                <ShieldIcon />
              </motion.button>

              {/* Green — Accept */}
              <motion.button
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -46 }}
                exit={{ opacity: 0, y: 0 }}
                transition={spring}
                onClick={handleAccept}
                title="Accept All"
                style={{
                  ...circleBtn,
                  background: '#16a34a',
                  position: 'absolute',
                  bottom: 0,
                }}
              >
                <CheckIcon />
              </motion.button>
            </>
          )}
        </AnimatePresence>

        {/* Main button */}
        <button
          onClick={() => !isSettled && setOpen((v) => !v)}
          title="Cookie Settings"
          style={{
            ...circleBtn,
            background: mainBg,
            transition: 'background 0.3s',
          }}
        >
          <CookieIcon />
        </button>
      </div>

      {/* Customize Panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPanel(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.2)',
                zIndex: 95,
              }}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              exit={{ x: -400 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: 'min(380px, 100vw)',
                height: '100%',
                background: '#fff',
                zIndex: 96,
                boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 20px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  position: 'sticky',
                  top: 0,
                  background: '#fff',
                  zIndex: 1,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>
                  Cookie Preferences
                </h2>
                <button
                  onClick={() => setShowPanel(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: 4,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <XIcon />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 20px', flex: 1 }}>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                  Choose which cookies you allow us to use. You can change these settings at any time.
                </p>

                {[
                  {
                    label: 'Necessary',
                    description: 'Essential for the website to function properly.',
                    key: null,
                    value: true,
                  },
                  {
                    label: 'Analytics',
                    description: 'Help us understand how visitors use our site.',
                    key: 'analytics' as keyof CustomChoices,
                    value: customChoices.analytics,
                  },
                  {
                    label: 'Marketing',
                    description: 'Used to deliver relevant advertisements.',
                    key: 'marketing' as keyof CustomChoices,
                    value: customChoices.marketing,
                  },
                  {
                    label: 'Preferences',
                    description: 'Remember your settings and personalization.',
                    key: 'preferences' as keyof CustomChoices,
                    value: customChoices.preferences,
                  },
                ].map(({ label, description, key, value }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '14px 0',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                        {label}
                        {key === null && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              color: '#52C9A0',
                              background: '#f0fdf4',
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Always on
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{description}</div>
                    </div>
                    <Toggle
                      checked={value}
                      disabled={key === null}
                      onChange={
                        key
                          ? (v) => setCustomChoices((prev) => ({ ...prev, [key]: v }))
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={handleSaveCustom}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    background: '#52C9A0',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Preferences
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
