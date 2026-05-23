// ─── Auth ───────────────────────────────────────────────────────────────────
export type Role =
  | 'super_admin'
  | 'operations'
  | 'inventory'

export interface User {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  role: Role
  roleId: string
  phoneNumber?: string | null
  isActive: boolean
  createdAt: string
  lastLoginAt?: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: User
}

// ─── Project ─────────────────────────────────────────────────────────────────
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'

export interface Project {
  id: string
  name: string
  code: string
  client_name: string
  location: string
  start_date: string
  end_date: string
  budget: number
  spent: number
  budget_total?: number
  budget_spent?: number
  status: ProjectStatus
  progress: number
  manager_id: string
  manager?: User
  created_at: string
  type?: string
  members_count?: number
  vendor?: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
  user?: User
}

export interface DailyLog {
  id: string
  project_id: string
  date: string
  description: string
  created_by: string
  weather?: string
  workers_count?: number
}

// ─── Task ────────────────────────────────────────────────────────────────────
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'done'

export interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  assigned_to: string
  assignee?: User
  start_date: string
  due_date: string
  priority: TaskPriority
  status: TaskStatus
  progress: number
  subtasks?: Subtask[]
  comments?: TaskComment[]
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  done: boolean
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  user?: User
  text: string
  created_at: string
}

// ─── Milestone ───────────────────────────────────────────────────────────────
export type MilestoneStatus = 'pending' | 'achieved' | 'delayed'

export interface Milestone {
  id: string
  project_id: string
  name: string
  due_date: string
  status: MilestoneStatus
}

// ─── Vendor ──────────────────────────────────────────────────────────────────
export interface Vendor {
  id: string
  company_name: string
  name?: string
  company?: string
  contact_person: string
  email: string
  phone: string
  address: string
  rating?: number
  status: 'active' | 'inactive'
  created_at: string
}

export interface VendorContract {
  id: string
  vendor_id: string
  title: string
  value: number
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
}

// ─── Contractor ──────────────────────────────────────────────────────────────
export interface Contractor {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  address: string
  rating?: number
  status: 'active' | 'inactive'
  created_at: string
}

export interface ContractorAttendance {
  id: string
  contractor_id: string
  date: string
  status: 'present' | 'absent' | 'half_day'
  project_id: string
}

// ─── Inventory ───────────────────────────────────────────────────────────────
export interface Warehouse {
  id: string
  name: string
  location: string
}

export interface Material {
  id: string
  name: string
  sku: string
  unit: string
  stock_quantity: number
  reorder_level: number
  max_quantity?: number
  warehouse_id?: string
  warehouse?: Warehouse
  category?: string
  supplier?: string
  cost_per_unit?: number
  avg_consumption?: string
  last_delivery_date?: string
}

export type StockTransactionType = 'in' | 'out' | 'transfer' | 'wastage'

export interface StockTransaction {
  id: string
  material_id: string
  material?: Material
  warehouse_id: string
  type: StockTransactionType
  quantity: number
  reference_no?: string
  project_id?: string
  created_at: string
  created_by?: string
}

// ─── Procurement ─────────────────────────────────────────────────────────────
export type PRStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'po_created'
export type POStatus = 'draft' | 'sent' | 'approved' | 'received' | 'cancelled'

export interface PurchaseRequest {
  id: string
  project_id: string
  requested_by: string
  requester?: User
  status: PRStatus
  items: PRItem[]
  created_at: string
}

export interface PRItem {
  id: string
  material_id: string
  material?: Material
  quantity: number
  unit: string
  estimated_price?: number
}

export interface PurchaseOrder {
  id: string
  vendor_id: string
  vendor?: Vendor
  project_id: string
  po_number: string
  total_amount: number
  status: POStatus
  items: POItem[]
  created_at: string
}

export interface POItem {
  id: string
  material_id: string
  material?: Material
  quantity: number
  unit_price: number
  total: number
}

// ─── Equipment ───────────────────────────────────────────────────────────────
export type EquipmentStatus = 'available' | 'allocated' | 'maintenance' | 'retired'

export interface Equipment {
  id: string
  name: string
  code: string
  category: string
  status: EquipmentStatus
  purchase_date: string
  allocated_project_id?: string
  allocated_project?: Project
  last_service_date?: string
  next_service_date?: string
}

export interface EquipmentMaintenance {
  id: string
  equipment_id: string
  service_date: string
  cost: number
  remarks: string
  next_service_date?: string
}

// ─── Finance ─────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: string
  project_id: string
  project?: Project
  invoice_number: string
  amount: number
  due_date: string
  status: InvoiceStatus
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_date: string
  payment_method: 'bank_transfer' | 'cheque' | 'cash' | 'online'
}

export interface Expense {
  id: string
  project_id: string
  category: string
  amount: number
  expense_date: string
  description: string
  created_by?: string
}

// ─── Document ────────────────────────────────────────────────────────────────
export interface Document {
  id: string
  module_name: string
  reference_id: string
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  version?: number
  uploaded_by: string
  uploader?: User
  uploaded_at: string
}

// ─── Safety & Compliance ─────────────────────────────────────────────────────
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SafetyIncident {
  id: string
  project_id: string
  title: string
  description: string
  severity: IncidentSeverity
  date: string
  reported_by: string
  status: 'open' | 'investigating' | 'resolved'
}

export interface CompliancePermit {
  id: string
  project_id: string
  title: string
  permit_number: string
  issuing_authority?: string
  issue_date?: string
  expiry_date: string
  status: 'active' | 'expired' | 'pending_renewal' | 'pending'
  document_url?: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardSummary {
  active_projects: number
  total_projects: number
  pending_tasks: number
  overdue_tasks: number
  budget_utilized: number
  budget_total: number
  inventory_alerts: number
  equipment_alerts: number
  cash_inflow: number
  cash_outflow: number
  recent_activities: Activity[]
  contractor_performance: ContractorPerf[]
  cash_flow_monthly: CashFlowMonth[]
}

export interface Activity {
  id: string
  user: string
  action: string
  module: string
  time: string
}

export interface ContractorPerf {
  name: string
  attendance: number
  quality: number
  timeliness: number
}

export interface CashFlowMonth {
  month: string
  inflow: number
  outflow: number
}

// ─── Sales ───────────────────────────────────────────────────────────────────
export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  nid?: string
  created_at: string
}

export type UnitType = 'apartment' | 'villa' | 'commercial' | 'plot'
export type UnitStatus = 'available' | 'booked' | 'sold' | 'reserved'

export interface Unit {
  id: string
  project_id: string
  unit_number: string
  type: UnitType
  floor?: number
  area_sqft: number
  price: number
  status: UnitStatus
}

export type SaleStatus = 'booked' | 'active' | 'completed' | 'cancelled'

export interface Sale {
  id: string
  project_id: string
  unit_id: string
  unit?: Unit
  customer_id: string
  customer?: Customer
  sale_date: string
  total_price: number
  discount: number
  net_price: number
  status: SaleStatus
  created_at: string
}

export type ScheduleStatus = 'pending' | 'paid' | 'overdue'

export interface PaymentSchedule {
  id: string
  sale_id: string
  installment_no: number
  description: string
  due_date: string
  amount: number
  status: ScheduleStatus
  paid_date?: string
}

export interface Collection {
  id: string
  sale_id: string
  schedule_id?: string
  customer_id: string
  project_id: string
  amount: number
  payment_date: string
  payment_method: 'bank_transfer' | 'cheque' | 'cash' | 'online'
  reference_no?: string
  created_at: string
}

// ─── Accounts Ledger ─────────────────────────────────────────────────────────
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  parent_id?: string
  balance: number
  is_system?: boolean
}

export interface JournalEntry {
  id: string
  project_id?: string
  date: string
  reference: string
  description: string
  lines: JournalLine[]
  created_by: string
  created_at: string
}

export interface JournalLine {
  id: string
  journal_id: string
  account_id: string
  account?: Account
  debit: number
  credit: number
  description?: string
}

export interface LedgerRow {
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
}

// ─── Construction Costing / BOQ ──────────────────────────────────────────────
export type BOQCategory = 'Civil' | 'Structural' | 'Architectural' | 'Electrical' | 'Plumbing' | 'HVAC' | 'Finishing' | 'Miscellaneous'

export interface BOQItem {
  id: string
  estimate_id: string
  category: BOQCategory
  description: string
  unit: string
  quantity: number
  unit_rate: number
  estimated_amount: number
  actual_amount: number
}

export type EstimateStatus = 'draft' | 'approved' | 'revised'

export interface CostEstimate {
  id: string
  project_id: string
  title: string
  version: number
  status: EstimateStatus
  items: BOQItem[]
  total_estimated: number
  total_actual: number
  variance: number
  created_at: string
}

// ─── Contractor Billing ───────────────────────────────────────────────────────
export type BillStatus = 'draft' | 'submitted' | 'verified' | 'approved' | 'paid'

export interface ContractorBill {
  id: string
  project_id: string
  contractor_id: string
  bill_number: string
  period_from: string
  period_to: string
  items: BillItem[]
  gross_amount: number
  retention_pct: number
  retention_amount: number
  net_payable: number
  paid_amount: number
  status: BillStatus
  remarks?: string
  created_at: string
}

export interface BillItem {
  id: string
  bill_id: string
  description: string
  unit: string
  quantity: number
  rate: number
  amount: number
}

// ─── Change Orders / Variation Orders ────────────────────────────────────────
export type ChangeOrderStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface ChangeOrder {
  id: string
  project_id: string
  sale_id?: string
  reference: string
  title: string
  description: string
  impact_cost: number
  impact_days: number
  status: ChangeOrderStatus
  submitted_by: string
  approved_by?: string
  created_at: string
}

// ─── Snagging / Defects ───────────────────────────────────────────────────────
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type DefectSeverity = 'minor' | 'major' | 'critical'

export interface SnagItem {
  id: string
  project_id: string
  unit_id?: string
  title: string
  description: string
  location: string
  severity: DefectSeverity
  status: DefectStatus
  reported_by: string
  assigned_to?: string
  reported_date: string
  target_date?: string
  resolved_date?: string
}

// ─── Contractor Advances ──────────────────────────────────────────────────────
export type AdvanceStatus = 'requested' | 'approved' | 'disbursed' | 'recovered' | 'closed'

export interface ContractorAdvance {
  id: string
  project_id: string
  contractor_id: string
  amount: number
  purpose: string
  status: AdvanceStatus
  disbursed_date?: string
  recovered_amount: number
  recovery_pct: number
  created_at: string
}

// ─── Retention Release ────────────────────────────────────────────────────────
export type RetentionPhase = 'practical_completion' | 'defects_liability'

export interface RetentionRelease {
  id: string
  project_id: string
  contractor_id: string
  bill_id: string
  amount: number
  release_date: string
  phase: RetentionPhase
  created_at: string
}

// ─── Shared ──────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status: number
}
