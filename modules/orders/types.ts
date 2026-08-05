import type { ResourceType } from '@/modules/inventory/ResourceMasterPage'

/** The two kinds of vendor commitment the Orders screen creates. */
export type OrderType = 'Purchase' | 'Work'

export interface Project  { id: number; projectName: string; projectCode: string }
export interface Vendor   { id: number; vendorName: string; vendorType: string }
export interface Material { id: number; resourceName: string; unit: string; averageCost: number }
export interface Account  { id: number; accountCode: string; accountName: string; accountType: string }

/** One row of the merged list — the union of what both order types display. */
export interface OrderListItem {
  orderType: OrderType
  id: number
  orderNo: string
  projectId?: number | null
  projectName?: string | null
  vendorId: number
  vendorName: string
  orderDate: string
  amount: number
  status: string
  // Purchase only
  deliveryDate?: string | null
  // Work only
  scope?: string | null
  endDate?: string | null
  advanceAmount?: number | null
  retentionPercent?: number | null
  lineCount: number
  // Which part of the build the order covers. Both types store the full ancestor chain.
  blockId?: number | null
  blockName?: string | null
  floorId?: number | null
  floorName?: string | null
  unitId?: number | null
  unitNo?: string | null
  scopeLevel: ScopeLevel
  /** Pre-rendered, e.g. "Block A / Level 3 / A-101" — or "Whole project" / "General stock". */
  scopeLabel: string
}

/** "General" is purchase-only: stock bought against no project at all. */
export type ScopeLevel = 'Project' | 'Block' | 'Floor' | 'Unit' | 'General'

export const SCOPE_COLORS: Record<ScopeLevel, string> = {
  General: 'bg-surface-muted text-content-muted',
  Project: 'bg-surface-muted text-content-muted',
  Block:   'bg-info/10 text-info',
  Floor:   'bg-primary/10 text-primary',
  Unit:    'bg-success/10 text-success',
}

export interface OrderCapabilities {
  canCreatePurchase: boolean
  canCreateWork: boolean
  canViewPurchase: boolean
  canViewWork: boolean
}

/** A line being edited, before it is shaped into the payload its order type expects. */
export interface DraftOrderLine {
  key: string
  resourceId?: number
  resourceType: ResourceType
  /** Narrowing step between type and resource; not sent to the API — the resource carries it. */
  categoryId?: number
  description: string
  unit: string
  quantity: number
  unitRate: number
  /** Purchase only: why this line has no approved-EPL match (warn-mode, PRD-04). */
  unmatchedReason?: string
}

export function newOrderLine(): DraftOrderLine {
  return {
    key: Math.random().toString(36).slice(2),
    resourceId: undefined, resourceType: 'Material', categoryId: undefined,
    description: '', unit: '', quantity: 1, unitRate: 0, unmatchedReason: '',
  }
}

/**
 * The lifecycles stay deliberately different: a purchase order is Approved then Received,
 * a work order becomes Active then Completed.
 */
export const STATUS_COLORS: Record<string, string> = {
  Draft:     'bg-surface-muted text-content-muted',
  Approved:  'bg-success/10 text-success',
  Received:  'bg-primary/10 text-primary',
  Active:    'bg-success/10 text-success',
  Completed: 'bg-primary/10 text-primary',
  Cancelled: 'bg-danger/10 text-danger',
}

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  Purchase: 'Purchase Order',
  Work:     'Work Order',
}

export function fmt(n: number)     { return `৳${n.toLocaleString('en-BD')}` }
export function isoToday()         { return new Date().toISOString().split('T')[0] }

export const inp  = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
export const lbl  = 'block text-sm font-medium text-content mb-1'
export const tinp = 'border border-border-default rounded px-2 py-1 text-xs focus:ring-1 focus:ring-primary/40 focus:outline-none w-full'
