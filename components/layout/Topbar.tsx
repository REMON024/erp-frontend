'use client'
import { useState, useRef, useEffect } from 'react'
import { Menu, Search, User, Sun, Moon, Bell, LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useThemeStore } from '@/store/theme.store'

interface TopbarProps {
  onMobileMenuOpen?: () => void
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const { user, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const name = user ? (user.fullName || `${user.firstName} ${user.lastName}`) : 'Admin'
  const role = user?.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="h-14 bg-surface border-b border-border-default flex items-center gap-3 px-4 shrink-0">
      {/* Hamburger — visible on mobile only */}
      <button
        onClick={onMobileMenuOpen}
        className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors sm:hidden"
      >
        <Menu className="w-5 h-5 text-content-muted" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
          <input
            type="text"
            placeholder="Search projects, vendors…"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-border-default rounded-lg bg-surface-muted text-content placeholder:text-content-muted focus:bg-surface focus:ring-2 focus:ring-primary/40 focus:outline-none transition"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="p-2 rounded-lg text-content-muted hover:bg-surface-muted hover:text-content transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>

      {/* Notifications */}
      <button
        aria-label="Notifications"
        className="relative p-2 rounded-lg text-content-muted hover:bg-surface-muted hover:text-content transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-surface" />
      </button>

      {/* Profile dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-surface-muted transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm">
            {name.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
          </div>
          <span className="text-sm font-medium text-content hidden sm:block">{name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-content-muted hidden sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border-default bg-surface shadow-lg overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-border-default">
              <p className="text-sm font-semibold text-content truncate">{name}</p>
              {user?.email && <p className="text-xs text-content-muted truncate">{user.email}</p>}
              {role && <p className="mt-1 inline-block text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{role}</p>}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-content-muted hover:bg-surface-muted hover:text-danger transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
