'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import {
  LayoutDashboard, FolderKanban, TrendingUp, ShoppingCart,
  Package, Receipt, BookOpen, PieChart, Users, Settings,
  ChevronDown, LogOut, BarChart2, Shield, Menu, ClipboardList,
  FileText, Building2, List, ArrowDownCircle, ArrowUpCircle,
  DollarSign, Calendar, type LucideProps,
} from 'lucide-react'

// Map icon name strings (stored in DB) → Lucide components
const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  LayoutDashboard, FolderKanban, TrendingUp, ShoppingCart,
  Package, Receipt, BookOpen, PieChart, Users, Settings,
  BarChart2, Shield, Menu, ClipboardList,
  FileText, Building2, List, ArrowDownCircle, ArrowUpCircle,
  DollarSign, Calendar,
}
// Settings stays in ICON_MAP so the DB icon string "Settings" resolves correctly
const getIcon = (name: string | null): React.FC<LucideProps> =>
  (name && ICON_MAP[name]) ? ICON_MAP[name] : Menu

interface MenuDto {
  id: number; name: string; code: string; route: string | null
  icon: string | null; parentId: number | null; sortOrder: number
  isActive: boolean; children: MenuDto[]
}

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

function isRouteActive(route: string | null, pathname: string): boolean {
  if (!route) return false
  return pathname === route || pathname.startsWith(route + '/')
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, isAuthenticated } = useAuthStore()

  const [navMenus, setNavMenus] = useState<MenuDto[]>([])
  const [open, setOpen]         = useState<string[]>([])

  // Load user-specific menus after authentication
  useEffect(() => {
    if (!isAuthenticated) return
    api.get<MenuDto[]>('/menus/my-menus')
      .then(res => {
        setNavMenus(res.data)
        // Auto-expand parent menus that contain the current active route
        const active = res.data
          .filter(m => m.children.some(c => isRouteActive(c.route, pathname)))
          .map(m => m.code)
        setOpen(active)
      })
      .catch(() => { /* keep nav empty, don't crash */ })
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (code: string) =>
    setOpen(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={onMobileClose} />
      )}

      <aside className={cn(
        'flex flex-col h-full w-64 sm:w-52 bg-[#0f172a] text-white shrink-0 z-50',
        'fixed inset-y-0 left-0 sm:static',
        mobileOpen ? 'flex' : 'hidden sm:flex',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm shrink-0 select-none">
            1C
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate">Construction ERP</p>
            <p className="text-xs text-slate-400 truncate">
              {user?.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Dashboard'}
            </p>
          </div>
        </div>

        <p className="px-4 pt-4 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Main Menu
        </p>

        {/* Dynamic nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {navMenus.map(item => {
            const Icon    = getIcon(item.icon)
            const isOpen  = open.includes(item.code)
            const hasKids = item.children.length > 0

            // Parent active = self or any child matches current path
            const parentActive = isRouteActive(item.route, pathname) ||
              item.children.some(c => isRouteActive(c.route, pathname))

            if (!hasKids) {
              return (
                <Link key={item.id} href={item.route ?? '#'} onClick={onMobileClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    parentActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800',
                  )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            }

            return (
              <div key={item.id}>
                <button onClick={() => toggle(item.code)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
                    parentActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800',
                  )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform shrink-0', isOpen ? '' : '-rotate-90')} />
                </button>

                {isOpen && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {item.children.map(child => {
                      const active = isRouteActive(child.route, pathname)
                      return (
                        <Link key={child.id} href={child.route ?? '#'} onClick={onMobileClose}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                            active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800',
                          )}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
                          <span className="text-[13px]">{child.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

        </nav>

        {/* User info + logout */}
        <div className="p-2 border-t border-slate-800 space-y-1">
          {user && (
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-slate-300 truncate">{user.fullName ?? `${user.firstName} ${user.lastName}`}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
          )}
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
