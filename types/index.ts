// ─── Auth ───────────────────────────────────────────────────────────────────
export type Role =
  | 'super_admin'
  | 'company_admin'
  | 'project_manager'
  | 'site_engineer'
  | 'procurement_officer'
  | 'accountant'
  | 'store_manager'
  | 'contractor'
  | 'vendor'
  | 'employee'

export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: Role
  phone?: string
  status: boolean
  created_at: string
}

export interface AuthTokens {
  token: string
  refresh_token: string
  expires_in: number
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
  status: ProjectStatus
  progress: number
  manager_id: string
  manager?: User
  created_at: string
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
  warehouse_id?: string
  warehouse?: Warehouse
  category?: string
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
