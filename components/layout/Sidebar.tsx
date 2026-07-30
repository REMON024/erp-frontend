'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'
import { useAuthStore, type MenuNode } from '@/store/auth.store'
import {
  LayoutDashboard, FolderKanban, TrendingUp, ShoppingCart,
  Package, Receipt, BookOpen, PieChart, Users, Settings,
  ChevronDown, LogOut, BarChart2, Shield, Menu, ClipboardList,
  FileText, Building2, List, ArrowDownCircle, ArrowUpCircle,
  DollarSign, Calendar, Warehouse, ArrowLeftRight, Layers,
  Boxes, Tags, HardHat, Wrench, UserCog, Truck, PackagePlus, PackageCheck,
  Calculator, BarChart3, ShoppingBag, Rows3,
  PlusCircle, FileBarChart2, UserCheck, CalendarCheck, CalendarDays, Banknote,
  FileEdit, Clock, Scale, KeyRound, ScrollText, SlidersHorizontal,
  type LucideProps,
} from 'lucide-react'

// Map icon name strings (stored in DB) → Lucide components, falling back to the generic
// Menu icon below.
//
// Only TOP-LEVEL rows render an icon — children render a bullet (see the nav markup), so a
// missing entry is invisible until that menu is promoted to top level, or an admin types a
// new icon name at /menus, which accepts any string. The map is kept complete against
// DbSeeder.MenuDefs anyway so neither case surprises anyone.
const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  LayoutDashboard, FolderKanban, TrendingUp, ShoppingCart,
  Package, Receipt, BookOpen, PieChart, Users, Settings,
  BarChart2, Shield, Menu, ClipboardList,
  FileText, Building2, List, ArrowDownCircle, ArrowUpCircle,
  DollarSign, Calendar, Warehouse, ArrowLeftRight, Layers,
  Boxes, Tags, HardHat, Wrench, UserCog, Truck, PackagePlus, PackageCheck,
  Calculator, BarChart3, ShoppingBag, Rows3,
  // Child-menu icons from the seeder — latent until one is promoted, but cheap to map.
  PlusCircle, FileBarChart2, UserCheck, CalendarCheck, CalendarDays, Banknote,
  FileEdit, Clock, Scale, KeyRound, ScrollText, SlidersHorizontal,
}
// Settings stays in ICON_MAP so the DB icon string "Settings" resolves correctly
const getIcon = (name: string | null): React.FC<LucideProps> =>
  (name && ICON_MAP[name]) ? ICON_MAP[name] : Menu

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
  const { user, logout, menus } = useAuthStore()

  const navMenus: MenuNode[] = menus
  const [open, setOpen] = useState<string[]>([])

  // Auto-expand parent menus that contain the current active route.
  useEffect(() => {
    const active = navMenus
      .filter(m => m.children.some(c => isRouteActive(c.route, pathname)))
      .map(m => m.code)
    setOpen(active)
  }, [navMenus, pathname])

  const toggle = (code: string) =>
    setOpen(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={onMobileClose} />
      )}

      <aside className={cn(
        'flex flex-col h-full w-64 sm:w-52 bg-surface text-content border-r border-border-default shrink-0 z-50',
        'fixed inset-y-0 left-0 sm:static',
        mobileOpen ? 'flex' : 'hidden sm:flex',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border-default">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-sm shrink-0 select-none shadow-sm shadow-primary/30">
            1C
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate">Construction ERP</p>
            <p className="text-xs text-content-muted truncate">
              {user?.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Dashboard'}
            </p>
          </div>
        </div>

        <p className="px-4 pt-4 pb-1 text-[10px] font-semibold text-content-muted uppercase tracking-widest">
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
                    parentActive ? 'bg-primary/10 text-primary font-medium' : 'text-content-muted hover:text-content hover:bg-surface-muted',
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
                    parentActive ? 'text-content font-medium' : 'text-content-muted hover:text-content hover:bg-surface-muted',
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
                            active ? 'bg-primary/10 text-primary font-medium' : 'text-content-muted hover:text-content hover:bg-surface-muted',
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
        <div className="p-2 border-t border-border-default space-y-1">
          {user && (
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-content truncate">{user.fullName ?? `${user.firstName} ${user.lastName}`}</p>
              <p className="text-[11px] text-content-muted truncate">{user.email}</p>
            </div>
          )}
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-content-muted hover:text-danger hover:bg-surface-muted transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
