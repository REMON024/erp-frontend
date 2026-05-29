import type { Contractor, ContractorAttendance } from '@/types'
import data from './contractors.json'
import type { ContractorPayment } from './mock-types'
export const MOCK_CONTRACTORS        = data.contractors       as unknown as Contractor[]
export const MOCK_ATTENDANCE         = data.attendance        as unknown as ContractorAttendance[]
export const MOCK_CONTRACTOR_PAYMENTS = data.contractorPayments as unknown as ContractorPayment[]
