import Link from 'next/link'
import { AdminModeToggle } from '@/components/admin/AdminModeToggle'
import { ADMIN_NAV_ITEMS } from '@/lib/admin-utils'
import { getAdminMode } from './admin-mode'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const mode = getAdminMode()

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="fixed inset-0 -z-10 bg-neutral-100" />

      <header className="fixed left-0 right-0 top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="text-sm font-semibold">
              Admin
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-neutral-600 lg:flex">
              {ADMIN_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-sm px-1 py-1 hover:text-neutral-900 focus-ring"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <AdminModeToggle mode={mode} />
        </div>
        <div className="border-t border-neutral-200 lg:hidden">
          <nav className="mx-auto flex max-w-screen-2xl items-center gap-4 overflow-x-auto px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 sm:px-6">
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-sm px-1 py-1 focus-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-4 pb-16 pt-28 sm:px-6">
        {children}
      </main>
    </div>
  )
}
