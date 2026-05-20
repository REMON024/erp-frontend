'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/utils/cn'
import {
  LayoutDashboard, FolderKanban, CheckSquare, GanttChartSquare,
  Users, HardHat, Package, ShoppingCart, Truck, ShieldAlert,
  FileCheck, DollarSign, FileText, BarChart3, LogOut, Building2,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard,    module: 'dashboard' },
  { label: 'Projects',     href: '/projects',     icon: FolderKanban,       module: 'projects' },
  { label: 'Tasks',        href: '/tasks',        icon: CheckSquare,        module: 'tasks' },
  { label: 'Gantt',        href: '/gantt',        icon: GanttChartSquare,   module: 'gantt' },
  { label: 'Vendors',      href: '/vendors',      icon: Truck,              module: 'vendors' },
  { label: 'Contractors',  href: '/contractors',  icon: HardHat,            module: 'contractors' },
  { label: 'Inventory',    href: '/inventory',    icon: Package,            module: 'inventory' },
  { label: 'Procurement',  href: '/procurement',  icon: ShoppingCart,       module: 'procurement' },
  { label: 'Equipment',    href: '/equipment',    icon: Building2,          module: 'equipment' },
  { label: 'Safety',       href: '/safety',       icon: ShieldAlert,        module: 'safety' },
  { label: 'Compliance',   href: '/compliance',   icon: FileCheck,          module: 'compliance' },
  { label: 'Finance',      href: '/finance',      icon: DollarSign,         module: 'finance' },
  { label: 'Documents',    href: '/documents',    icon: FileText,           module: 'documents' },
  { label: 'Reports',      href: '/reports',      icon: BarChart3,          module: 'reports' },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, hasAccess, logout } = useAuthStore()

  const visible = NAV_ITEMS.filter((item) => hasAccess(item.module))

  return (
    <aside className={cn(
      'flex flex-col h-full bg-slate-900 text-white transition-all duration-300',
      // Desktop: show inline, collapsible
      'hidden sm:flex',
      collapsed ? 'sm:w-16' : 'sm:w-64',
      // Mobile: fixed overlay drawer
      mobileOpen && 'fixed inset-y-0 left-0 z-50 flex w-64 sm:relative sm:z-auto sm:translate-x-0',
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm shrink-0">
          ERP
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm leading-tight flex-1">
            Construction<br />
            <span className="text-slate-400 text-xs font-normal">ERP System</span>
          </span>
        )}
        {mobileOpen && onMobileClose && (
          <button onClick={onMobileClose} className="sm:hidden text-slate-400 hover:text-white ml-auto">
            ✕
          </button>
        )}
      </div>

      {/* User role badge */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-xs text-slate-400">Logged in as</p>
          <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-600 rounded-full capitalize">
            {user.role.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {visible.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-slate-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
