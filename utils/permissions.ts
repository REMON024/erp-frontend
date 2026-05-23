import { Role } from '@/types'

// Coarse module access kept for legacy guards; sidebar uses API-driven permissions
const MODULE_ACCESS: Record<string, Role[]> = {
  dashboard:    ['super_admin', 'operations', 'inventory'],
  projects:     ['super_admin', 'operations', 'inventory'],
  investors:    ['super_admin', 'operations'],
  purchase:     ['super_admin', 'operations', 'inventory'],
  inventory:    ['super_admin', 'operations', 'inventory'],
  sales:        ['super_admin', 'operations'],
  accounting:   ['super_admin', 'operations'],
  reports:      ['super_admin', 'operations', 'inventory'],
  users:        ['super_admin'],
  roles:        ['super_admin'],
  menus:        ['super_admin'],
  'audit-logs': ['super_admin'],
  settings:     ['super_admin', 'operations', 'inventory'],
}

export function canAccess(module: string, role: Role): boolean {
  return MODULE_ACCESS[module]?.includes(role) ?? false
}

export function getAccessibleModules(role: Role): string[] {
  return Object.keys(MODULE_ACCESS).filter((m) => canAccess(m, role))
}
