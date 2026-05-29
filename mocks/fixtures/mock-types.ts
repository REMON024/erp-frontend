export interface HazardReport {
  id: string; project_id: string; title: string; location: string
  description: string; risk_level: 'low' | 'medium' | 'high'
  reported_by: string; date: string; status: 'open' | 'mitigated'
}

export interface SafetyInspection {
  id: string; project_id: string; title: string; inspector: string
  date: string; score: number; status: 'passed' | 'failed' | 'pending'
  notes: string
}

export interface TrainingRecord {
  id: string; title: string; conducted_by: string; date: string
  participants: number; validity_months: number; expiry_date: string
}

export interface ComplianceDocument {
  id: string; project_id: string; title: string
  category: 'legal' | 'environmental' | 'labor' | 'safety' | 'financial'
  file_name: string; uploaded_by: string; uploaded_at: string; notes: string
}

export interface VendorPayment {
  id: string; vendor_id: string; po_number: string
  amount: number; paid_date: string; method: string
}

export interface ContractorPayment {
  id: string; contractor_id: string; project_id: string
  amount: number; paid_date: string; description: string
}
