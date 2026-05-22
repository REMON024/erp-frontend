import { ContractorAdvance, RetentionRelease } from '@/types'

export const MOCK_ADVANCES: ContractorAdvance[] = [
  {
    id: 'adv1', project_id: 'p1', contractor_id: 'c1',
    amount: 2000000,
    purpose: 'Mobilization advance for foundation and earthwork phase — equipment hire and labour camp setup',
    status: 'recovered',
    disbursed_date: '2024-06-20',
    recovered_amount: 2000000,
    recovery_pct: 10,
    created_at: '2024-06-18T00:00:00Z',
  },
  {
    id: 'adv2', project_id: 'p1', contractor_id: 'c1',
    amount: 3500000,
    purpose: 'Material advance — structural steel procurement for floors 4–6 to lock in current market price',
    status: 'disbursed',
    disbursed_date: '2024-10-15',
    recovered_amount: 1400000,
    recovery_pct: 20,
    created_at: '2024-10-12T00:00:00Z',
  },
  {
    id: 'adv3', project_id: 'p1', contractor_id: 'c2',
    amount: 800000,
    purpose: 'Mobilization advance for MEP subcontractor — procurement of electrical main distribution boards',
    status: 'approved',
    recovered_amount: 0,
    recovery_pct: 15,
    created_at: '2024-10-20T00:00:00Z',
  },
  {
    id: 'adv4', project_id: 'p2', contractor_id: 'c3',
    amount: 5000000,
    purpose: 'Mobilization advance for villa complex — piling rig mobilization from Chittagong',
    status: 'recovered',
    disbursed_date: '2024-07-05',
    recovered_amount: 5000000,
    recovery_pct: 15,
    created_at: '2024-07-01T00:00:00Z',
  },
  {
    id: 'adv5', project_id: 'p2', contractor_id: 'c3',
    amount: 4000000,
    purpose: 'Material advance — premium marble tiles and granite ordered from Rajshahi for all 3 villas',
    status: 'disbursed',
    disbursed_date: '2024-12-01',
    recovered_amount: 800000,
    recovery_pct: 10,
    created_at: '2024-11-28T00:00:00Z',
  },
]

export const MOCK_RETENTION_RELEASES: RetentionRelease[] = [
  {
    id: 'rr1', project_id: 'p1', contractor_id: 'c1', bill_id: 'bill1',
    amount: 225000,
    release_date: '2025-01-15',
    phase: 'practical_completion',
    created_at: '2025-01-15T00:00:00Z',
  },
  {
    id: 'rr2', project_id: 'p1', contractor_id: 'c1', bill_id: 'bill2',
    amount: 310000,
    release_date: '2025-01-15',
    phase: 'practical_completion',
    created_at: '2025-01-15T00:00:00Z',
  },
  {
    id: 'rr3', project_id: 'p2', contractor_id: 'c3', bill_id: 'bill5',
    amount: 925000,
    release_date: '2025-02-01',
    phase: 'practical_completion',
    created_at: '2025-02-01T00:00:00Z',
  },
]
