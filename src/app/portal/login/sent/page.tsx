import Link from 'next/link'
import { Mail } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function PortalLoginSentPage({ searchParams }: PageProps) {
  const { email } = await searchParams

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mb-4">
        <Mail className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h1>
      <p className="text-sm text-slate-600 mb-6">
        If {email ? <strong className="text-slate-900">{email}</strong> : 'that email'} is on
        file with us, we sent a sign-in link. It&apos;s valid for 15 minutes.
      </p>
      <Link
        href="/portal/login"
        className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 hover:underline"
      >
        ← Back to sign in
      </Link>
    </div>
  )
}
