'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ProjectMember, User } from '@/types'
import { MOCK_USERS } from '@/mocks/fixtures/users'
import { Modal } from '@/components/ui/Modal'
import { UserPlus, Trash2 } from 'lucide-react'

interface Props { projectId: string }

function useMembers(projectId: string) {
  return useQuery<{ data: (ProjectMember & { user: User })[] }>({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then((r) => r.data),
  })
}

const ROLE_OPTIONS = ['Project Manager', 'Site Engineer', 'Procurement Officer', 'Accountant', 'Store Manager', 'Observer']

export function TeamTab({ projectId }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[0])
  const qc = useQueryClient()

  const { data, isLoading } = useMembers(projectId)
  const members = data?.data ?? []

  const addMutation = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/members`, { user_id: selectedUser, role: selectedRole }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-members', projectId] }); setOpen(false) },
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-members', projectId] }),
  })

  const availableUsers = MOCK_USERS.filter((u) => !members.some((m) => m.user_id === u.id))

  if (isLoading) return <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {m.user?.first_name?.[0]}{m.user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{m.user?.first_name} {m.user?.last_name}</p>
              <p className="text-xs text-slate-400">{m.role}</p>
            </div>
            <button onClick={() => removeMutation.mutate(m.user_id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-slate-400 col-span-2">No team members assigned yet.</p>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Team Member" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">User</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select user...</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role.replace(/_/g, ' ')})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Role</label>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setOpen(false)}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={() => addMutation.mutate()} disabled={!selectedUser || addMutation.isPending}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {addMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
