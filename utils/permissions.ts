import { Role } from '@/types'

const MODULE_ACCESS: Record<string, Role[]> = {
  dashboard: ['super_admin', 'company_admin', 'project_manager', 'site_engineer', 'procurement_officer', 'accountant', 'store_manager', 'contractor', 'employee'],
  projects: ['super_admin', 'company_admin', 'project_manager', 'site_engineer'],
  tasks: ['super_admin', 'company_admin', 'project_manager', 'site_engineer', 'contractor', 'employee'],
  gantt: ['super_admin', 'company_admin', 'project_manager'],
  vendors: ['super_admin', 'company_admin', 'procurement_officer'],
  contractors: ['super_admin', 'company_admin', 'project_manager', 'procurement_officer'],
  inventory: ['super_admin', 'company_admin', 'store_manager', 'procurement_officer', 'site_engineer'],
  procurement: ['super_admin', 'company_admin', 'procurement_officer', 'project_manager'],
  equipment: ['super_admin', 'company_admin', 'project_manager', 'site_engineer'],
  safety: ['super_admin', 'company_admin', 'project_manager', 'site_engineer', 'employee'],
  compliance: ['super_admin', 'company_admin', 'project_manager'],
  finance: ['super_admin', 'company_admin', 'accountant'],
  documents: ['super_admin', 'company_admin', 'project_manager', 'site_engineer', 'accountant', 'procurement_officer'],
  reports: ['super_admin', 'company_admin', 'accountant', 'project_manager'],
}

export function canAccess(module: string, role: Role): boolean {
  return MODULE_ACCESS[module]?.includes(role) ?? false
}

export function getAccessibleModules(role: Role): string[] {
  return Object.keys(MODULE_ACCESS).filter((m) => canAccess(m, role))
}
