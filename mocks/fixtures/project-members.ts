import type { ProjectMember, DailyLog } from '@/types'
import data from './project-members.json'
export const MOCK_PROJECT_MEMBERS = data.projectMembers as unknown as ProjectMember[]
export const MOCK_DAILY_LOGS      = data.dailyLogs      as unknown as DailyLog[]
