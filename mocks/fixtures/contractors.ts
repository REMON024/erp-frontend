import { Contractor, ContractorAttendance } from '@/types'

export const MOCK_CONTRACTORS: Contractor[] = [
  { id: 'c1', company_name: 'Babul Construction Co.',     contact_person: 'Babul Mia',      email: 'babul@babulcon.com',  phone: '01811111111', address: 'Keraniganj, Dhaka',  rating: 4.3, status: 'active', created_at: '2024-01-20T00:00:00Z' },
  { id: 'c2', company_name: 'Alam Builders Ltd',           contact_person: 'Alam Hossain',   email: 'alam@alambuilders.com',phone: '01822222222', address: 'Savar, Dhaka',       rating: 4.0, status: 'active', created_at: '2024-02-14T00:00:00Z' },
  { id: 'c3', company_name: 'Dhaka Civil Works',           contact_person: 'Rokib Khan',     email: 'rokib@dcw.com',       phone: '01833333333', address: 'Tongi, Gazipur',     rating: 3.7, status: 'active', created_at: '2024-03-05T00:00:00Z' },
  { id: 'c4', company_name: 'Modern Steel Fabricators',   contact_person: 'Jamal Uddin',    email: 'jamal@msf.com',       phone: '01844444444', address: 'Demra, Dhaka',       rating: 4.6, status: 'active', created_at: '2024-04-10T00:00:00Z' },
  { id: 'c5', company_name: 'Supreme Finishing Works',     contact_person: 'Sumon Biswas',   email: 'sumon@sfw.com',       phone: '01855555555', address: 'Mirpur, Dhaka',      rating: 3.9, status: 'inactive', created_at: '2024-06-01T00:00:00Z' },
]

// Generate 30 days of attendance for contractor c1 on project p1
function generateAttendance(contractorId: string, projectId: string, month: number, year: number): ContractorAttendance[] {
  const records: ContractorAttendance[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  const statuses: ContractorAttendance['status'][] = ['present', 'present', 'present', 'present', 'absent', 'present', 'half_day']

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    if (date.getDay() === 5) continue // skip Friday
    records.push({
      id: `att-${contractorId}-${year}-${month}-${d}`,
      contractor_id: contractorId,
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      status: statuses[(d - 1) % statuses.length],
      project_id: projectId,
    })
  }
  return records
}

export const MOCK_ATTENDANCE: ContractorAttendance[] = [
  ...generateAttendance('c1', 'p1', 4, 2025),
  ...generateAttendance('c1', 'p1', 5, 2025),
  ...generateAttendance('c2', 'p1', 4, 2025),
  ...generateAttendance('c2', 'p1', 5, 2025),
]

export interface ContractorPayment { id: string; contractor_id: string; project_id: string; amount: number; paid_date: string; description: string }

export const MOCK_CONTRACTOR_PAYMENTS: ContractorPayment[] = [
  { id: 'cp1', contractor_id: 'c1', project_id: 'p1', amount: 3500000, paid_date: '2025-04-30', description: 'Monthly progress payment – April 2025' },
  { id: 'cp2', contractor_id: 'c1', project_id: 'p1', amount: 3500000, paid_date: '2025-03-31', description: 'Monthly progress payment – March 2025' },
  { id: 'cp3', contractor_id: 'c2', project_id: 'p1', amount: 2200000, paid_date: '2025-04-30', description: 'Structural work – April 2025' },
  { id: 'cp4', contractor_id: 'c3', project_id: 'p2', amount: 1800000, paid_date: '2025-04-30', description: 'Boundary wall progress – April 2025' },
  { id: 'cp5', contractor_id: 'c4', project_id: 'p3', amount: 4500000, paid_date: '2025-04-30', description: 'Fit-out works – April 2025' },
]
