'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/store/auth.store'
import {
  LayoutDashboard, FolderKanban, TrendingUp, ShoppingCart,
  Package, Receipt, BookOpen, PieChart, Users, Settings,
  ChevronDown, LogOut, BarChart2,
} from 'lucide-react'

type SubItem = { label: string; href: string }
type NavItem = { label: string; href: string; icon: React.ElementType; children?: SubItem[]; roles?: string[] }

const NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Projects',    href: '/projects',   icon: FolderKanban, roles: ['operations', 'super_admin'] },
  {
    label: 'Investors', href: '/investors', icon: TrendingUp, roles: ['operations', 'super_admin'],
    children: [
      { label: 'Investor Master',     href: '/investors' },
      { label: 'Investment Records',  href: '/investors/investments' },
    ],
  },
  {
    label: 'Purchase', href: '/purchase', icon: ShoppingCart, roles: ['operations', 'super_admin'],
    children: [
      { label: 'Purchase List',  href: '/purchase' },
      { label: 'Vendors',        href: '/purchase/vendors' },
    ],
  },
  {
    label: 'Inventory', href: '/inventory', icon: Package, roles: ['inventory', 'super_admin'],
    children: [
      { label: 'Stock Levels',     href: '/inventory' },
      { label: 'Material Master',  href: '/inventory/materials' },
      { label: 'Stock In',         href: '/inventory/stock-in' },
      { label: 'Issue to Project', href: '/inventory/issue' },
    ],
  },
  {
    label: 'Sales', href: '/sales', icon: Receipt, roles: ['operations', 'super_admin'],
    children: [
      { label: 'Clients',              href: '/sales/clients' },
      { label: 'Invoices',             href: '/sales' },
      { label: 'Payment Schedules',    href: '/sales/schedules' },
      { label: 'Collections & Receipts', href: '/sales/collections' },
    ],
  },
  {
    label: 'Accounting', href: '/accounting', icon: BookOpen, roles: ['operations', 'super_admin'],
    children: [
      { label: 'Chart of Accounts', href: '/accounting' },
      { label: 'Project Ledger',    href: '/accounting/ledger' },
      { label: 'P&L Statement',     href: '/accounting/pl' },
    ],
  },
  { label: 'Profit Distribution', href: '/profit-distribution', icon: PieChart,   roles: ['operations', 'super_admin'] },
  { label: 'Reports',             href: '/reports',             icon: BarChart2,  roles: ['operations', 'super_admin'] },
  { label: 'Users',     href: '/users',    icon: Users,    roles: ['super_admin'] },
  { label: 'Settings',  href: '/settings', icon: Settings },
]

function isParentActive(item: NavItem, pathname: string): boolean {
  if (item.children) return item.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  const initial = NAV.filter(i => i.children && isParentActive(i, pathname)).map(i => i.label)
  const [open, setOpen] = useState<string[]>(initial)

  useEffect(() => {
    const active = NAV.filter(i => i.children && isParentActive(i, pathname)).map(i => i.label)
    setOpen(prev => [...new Set([...prev, ...active])])
  }, [pathname])

  const toggle = (label: string) =>
    setOpen(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])

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
            <p className="text-xs text-slate-400 truncate">Admin Dashboard</p>
          </div>
        </div>

        {/* MAIN MENU label */}
        <p className="px-4 pt-4 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Main Menu
        </p>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {NAV.map(item => {
            const Icon = item.icon
            const parentActive = isParentActive(item, pathname)
            const isOpen = open.includes(item.label)

            if (!item.children) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    parentActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            }

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggle(item.label)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
                    parentActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform shrink-0', isOpen ? '' : '-rotate-90')} />
                </button>

                {isOpen && (
                  <div className="ml-3 mt-0.5 space-y-0.5">
                    {item.children.map(child => {
                      const active = pathname === child.href
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onMobileClose}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                            active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800',
                          )}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
                          <span className="text-[13px]">{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-slate-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
