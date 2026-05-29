import type { CompliancePermit } from '@/types'
import data from './compliance.json'
import type { ComplianceDocument } from './mock-types'
export const MOCK_PERMITS         = data.permits       as unknown as CompliancePermit[]
export const MOCK_COMPLIANCE_DOCS = data.complianceDocs as unknown as ComplianceDocument[]
export type { ComplianceDocument } from './mock-types'
