import LoginForm from './LoginForm'

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token: 'Your sign-in link is invalid or has been used already. Request a new one.',
  token_expired: 'Your sign-in link has expired. Request a new one — links are valid for 15 minutes.',
  jti_replay: 'This sign-in link has already been used. Request a new one.',
  email_not_client: "We couldn't sign you in. Make sure you're using the email address on file with us.",
  not_a_client: "We couldn't sign you in. Make sure you're using the email address on file with us.",
  rate_limited: 'Too many sign-in attempts. Please wait a few minutes and try again.',
  oauth_error: "Sign-in via Google didn't complete. Try again, or use the email link option.",
  oauth_state_invalid: 'Sign-in session expired. Try again.',
}

export default async function PortalLoginPage({ searchParams }: PageProps) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="mb-8 text-center">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">Demand Signals</div>
        <div className="text-sm text-slate-500 mt-1">Client portal</div>
      </div>

      <h1 className="text-xl font-semibold text-slate-900 mb-2">Sign in</h1>
      <p className="text-sm text-slate-600 mb-6">
        Use the email address on your account to sign in. We&apos;ll send you a link.
      </p>

      {errorMessage && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <LoginForm />

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400 uppercase tracking-wide">
        <div className="flex-1 h-px bg-slate-200" />
        Or
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <a
        href="/api/portal/login/google/start"
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Continue with Google
      </a>

      <p className="mt-6 text-xs text-slate-400 text-center">
        Need help signing in? Email{' '}
        <a href="mailto:DemandSignals@gmail.com" className="text-slate-600 hover:underline">
          DemandSignals@gmail.com
        </a>
      </p>
    </div>
  )
}
