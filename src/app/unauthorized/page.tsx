import type { Metadata } from 'next'
import UnauthorizedClient from './UnauthorizedClient'

export const metadata: Metadata = {
  title: 'Access Denied | Demand Signals',
  robots: { index: false, follow: false },
}

export default function UnauthorizedPage() {
  return <UnauthorizedClient />
}
