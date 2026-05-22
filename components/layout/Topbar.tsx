'use client'
import { Menu, Search, User } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

interface TopbarProps {
  onMobileMenuOpen?: () => void
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const { user } = useAuthStore()
  const name = user ? `${user.first_name} ${user.last_name}` : 'Admin'

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 shrink-0">
      {/* Hamburger — visible on mobile only */}
      <button
        onClick={onMobileMenuOpen}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors sm:hidden"
      >
        <Menu className="w-5 h-5 text-gray-500" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects, vendor"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* User */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-500" />
        </div>
        <span className="text-sm font-medium text-gray-700">{name}</span>
      </div>
    </header>
  )
}
