import { PurchaseRequest, PurchaseOrder } from '@/types'

export const MOCK_PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: 'pr1', project_id: 'p1', requested_by: 'u4', status: 'approved', created_at: '2025-05-10T09:00:00Z',
    items: [
      { id: 'pri1', material_id: 'm1', quantity: 20, unit: 'ton',  estimated_price: 120000 },
      { id: 'pri2', material_id: 'm2', quantity: 300, unit: 'bag', estimated_price: 450 },
    ],
  },
  {
    id: 'pr2', project_id: 'p1', requested_by: 'u4', status: 'submitted', created_at: '2025-05-18T11:00:00Z',
    items: [
      { id: 'pri3', material_id: 'm7', quantity: 50, unit: 'pcs', estimated_price: 550 },
      { id: 'pri4', material_id: 'm8', quantity: 200, unit: 'mtr', estimated_price: 85 },
    ],
  },
  {
    id: 'pr3', project_id: 'p2', requested_by: 'u4', status: 'draft', created_at: '2025-05-20T14:00:00Z',
    items: [
      { id: 'pri5', material_id: 'm6', quantity: 5000, unit: 'pcs', estimated_price: 12 },
    ],
  },
  {
    id: 'pr4', project_id: 'p1', requested_by: 'u4', status: 'rejected', created_at: '2025-05-05T08:00:00Z',
    items: [
      { id: 'pri6', material_id: 'm9', quantity: 100, unit: 'box', estimated_price: 3200 },
    ],
  },
  {
    id: 'pr5', project_id: 'p3', requested_by: 'u4', status: 'po_created', created_at: '2025-04-28T10:00:00Z',
    items: [
      { id: 'pri7', material_id: 'm10', quantity: 40, unit: 'drum', estimated_price: 4500 },
    ],
  },
]

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po1', vendor_id: 'v1', project_id: 'p1', po_number: 'PO-2025-031',
    total_amount: 2640000, status: 'received', created_at: '2025-05-12T09:00:00Z',
    items: [
      { id: 'poi1', material_id: 'm1', quantity: 20, unit_price: 132000, total: 2640000 },
    ],
  },
  {
    id: 'po2', vendor_id: 'v2', project_id: 'p1', po_number: 'PO-2025-038',
    total_amount: 148500, status: 'sent', created_at: '2025-05-19T10:00:00Z',
    items: [
      { id: 'poi2', material_id: 'm2', quantity: 300, unit_price: 495, total: 148500 },
    ],
  },
  {
    id: 'po3', vendor_id: 'v4', project_id: 'p1', po_number: 'PO-2025-041',
    total_amount: 1284000, status: 'approved', created_at: '2025-05-20T11:00:00Z',
    items: [
      { id: 'poi3', material_id: 'm8', quantity: 600, unit_price: 1140, total: 684000 },
      { id: 'poi4', material_id: 'm7', quantity: 100, unit_price: 6000, total: 600000 },
    ],
  },
  {
    id: 'po4', vendor_id: 'v3', project_id: 'p2', po_number: 'PO-2025-022',
    total_amount: 525000, status: 'received', created_at: '2025-04-20T09:00:00Z',
    items: [
      { id: 'poi5', material_id: 'm3', quantity: 500, unit_price: 1050, total: 525000 },
    ],
  },
]
