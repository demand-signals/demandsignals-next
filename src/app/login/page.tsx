import { Suspense } from 'react'
import AdminLoginClient from './AdminLoginClient'

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginClient />
    </Suspense>
  )
}
