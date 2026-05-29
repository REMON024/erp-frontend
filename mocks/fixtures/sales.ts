import type { Customer, Unit, Sale, PaymentSchedule, Collection } from '@/types'
import data from './sales.json'
export const MOCK_CUSTOMERS   = data.customers   as unknown as Customer[]
export const MOCK_UNITS       = data.units       as unknown as Unit[]
export const MOCK_SALES       = data.sales       as unknown as Sale[]
export const MOCK_SCHEDULES   = data.schedules   as unknown as PaymentSchedule[]
export const MOCK_COLLECTIONS = data.collections as unknown as Collection[]
