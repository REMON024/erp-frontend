'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, Role } from '@/types'
import api from '@/lib/api'

// Menu tree node as returned by GET /menus/my-menus (access-filtered server-side).
export interface MenuNode {
  id: number
  name: string
  code: string
  route: string | null
  icon: string | null
  parentId: number | null
  sortOrder: number
  isActive: boolean
  children: MenuNode[]
}

// Routes always reachable regardless of menu config (no data-scoped content).
const ALWAYS_ALLOWED = ['/dashboard', '/', '/settings']

function flattenRoutes(nodes: MenuNode[]): string[] {
  const out: string[] = []
  const walk = (n: MenuNode) => {
    if (n.route) out.push(n.route)
    n.children?.forEach(walk)
  }
  nodes.forEach(walk)
  return out
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean

  menus: MenuNode[]
  menuRoutes: string[]
  menusLoaded: boolean

  setHasHydrated: (val: boolean) => void
  setAuth: (user: User, token: string) => void
  logout: () => void
  loadMenus: () => Promise<void>

  isSuperAdmin: () => boolean
  /** Page/route access — driven by the user's menu set (super_admin sees all). */
  hasAccess: (routeOrCode: string) => boolean
  /** Route-guard check used by the dashboard shell. */
  isPathAllowed: (pathname: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      menus: [],
      menuRoutes: [],
      menusLoaded: false,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('erp_token', token)
          localStorage.setItem('erp_user', JSON.stringify(user))
          // Cookie for middleware route protection (session-scoped)
          document.cookie = `erp_token=${token}; path=/; SameSite=Lax`
        }
        set({ user, token, isAuthenticated: true, menusLoaded: false, menus: [], menuRoutes: [] })
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('erp_token')
          localStorage.removeItem('erp_user')
          document.cookie = 'erp_token=; path=/; max-age=0'
        }
        set({ user: null, token: null, isAuthenticated: false, menus: [], menuRoutes: [], menusLoaded: false })
      },

      loadMenus: async () => {
        try {
          const res = await api.get<MenuNode[]>('/menus/my-menus')
          set({ menus: res.data, menuRoutes: flattenRoutes(res.data), menusLoaded: true })
        } catch {
          // Don't crash the shell on a transient failure; treat as "no menus yet".
          set({ menus: [], menuRoutes: [], menusLoaded: true })
        }
      },

      isSuperAdmin: () => {
        const user = get().user
        if (!user) return false
        const roles = (user.roles?.length ? user.roles : [user.role]) as Role[]
        return roles.includes('super_admin')
      },

      hasAccess: (routeOrCode) => {
        if (get().isSuperAdmin()) return true
        const { menus, menuRoutes } = get()
        // Match by menu code or by route prefix.
        const codeMatch = menus.some(function find(m): boolean {
          return m.code === routeOrCode || m.children?.some(find)
        })
        if (codeMatch) return true
        return menuRoutes.some((r) => routeOrCode === r || routeOrCode.startsWith(r + '/'))
      },

      isPathAllowed: (pathname) => {
        if (get().isSuperAdmin()) return true
        if (ALWAYS_ALLOWED.some((r) => pathname === r || pathname.startsWith(r + '/'))) return true
        const { menuRoutes } = get()
        return menuRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))
      },
    }),
    {
      name: 'erp-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
