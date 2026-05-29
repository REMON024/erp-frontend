import type { Material, Warehouse, StockTransaction } from '@/types'
import data from './inventory.json'
export const MOCK_WAREHOUSES        = data.warehouses       as unknown as Warehouse[]
export const MOCK_MATERIALS         = data.materials        as unknown as Material[]
export const MOCK_STOCK_ALERTS      = data.stockAlerts      as unknown as Material[]
export const MOCK_STOCK_TRANSACTIONS = data.stockTransactions as unknown as StockTransaction[]
