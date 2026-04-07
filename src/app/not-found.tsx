import type { Metadata } from 'next'
import NotFoundClient from './NotFoundClient'

export const metadata: Metadata = {
  title: 'Page Not Found — Demand Signals',
  description: 'The page you are looking for could not be found.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return <NotFoundClient />
}
