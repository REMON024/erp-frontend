'use client'
import { usePathname } from 'next/navigation'
import { Menu, Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

interface TopbarProps {
  onToggleSidebar: () => void
  onMobileMenuOpen?: () => void
}

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')).join(' / ')
}

export function Topbar({ onToggleSidebar, onMobileMenuOpen }: TopbarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuOpen}
        className="sm:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Menu className="w-5 h-5 text-slate-600" />
      </button>
      {/* Desktop collapse toggle */}
      <button
        onClick={onToggleSidebar}
        className="hidden sm:block p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Menu className="w-5 h-5 text-slate-600" />
      </button>

      {/* Breadcrumb */}
      <div className="text-sm text-slate-600 font-medium">
        {getBreadcrumb(pathname) || 'Dashboard'}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
        <Search className="w-4 h-4" />
        <span className="hidden sm:block">Quick search...</span>
        <kbd className="hidden sm:block text-xs px-1 py-0.5 bg-white rounded border border-slate-300">⌘K</kbd>
      </button>

      {/* Notifications */}
      <button className="relative p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
        <Bell className="w-5 h-5 text-slate-600" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
        {user?.first_name?.[0]}{user?.last_name?.[0]}
      </div>
    </header>
  )
}
