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

/**
 * What the user may do inside a menu, as returned by GET /menus/my-permissions.
 *
 * Route access and action access are different questions. The menu tree answers "may I open this
 * page"; this answers "may I create, edit or delete once I am there". Until Aug 2026 only the first
 * existed, so a view-only user saw every Create/Edit/Delete control, clicked, and got a 403 — three
 * of the four permissions an admin configures had no effect on what was rendered.
 */
export interface MenuPermission {
  menuId: number
  menuName: string
  menuCode: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve'

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
  /** Action permissions keyed by menu code. */
  permissions: Record<string, MenuPermission>

  setHasHydrated: (val: boolean) => void
  setAuth: (user: User, token: string) => void
  logout: () => void
  loadMenus: () => Promise<void>

  isSuperAdmin: () => boolean
  /** Page/route access — driven by the user's menu set (super_admin sees all). */
  hasAccess: (routeOrCode: string) => boolean
  /**
   * Action access within a menu — the check that decides whether a Create/Edit/Delete control is
   * rendered at all. Mirrors the server's [HasPermission(code, action)] so the UI stops offering
   * what the API will refuse.
   */
  can: (menuCode: string, action?: PermissionAction) => boolean
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
      permissions: {},

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('erp_token', token)
          localStorage.setItem('erp_user', JSON.stringify(user))
          // Cookie for middleware route protection (session-scoped)
          document.cookie = `erp_token=${token}; path=/; SameSite=Lax`
        }
        set({ user, token, isAuthenticated: true, menusLoaded: false, menus: [], menuRoutes: [], permissions: {} })
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('erp_token')
          localStorage.removeItem('erp_user')
          document.cookie = 'erp_token=; path=/; max-age=0'
        }
        set({ user: null, token: null, isAuthenticated: false, menus: [], menuRoutes: [], menusLoaded: false, permissions: {} })
      },

      // Loads navigation and action permissions together — they are two views of one access
      // decision, and a UI that had the menus but not the permissions would render controls it
      // cannot yet judge.
      loadMenus: async () => {
        try {
          const [menuRes, permRes] = await Promise.all([
            api.get<MenuNode[]>('/menus/my-menus'),
            api.get<MenuPermission[]>('/menus/my-permissions'),
          ])
          const permissions: Record<string, MenuPermission> = {}
          for (const p of permRes.data) permissions[p.menuCode] = p
          set({ menus: menuRes.data, menuRoutes: flattenRoutes(menuRes.data), permissions, menusLoaded: true })
        } catch {
          // Don't crash the shell on a transient failure; treat as "no access yet". Failing closed
          // is right here — better to hide an action than to offer one that 403s.
          set({ menus: [], menuRoutes: [], permissions: {}, menusLoaded: true })
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

      can: (menuCode, action = 'view') => {
        if (get().isSuperAdmin()) return true
        const p = get().permissions[menuCode]
        if (!p) return false
        switch (action) {
          case 'create': return p.canCreate
          case 'edit':    return p.canEdit
          case 'delete':  return p.canDelete
          case 'approve': return p.canApprove
          default:        return p.canView
        }
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
