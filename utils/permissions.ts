import { Role } from '@/types'

// ─── Role → module preview (UsersPage "effective access" hint only) ───────────
// The AUTHORITATIVE page/API gate is the backend RoleMenuPermission matrix,
// surfaced to the client via /menus/my-menus and enforced on every API.
// This map is a coarse, illustrative preview shown while assigning roles —
// it does NOT gate any route. super_admin is all-access by default.

export type Access = 'NONE' | 'FULL'

// Per-role module access. A module is granted if ANY of the user's roles lists it.
const ROLE_MODULES: Record<Role, string[]> = {
  super_admin: [], // all-access — handled in accessOf
  operations: [
    'dashboard', 'projects', 'estimation', 'investors', 'investment',
    'purchase', 'sales', 'accounting', 'profit-distribution', 'reports', 'settings',
  ],
  inventory: [
    'dashboard', 'projects', 'inventory', 'reports', 'settings',
  ],
  engineer: [
    'dashboard', 'projects', 'estimation', 'reports',
  ],
}

const ADMIN_MODULES = ['users', 'roles', 'menus', 'audit-logs']

export function accessOf(role: Role, module: string): Access {
  if (role === 'super_admin') return 'FULL' // all-access by default
  if (ADMIN_MODULES.includes(module)) return 'NONE' // only super_admin administers
  return (ROLE_MODULES[role] ?? []).includes(module) ? 'FULL' : 'NONE'
}

/** Union resolution: most-permissive grant across the user's whole role set. */
export function effectiveAccess(roles: Role[], module: string): Access {
  return roles.some((r) => accessOf(r, module) === 'FULL') ? 'FULL' : 'NONE'
}

export function canAccess(module: string, roles: Role | Role[]): boolean {
  const set = Array.isArray(roles) ? roles : [roles]
  return effectiveAccess(set, module) === 'FULL'
}

export function getAccessibleModules(roles: Role | Role[]): string[] {
  const set = Array.isArray(roles) ? roles : [roles]
  const all = new Set<string>([
    'dashboard', 'projects', 'estimation', 'investors', 'investment', 'purchase',
    'inventory', 'sales', 'accounting', 'profit-distribution', 'reports', 'settings',
    'users', 'roles', 'menus', 'audit-logs', 'companies',
  ])
  return [...all].filter((m) => canAccess(m, set))
}
