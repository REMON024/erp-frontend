import { Role } from '@/types'

// Coarse module access kept for legacy guards; sidebar uses API-driven permissions.
// company_admin has full access within its own tenant (data isolation is enforced server-side).
const MODULE_ACCESS: Record<string, Role[]> = {
  dashboard:    ['company_admin', 'operations', 'inventory'],
  projects:     ['company_admin', 'operations', 'inventory'],
  investors:    ['company_admin', 'operations'],
  purchase:     ['company_admin', 'operations', 'inventory'],
  inventory:    ['company_admin', 'operations', 'inventory'],
  sales:        ['company_admin', 'operations'],
  accounting:   ['company_admin', 'operations'],
  reports:      ['company_admin', 'operations', 'inventory'],
  users:        ['company_admin'],
  roles:        ['company_admin'],
  menus:        ['company_admin'],
  'audit-logs': ['company_admin'],
  settings:     ['company_admin', 'operations', 'inventory'],
  companies:    ['super_admin'],
}

export function canAccess(module: string, role: Role): boolean {
  return MODULE_ACCESS[module]?.includes(role) ?? false
}

export function getAccessibleModules(role: Role): string[] {
  return Object.keys(MODULE_ACCESS).filter((m) => canAccess(m, role))
}
