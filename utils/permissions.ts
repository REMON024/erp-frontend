import { Role } from '@/types'

const MODULE_ACCESS: Record<string, Role[]> = {
  dashboard:    ['super_admin', 'company_admin', 'project_manager', 'site_engineer', 'procurement_officer', 'accountant', 'store_manager', 'contractor', 'employee'],
  projects:     ['super_admin', 'company_admin', 'project_manager', 'site_engineer'],
  gantt:        ['super_admin', 'company_admin', 'project_manager'],
  documents:    ['super_admin', 'company_admin', 'project_manager', 'site_engineer', 'accountant', 'procurement_officer'],
  compliance:   ['super_admin', 'company_admin', 'project_manager'],
  equipment:    ['super_admin', 'company_admin', 'project_manager', 'site_engineer'],
  safety:       ['super_admin', 'company_admin', 'project_manager', 'site_engineer', 'employee'],
  vendors:      ['super_admin', 'company_admin', 'procurement_officer'],
  inventory:    ['super_admin', 'company_admin', 'store_manager', 'procurement_officer', 'site_engineer'],
  finance:      ['super_admin', 'company_admin', 'accountant'],
  settings:     ['super_admin', 'company_admin', 'project_manager', 'site_engineer', 'procurement_officer', 'accountant', 'store_manager', 'contractor', 'employee'],
}

export function canAccess(module: string, role: Role): boolean {
  return MODULE_ACCESS[module]?.includes(role) ?? false
}

export function getAccessibleModules(role: Role): string[] {
  return Object.keys(MODULE_ACCESS).filter((m) => canAccess(m, role))
}
