import type { Invoice, Payment, Expense } from '@/types'
import data from './finance.json'
export const MOCK_INVOICES       = data.invoices       as unknown as Invoice[]
export const MOCK_PAYMENTS       = data.payments       as unknown as Payment[]
export const MOCK_EXPENSES       = data.expenses       as unknown as Expense[]
export const MOCK_CASHFLOW       = data.cashflow
export const MOCK_PROFITABILITY  = data.profitability
