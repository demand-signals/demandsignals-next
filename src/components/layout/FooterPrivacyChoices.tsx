'use client'

// dsig-stoplight-version: v1d
// "Your Privacy Choices" footer link — CCPA/CPRA-required named opt-out
// link. Renders the official blue toggle icon + the statutorily-approved
// short label "Your Privacy Choices". Clicking it fires a window event
// the CookieStoplight component listens for, opening the panel from
// anywhere on the page.
//
// Drop into your site footer. Pair with <CookieStoplight /> in your
// root layout. Place this link next to your Privacy Policy link.
//
// Statutory references:
//   - Cal. Civ. Code § 1798.135 (CCPA opt-out link requirement)
//   - 11 CCR § 7026 / § 7011 (CPRA "Your Privacy Choices" + icon spec)
//
// Install / update via: /stoplight

export interface FooterPrivacyChoicesProps {
  /**
   * Override the link text. Defaults to the statutorily-approved short
   * form "Your Privacy Choices". The longer form "Do Not Sell or Share
   * My Personal Information" is also acceptable; both satisfy
   * Cal. Civ. Code § 1798.135.
   */
  label?: string
  /** Override link color. Defaults to inherit. */
  color?: string
  /** Override icon size in px. Default 16. */
  iconSize?: number
}

export function FooterPrivacyChoices({
  label = 'Your Privacy Choices',
  color,
  iconSize = 16,
}: FooterPrivacyChoicesProps = {}) {
  function open(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('dsig:open-consent-panel'))
  }

  return (
    <a
      href="#cookie-preferences"
      onClick={open}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: color ?? 'inherit',
        textDecoration: 'underline',
        textUnderlineOffset: 2,
        fontSize: 'inherit',
        cursor: 'pointer',
      }}
    >
      <PrivacyChoicesIcon size={iconSize} />
      <span>{label}</span>
    </a>
  )
}

// California Privacy Choices opt-out icon. Per 11 CCR § 7026, the icon
// is a blue/white toggle. This SVG renders the official spec at any
// scale. Do not modify the colors or shape — those are regulator-set.
function PrivacyChoicesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 14) / 30}
      viewBox="0 0 30 14"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      {/* Blue pill background (left half) */}
      <path d="M7,0 L15,0 L15,14 L7,14 A7,7 0 0,1 7,0 Z" fill="#1F75FE" />
      {/* White pill background (right half) */}
      <path d="M15,0 L23,0 A7,7 0 0,1 23,14 L15,14 Z" fill="#FFFFFF" stroke="#1F75FE" strokeWidth="1" />
      {/* White circle on the left (the "off" toggle position) */}
      <circle cx="7" cy="7" r="4" fill="#FFFFFF" />
      {/* "X" symbol inside the toggle (opt-out indicator) */}
      <path d="M5.5,5.5 L8.5,8.5 M8.5,5.5 L5.5,8.5" stroke="#1F75FE" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
