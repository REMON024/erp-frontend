import { CompliancePermit } from '@/types'

export const MOCK_PERMITS: CompliancePermit[] = [
  { id: 'cp1', project_id: 'p1', title: 'RAJUK Construction Permit',           permit_number: 'RAJUK-2025-0312', issuing_authority: 'RAJUK',            issue_date: '2025-01-15', expiry_date: '2026-01-14', status: 'active' },
  { id: 'cp2', project_id: 'p1', title: 'Environmental Clearance Certificate', permit_number: 'DoE-2025-0089',   issuing_authority: 'Dept. of Environment', issue_date: '2025-02-01', expiry_date: '2025-08-01', status: 'active' },
  { id: 'cp3', project_id: 'p2', title: 'Fire Safety NOC',                     permit_number: 'FSCD-2025-0211',  issuing_authority: 'Fire Service & CD',  issue_date: '2025-03-10', expiry_date: '2025-09-10', status: 'expired' },
  { id: 'cp4', project_id: 'p2', title: 'Electrical Wiring Permit',            permit_number: 'DESCO-2025-0445', issuing_authority: 'DESCO',              issue_date: '2025-04-05', expiry_date: '2025-10-05', status: 'active' },
  { id: 'cp5', project_id: 'p3', title: 'Lift Installation Clearance',         permit_number: 'DLI-2025-0037',   issuing_authority: 'Dept. of Labour',    issue_date: '2025-05-01', expiry_date: '2026-05-01', status: 'active' },
  { id: 'cp6', project_id: 'p1', title: 'Site Advertisement Board Approval',   permit_number: 'DCC-2025-0778',   issuing_authority: 'DNCC',               issue_date: '2025-01-20', expiry_date: '2025-07-20', status: 'expired' },
]

export interface ComplianceDocument {
  id: string
  project_id: string
  title: string
  category: 'legal' | 'environmental' | 'labor' | 'safety' | 'financial'
  file_name: string
  uploaded_by: string
  uploaded_at: string
  notes: string
}

export const MOCK_COMPLIANCE_DOCS: ComplianceDocument[] = [
  { id: 'cd1', project_id: 'p1', title: 'Land Ownership Documents',   category: 'legal',         file_name: 'land_ownership_p1.pdf',    uploaded_by: 'u2', uploaded_at: '2025-01-10T09:00:00Z', notes: 'Verified by legal counsel.' },
  { id: 'cd2', project_id: 'p1', title: 'Worker Insurance Policy',    category: 'labor',         file_name: 'worker_insurance_p1.pdf',  uploaded_by: 'u2', uploaded_at: '2025-02-14T10:00:00Z', notes: 'Covers all 150 workers for the year.' },
  { id: 'cd3', project_id: 'p1', title: 'EIA Report',                 category: 'environmental', file_name: 'eia_report_p1.pdf',         uploaded_by: 'u3', uploaded_at: '2025-02-20T11:00:00Z', notes: 'Approved by DoE.' },
  { id: 'cd4', project_id: 'p2', title: 'Structural Design Approval', category: 'safety',        file_name: 'struct_approval_p2.pdf',   uploaded_by: 'u3', uploaded_at: '2025-03-05T09:00:00Z', notes: 'Signed by licensed structural engineer.' },
  { id: 'cd5', project_id: 'p3', title: 'Tax Clearance Certificate',  category: 'financial',     file_name: 'tax_clearance_p3.pdf',     uploaded_by: 'u2', uploaded_at: '2025-04-10T14:00:00Z', notes: 'Valid for FY 2024–25.' },
]
