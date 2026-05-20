'use client'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { MOCK_CREDENTIALS } from '@/mocks/fixtures/users'
import { Role } from '@/types'
import { cn } from '@/utils/cn'
import { ChevronUp, Zap } from 'lucide-react'

const ROLE_COLORS: Record<Role, string> = {
  super_admin:          'bg-purple-600',
  company_admin:        'bg-blue-700',
  project_manager:      'bg-blue-500',
  site_engineer:        'bg-cyan-600',
  procurement_officer:  'bg-amber-600',
  accountant:           'bg-green-600',
  store_manager:        'bg-orange-500',
  contractor:           'bg-slate-600',
  vendor:               'bg-pink-600',
  employee:             'bg-gray-500',
}

export function DevRoleSwitcher() {
  const [open, setOpen] = useState(false)
  const { user, setAuth } = useAuthStore()

  const switchRole = (cred: typeof MOCK_CREDENTIALS[0]) => {
    setAuth(cred.user, `mock-token-dev-${cred.user.id}`)
    setOpen(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {open && (
        <div className="mb-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-56">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Switch Role</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {MOCK_CREDENTIALS.map((cred) => (
              <button
                key={cred.user.id}
                onClick={() => switchRole(cred)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors',
                  user?.id === cred.user.id && 'bg-blue-50'
                )}
              >
                <span className={cn('w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold shrink-0', ROLE_COLORS[cred.user.role])}>
                  {cred.user.first_name[0]}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{cred.user.first_name} {cred.user.last_name}</p>
                  <p className="text-xs text-slate-400 capitalize truncate">{cred.user.role.replace(/_/g, ' ')}</p>
                </div>
                {user?.id === cred.user.id && (
                  <span className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-lg hover:bg-slate-700 transition-colors"
      >
        <Zap className="w-3.5 h-3.5 text-yellow-400" />
        <span className="capitalize">{user?.role?.replace(/_/g, ' ') ?? 'No role'}</span>
        <ChevronUp className={cn('w-3.5 h-3.5 transition-transform', !open && 'rotate-180')} />
      </button>
    </div>
  )
}
