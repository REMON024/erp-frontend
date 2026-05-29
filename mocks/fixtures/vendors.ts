import type { Vendor, VendorContract } from '@/types'
import data from './vendors.json'
import type { VendorPayment } from './mock-types'
export const MOCK_VENDORS          = data.vendors       as unknown as Vendor[]
export const MOCK_VENDOR_CONTRACTS = data.vendorContracts as unknown as VendorContract[]
export const MOCK_VENDOR_PAYMENTS  = data.vendorPayments  as unknown as VendorPayment[]
