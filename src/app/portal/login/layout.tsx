// Login pages opt out of the portal nav layout — they have no
// session. This layout supersedes /portal/layout.tsx for any route
// under /portal/login/*.

export default function PortalLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
