// Shared types for the parts of the app still backed by this file.
//
// This used to carry ~75 exports describing a snake_case mock API that the app no longer
// talks to; only 6 were imported anywhere and the rest were dead — including a `Project`
// and a `Unit` with `area_sqft`, both long superseded by the camelCase shapes each page
// declares locally against the real API. The dead ones have been removed.
//
// What remains is what Tasks, Documents, Users and the auth store actually import. New
// types should follow the live convention (camelCase, numeric ids) and live next to the
// page that uses them, not here.

export type Role =
  | 'super_admin'
  | 'operations'
  | 'inventory'
  | 'engineer'

export interface User {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  role: Role            // primary role (first of the set) — kept for legacy reads
  roleId: string
  roles: Role[]         // full role set (multi-role union model)
  roleIds: string[]
  projects?: string[]   // assigned project ids (relevant when roles includes 'engineer')
  phoneNumber?: string | null
  isActive: boolean
  createdAt: string
  lastLoginAt?: string | null
}

// ─── Tasks ───────────────────────────────────────────────────────────────────
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

// ─── Documents ───────────────────────────────────────────────────────────────
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
