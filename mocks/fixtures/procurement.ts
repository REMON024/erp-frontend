import type { PurchaseRequest, PurchaseOrder } from '@/types'
import data from './procurement.json'
export const MOCK_PURCHASE_REQUESTS = data.purchaseRequests as unknown as PurchaseRequest[]
export const MOCK_PURCHASE_ORDERS   = data.purchaseOrders   as unknown as PurchaseOrder[]
