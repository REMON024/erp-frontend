'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { SafetyIncident } from '@/types'
import { formatDate } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, CheckSquare, AlertCircle, Users, FileText, Edit2, Trash2 } from 'lucide-react'

// ── Static mock training programs ─────────────────────────────────────────────
interface Training {
  id: string; title: string; date: string; trainer: string; participants: number; status: string
}

const MOCK_TRAINING: Training[] = [
  { id: 't1', title: 'Fire Safety & Evacuation',     date: '2025-12-15', trainer: 'Safety Officer Khan', participants: 45, status: 'upcoming' },
  { id: 't2', title: 'Fall Protection & PPE Usage',  date: '2025-12-20', trainer: 'OSHA Certified Trainer', participants: 30, status: 'upcoming' },
  { id: 't3', title: 'First Aid & Emergency Response',date: '2026-01-05', trainer: 'Red Cross Trainer', participants: 50, status: 'upcoming' },
]

const SEV_COLORS: Record<string, string> = {
  low:      'bg-blue-100 text-blue-700',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
}
const STA_COLORS: Record<string, string> = {
  open:         'bg-red-100 text-red-700',
  investigating:'bg-amber-100 text-amber-700',
  resolved:     'bg-green-100 text-green-700',
  pending:      'bg-gray-100 text-gray-600',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

// ── Modals ────────────────────────────────────────────────────────────────────
const incidentSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  title:      z.string().min(1, 'Required'),
  description:z.string().min(1, 'Required'),
  severity:   z.enum(['low', 'medium', 'high']),
  date:       z.string().min(1, 'Required'),
})
type IncidentForm = z.infer<typeof incidentSchema>

function ReportIncidentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema) as any,
    defaultValues: { severity: 'medium', date: new Date().toISOString().split('T')[0] },
  })
  const mut = useMutation({
    mutationFn: (d: unknown) => api.post('/safety/incidents', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['safety-incidents'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Report Safety Incident" size="md">
      <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project ID</label>
            <input {...register('project_id')} className={inp} placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Date</label>
            <input type="date" {...register('date')} className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Incident Title</label>
          <input {...register('title')} className={inp} placeholder="Brief incident title" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea rows={3} {...register('description')} className={inp + ' resize-none'} placeholder="Describe the incident..." />
          {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
        </div>
        <div>
          <label className={lbl}>Severity</label>
          <select {...register('severity')} className={inp}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 font-medium">
            {mut.isPending ? 'Saving...' : 'Report Incident'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const trainingSchema = z.object({
  title:        z.string().min(1, 'Required'),
  date:         z.string().min(1, 'Required'),
  trainer:      z.string().min(1, 'Required'),
  participants: z.string().min(1, 'Required'),
})
type TrainingForm = z.infer<typeof trainingSchema>

function AddTrainingModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Training) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<TrainingForm>({
    resolver: zodResolver(trainingSchema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  })
  return (
    <Modal open onClose={onClose} title="Add Training Program" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({ id: `t${Date.now()}`, title: d.title, date: d.date, trainer: d.trainer, participants: Number(d.participants), status: 'upcoming' })
        onClose()
      })} className="space-y-4 p-1">
        <div>
          <label className={lbl}>Training Title</label>
          <input {...register('title')} className={inp} placeholder="Fire Safety & Evacuation" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Trainer Name</label>
            <input {...register('trainer')} className={inp} placeholder="Trainer name / organization" />
            {errors.trainer && <p className="text-xs text-red-600 mt-1">{errors.trainer.message}</p>}
          </div>
          <div>
            <label className={lbl}>Expected Participants</label>
            <input type="number" {...register('participants')} className={inp} placeholder="30" />
            {errors.participants && <p className="text-xs text-red-600 mt-1">{errors.participants.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Scheduled Date</label>
          <input type="date" {...register('date')} className={inp} />
          {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Add Training
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function SafetyPage() {
  const qc = useQueryClient()
  const [showIncident, setShowIncident] = useState(false)
  const [showTraining, setShowTraining] = useState(false)
  const [training, setTraining] = useState<Training[]>(MOCK_TRAINING)

  const { data: incData } = useQuery({
    queryKey: ['safety-incidents'],
    queryFn: () => api.get('/safety/incidents').then(r => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/safety/incidents/${id}`, { status }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety-incidents'] }),
  })

  const deleteIncident = useMutation({
    mutationFn: (id: string) => api.delete(`/safety/incidents/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety-incidents'] }),
  })

  const incidents: SafetyIncident[] = incData?.data ?? []
  const openViolations = incidents.filter(i => i.status === 'open').length
  const incidentFreeDays = 45

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Safety Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor incidents, training, and safety compliance across all sites</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" /> Safety Report
          </button>
          <button onClick={() => setShowIncident(true)} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            + Report Incident
          </button>
          <button onClick={() => setShowTraining(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            + Add Training
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Safety Score',       value: '96.8%',         sub: '+2.3% this month',   iconBg: 'bg-blue-50',   iconColor: 'text-blue-500',   Icon: Shield },
          { label: 'Incident-Free Days', value: incidentFreeDays, sub: 'Current streak',     iconBg: 'bg-green-50',  iconColor: 'text-green-500',  Icon: CheckSquare },
          { label: 'Active Violations',  value: openViolations,  sub: 'Down from 8',         iconBg: 'bg-orange-50', iconColor: 'text-orange-500', Icon: AlertCircle },
          { label: 'Certified Workers',  value: 234,             sub: '94% of workforce',    iconBg: 'bg-purple-50', iconColor: 'text-purple-500', Icon: Users },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">{k.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{k.value}</p>
              <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${k.iconBg}`}>
              <k.Icon className={`w-5 h-5 ${k.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">⚠️ Recent Safety Incidents</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {incidents.map(inc => (
              <div key={inc.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{inc.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{inc.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Reported by: {inc.reported_by ?? 'Unknown'} &nbsp;·&nbsp; ID: {inc.id.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(inc.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase ${STA_COLORS[inc.status]}`}>{inc.status}</span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase ${SEV_COLORS[inc.severity]}`}>{inc.severity}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> View Details
                  </button>
                  {inc.status === 'open' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: inc.id, status: 'investigating' })}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Update Status
                    </button>
                  )}
                  {inc.status === 'investigating' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: inc.id, status: 'resolved' })}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Mark Resolved
                    </button>
                  )}
                  <button onClick={() => deleteIncident.mutate(inc.id)} className="ml-auto text-gray-400 hover:text-red-600 p-1 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {incidents.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">No safety incidents reported</div>
            )}
          </div>
        </div>

        {/* Upcoming Safety Training */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">🏫 Upcoming Safety Training</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {training.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">Not Found Safety Training Programs</div>
            )}
            {training.map(t => (
              <div key={t.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Trainer: {t.trainer}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      📅 {t.date} &nbsp;·&nbsp; 👥 {t.participants} participants
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setTraining(prev => prev.filter(x => x.id !== t.id))}
                      className="text-gray-400 hover:text-red-600 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold capitalize">{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showIncident && <ReportIncidentModal onClose={() => setShowIncident(false)} />}
      {showTraining && <AddTrainingModal onClose={() => setShowTraining(false)} onAdd={t => setTraining(prev => [...prev, t])} />}
    </div>
  )
}
