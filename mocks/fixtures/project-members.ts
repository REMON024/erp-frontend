import { ProjectMember, DailyLog } from '@/types'

export const MOCK_PROJECT_MEMBERS: ProjectMember[] = [
  { id: 'pm1', project_id: 'p1', user_id: 'u3', role: 'Project Manager' },
  { id: 'pm2', project_id: 'p1', user_id: 'u4', role: 'Site Engineer' },
  { id: 'pm3', project_id: 'p1', user_id: 'u5', role: 'Procurement Officer' },
  { id: 'pm4', project_id: 'p1', user_id: 'u6', role: 'Accountant' },
  { id: 'pm5', project_id: 'p2', user_id: 'u3', role: 'Project Manager' },
  { id: 'pm6', project_id: 'p2', user_id: 'u4', role: 'Site Engineer' },
  { id: 'pm7', project_id: 'p3', user_id: 'u3', role: 'Project Manager' },
  { id: 'pm8', project_id: 'p3', user_id: 'u4', role: 'Site Engineer' },
]

export const MOCK_DAILY_LOGS: DailyLog[] = [
  { id: 'dl1', project_id: 'p1', date: '2025-05-21', description: 'Pillar casting completed on 3rd floor grid A1-A4. Rebar inspection passed. 42 workers on site.', created_by: 'u4', weather: 'Clear', workers_count: 42 },
  { id: 'dl2', project_id: 'p1', date: '2025-05-20', description: 'Formwork setup for 3rd floor slab ongoing. Material delivery of cement (200 bags) received.', created_by: 'u4', weather: 'Partly Cloudy', workers_count: 38 },
  { id: 'dl3', project_id: 'p1', date: '2025-05-19', description: 'Electrical conduit installation in 2nd floor apartment units 201-210 completed.', created_by: 'u4', weather: 'Hot', workers_count: 45 },
  { id: 'dl4', project_id: 'p1', date: '2025-05-18', description: 'Heavy rain halted outdoor work for 3 hours. Covered excavation area secured. Mild productivity impact.', created_by: 'u4', weather: 'Rainy', workers_count: 30 },
  { id: 'dl5', project_id: 'p2', date: '2025-05-21', description: 'Boundary wall eastern section 60% complete. Brick laying at 500 pcs/day pace.', created_by: 'u4', weather: 'Clear', workers_count: 22 },
]
