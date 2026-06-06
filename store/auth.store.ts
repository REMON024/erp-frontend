'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, Role } from '@/types'
import { canAccess } from '@/utils/permissions'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setHasHydrated: (val: boolean) => void
  setAuth: (user: User, token: string) => void
  logout: () => void
  hasAccess: (module: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('erp_token', token)
          localStorage.setItem('erp_user', JSON.stringify(user))
          // Cookie for middleware route protection (session-scoped)
          document.cookie = `erp_token=${token}; path=/; SameSite=Lax`
        }
        set({ user, token, isAuthenticated: true })
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('erp_token')
          localStorage.removeItem('erp_user')
          document.cookie = 'erp_token=; path=/; max-age=0'
        }
        set({ user: null, token: null, isAuthenticated: false })
      },

      hasAccess: (module) => {
        const user = get().user
        if (!user) return false
        return canAccess(module, user.role as Role)
      },
    }),
    {
      name: 'erp-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
