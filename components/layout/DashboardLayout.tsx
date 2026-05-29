'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { DevRoleSwitcher } from '@/components/ui/DevRoleSwitcher'
import { useAuthStore } from '@/store/auth.store'

// Pre-warm Turbopack for all routes so first navigation is instant
const PREFETCH_ROUTES = [
  '/projects', '/tasks', '/inventory', '/inventory/stock',
  '/inventory/stock-in', '/inventory/issue',
  '/contractors', '/vendors', '/procurement',
  '/finance', '/accounting', '/sales',
  '/safety', '/equipment', '/documents',
  '/users', '/roles', '/settings', '/reports',
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const { token } = useAuthStore()

  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token, router])

  // Prefetch all routes in the background after the first render,
  // with a small delay to avoid competing with the initial page load.
  useEffect(() => {
    const id = setTimeout(() => {
      PREFETCH_ROUTES.forEach(route => router.prefetch(route))
    }, 2000)
    return () => clearTimeout(id)
  }, [router])

  if (!token) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onMobileMenuOpen={() => setMobileOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto min-w-0 p-3 sm:p-6">
          {children}
        </main>
      </div>

      {process.env.NODE_ENV === 'development' && <DevRoleSwitcher />}
    </div>
  )
}
