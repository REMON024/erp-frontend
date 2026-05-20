import { User } from '@/types'

export interface MockCredential { email: string; password: string; user: User }

export const MOCK_CREDENTIALS: MockCredential[] = [
  { email: 'superadmin@erp.com', password: 'admin123', user: { id: 'u1', first_name: 'Super', last_name: 'Admin', email: 'superadmin@erp.com', role: 'super_admin', phone: '01700000001', status: true, created_at: '2024-01-01T00:00:00Z' } },
  { email: 'admin@erp.com', password: 'admin123', user: { id: 'u2', first_name: 'Company', last_name: 'Admin', email: 'admin@erp.com', role: 'company_admin', phone: '01700000002', status: true, created_at: '2024-01-01T00:00:00Z' } },
  { email: 'pm@erp.com', password: 'pm123', user: { id: 'u3', first_name: 'Rahim', last_name: 'Uddin', email: 'pm@erp.com', role: 'project_manager', phone: '01700000003', status: true, created_at: '2024-01-01T00:00:00Z' } },
  { email: 'engineer@erp.com', password: 'eng123', user: { id: 'u4', first_name: 'Karim', last_name: 'Hossain', email: 'engineer@erp.com', role: 'site_engineer', phone: '01700000004', status: true, created_at: '2024-01-01T00:00:00Z' } },
  { email: 'procurement@erp.com', password: 'proc123', user: { id: 'u5', first_name: 'Nasrin', last_name: 'Akter', email: 'procurement@erp.com', role: 'procurement_officer', phone: '01700000005', status: true, created_at: '2024-01-01T00:00:00Z' } },
  { email: 'accounts@erp.com', password: 'acc123', user: { id: 'u6', first_name: 'Farida', last_name: 'Begum', email: 'accounts@erp.com', role: 'accountant', phone: '01700000006', status: true, created_at: '2024-01-01T00:00:00Z' } },
  { email: 'store@erp.com', password: 'store123', user: { id: 'u7', first_name: 'Jalal', last_name: 'Ahmed', email: 'store@erp.com', role: 'store_manager', phone: '01700000007', status: true, created_at: '2024-01-01T00:00:00Z' } },
  { email: 'contractor@erp.com', password: 'con123', user: { id: 'u8', first_name: 'Babul', last_name: 'Mia', email: 'contractor@erp.com', role: 'contractor', phone: '01700000008', status: true, created_at: '2024-01-01T00:00:00Z' } },
  { email: 'vendor@erp.com', password: 'ven123', user: { id: 'u9', first_name: 'Mostofa', last_name: 'Ali', email: 'vendor@erp.com', role: 'vendor', phone: '01700000009', status: true, created_at: '2024-01-01T00:00:00Z' } },
  { email: 'emp@erp.com', password: 'emp123', user: { id: 'u10', first_name: 'Sumaiya', last_name: 'Khatun', email: 'emp@erp.com', role: 'employee', phone: '01700000010', status: true, created_at: '2024-01-01T00:00:00Z' } },
]

export const MOCK_USERS: User[] = MOCK_CREDENTIALS.map((c) => c.user)
