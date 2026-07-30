'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuthStore } from '@/store/auth.store'

// Always warmed, because they are reachable without a menu row.
const ALWAYS_PREFETCH = ['/dashboard', '/settings']

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { token, menusLoaded, menuRoutes, loadMenus, isPathAllowed } = useAuthStore()

  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token, router])

  // Load the user's menu set once authenticated (drives nav + page access).
  useEffect(() => {
    if (token && !menusLoaded) loadMenus()
  }, [token, menusLoaded, loadMenus])

  // Menu-driven route guard: redirect away from pages the role can't reach.
  useEffect(() => {
    if (token && menusLoaded && !isPathAllowed(pathname)) {
      router.replace('/dashboard')
    }
  }, [token, menusLoaded, pathname, isPathAllowed, router])

  // Pre-warm the routes this user can actually reach, after a short delay so we don't compete
  // with the initial page load. Driven off the menu tree rather than a hardcoded list: the old
  // list had drifted badly — 8 of its 19 entries pointed at pages that no longer exist, it
  // missed 39 real routes, and it omitted /dashboard, which is the redirect target above.
  useEffect(() => {
    if (!menusLoaded) return
    const id = setTimeout(() => {
      for (const route of new Set([...ALWAYS_PREFETCH, ...menuRoutes]))
        router.prefetch(route)
    }, 2000)
    return () => clearTimeout(id)
  }, [router, menusLoaded, menuRoutes])

  if (!token) return null

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onMobileMenuOpen={() => setMobileOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto min-w-0 p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
