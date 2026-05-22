'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { DevRoleSwitcher } from '@/components/ui/DevRoleSwitcher'
import { useAuthStore } from '@/store/auth.store'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const { token } = useAuthStore()

  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token, router])

  if (!token) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onMobileMenuOpen={() => setMobileOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto min-w-0 p-6">
          {children}
        </main>
      </div>

      {process.env.NODE_ENV === 'development' && <DevRoleSwitcher />}
    </div>
  )
}
