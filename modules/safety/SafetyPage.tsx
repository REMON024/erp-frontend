'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { SafetyIncident } from '@/types'
import { HazardReport, SafetyInspection, TrainingRecord } from '@/mocks/fixtures/safety'
import { formatDate } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  investigating: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  mitigated: 'bg-emerald-100 text-emerald-700',
  passed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-600',
}

const incidentSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  title: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  severity: z.enum(['low', 'medium', 'high']),
  date: z.string().min(1, 'Required'),
})
type IncidentForm = z.infer<typeof incidentSchema>

const hazardSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  title: z.string().min(1, 'Required'),
  location: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  risk_level: z.enum(['low', 'medium', 'high']),
  date: z.string().min(1, 'Required'),
})
type HazardForm = z.infer<typeof hazardSchema>

function ReportIncidentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema) as any,
    defaultValues: { severity: 'medium', date: new Date().toISOString().split('T')[0] },
  })
  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post('/safety/incidents', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['safety-incidents'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Report Safety Incident" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
            <input {...register('project_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" {...register('date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input {...register('title')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Brief incident title" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={3} {...register('description')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
          {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <select {...register('severity')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Saving...' : 'Report Incident'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ReportHazardModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<HazardForm>({
    resolver: zodResolver(hazardSchema) as any,
    defaultValues: { risk_level: 'medium', date: new Date().toISOString().split('T')[0] },
  })
  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post('/safety/hazards', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['safety-hazards'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Report Hazard" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
            <input {...register('project_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" {...register('date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input {...register('title')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input {...register('location')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Floor 3, Grid B" />
            {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={3} {...register('description')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
          <select {...register('risk_level')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Saving...' : 'Report Hazard'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function IncidentsTab() {
  const [severity, setSeverity] = useState('')
  const [showModal, setShowModal] = useState(false)
  const { data } = useQuery({
    queryKey: ['safety-incidents', severity],
    queryFn: () => {
      const params = new URLSearchParams()
      if (severity) params.set('severity', severity)
      return api.get(`/safety/incidents?${params}`).then((r) => r.data)
    },
  })
  const incidents: SafetyIncident[] = data?.data ?? []

  return (
    <div>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex gap-1">
          {['', 'low', 'medium', 'high'].map((s) => (
            <button key={s} onClick={() => setSeverity(s)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium ${severity === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
          + Report Incident
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {incidents.map((inc) => (
          <div key={inc.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{inc.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{inc.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs text-gray-400">Project: {inc.project_id}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{formatDate(inc.date)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SEVERITY_COLORS[inc.severity]}`}>
                  {inc.severity}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[inc.status]}`}>
                  {inc.status}
                </span>
              </div>
            </div>
          </div>
        ))}
        {incidents.length === 0 && <div className="py-12 text-center text-gray-400">No incidents found</div>}
      </div>
      {showModal && <ReportIncidentModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

function HazardsTab() {
  const [showModal, setShowModal] = useState(false)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['safety-hazards'],
    queryFn: () => api.get('/safety/hazards').then((r) => r.data),
  })
  const hazards: HazardReport[] = data?.data ?? []

  const mitigate = useMutation({
    mutationFn: (id: string) => api.put(`/safety/hazards/${id}`, { status: 'mitigated' }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety-hazards'] }),
  })

  return (
    <div>
      <div className="p-4 border-b border-gray-100 flex justify-end">
        <button onClick={() => setShowModal(true)} className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          + Report Hazard
        </button>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hazards.map((hz) => (
          <div key={hz.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{hz.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">📍 {hz.location}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${SEVERITY_COLORS[hz.risk_level]}`}>
                {hz.risk_level} risk
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{hz.description}</p>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[hz.status]}`}>{hz.status}</span>
              {hz.status === 'open' && (
                <button onClick={() => mitigate.mutate(hz.id)} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Mark Mitigated
                </button>
              )}
            </div>
          </div>
        ))}
        {hazards.length === 0 && <div className="col-span-1 sm:col-span-2 py-12 text-center text-gray-400">No hazards reported</div>}
      </div>
      {showModal && <ReportHazardModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

function InspectionsTab() {
  const { data } = useQuery({
    queryKey: ['safety-inspections'],
    queryFn: () => api.get('/safety/inspections').then((r) => r.data),
  })
  const inspections: SafetyInspection[] = data?.data ?? []

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Inspection', 'Project', 'Inspector', 'Date', 'Score', 'Status', 'Notes'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inspections.map((ins) => (
              <tr key={ins.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{ins.title}</td>
                <td className="px-4 py-3 text-gray-600">{ins.project_id}</td>
                <td className="px-4 py-3 text-gray-600">{ins.inspector}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(ins.date)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${ins.score >= 70 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${ins.score}%` }} />
                    </div>
                    <span className="font-semibold text-gray-900">{ins.score}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[ins.status]}`}>{ins.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{ins.notes}</td>
              </tr>
            ))}
            {inspections.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-400">No inspections found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TrainingTab() {
  const { data } = useQuery({
    queryKey: ['safety-training'],
    queryFn: () => api.get('/safety/training').then((r) => r.data),
  })
  const records: TrainingRecord[] = data?.data ?? []
  const today = new Date()

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {records.map((tr) => {
        const expiry = new Date(tr.expiry_date)
        const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
        const isExpiring = daysLeft <= 90 && daysLeft > 0
        const isExpired = daysLeft <= 0
        return (
          <div key={tr.id} className={`border rounded-xl p-4 ${isExpired ? 'border-red-200 bg-red-50' : isExpiring ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{tr.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">By: {tr.conducted_by}</p>
              </div>
              {isExpired ? (
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">Expired</span>
              ) : isExpiring ? (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">{daysLeft}d left</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">Valid</span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
              <div>
                <p>Conducted</p>
                <p className="font-medium text-gray-700">{formatDate(tr.date)}</p>
              </div>
              <div>
                <p>Participants</p>
                <p className="font-medium text-gray-700">{tr.participants}</p>
              </div>
              <div>
                <p>Expires</p>
                <p className={`font-medium ${isExpired ? 'text-red-700' : 'text-gray-700'}`}>{formatDate(tr.expiry_date)}</p>
              </div>
            </div>
          </div>
        )
      })}
      {records.length === 0 && <div className="col-span-1 sm:col-span-2 py-12 text-center text-gray-400">No training records found</div>}
    </div>
  )
}

export function SafetyPage() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'hazards' | 'inspections' | 'training'>('incidents')

  const { data: incData } = useQuery({
    queryKey: ['safety-incidents'],
    queryFn: () => api.get('/safety/incidents').then((r) => r.data),
  })
  const openIncidents = (incData?.data ?? []).filter((i: SafetyIncident) => i.status === 'open').length

  const { data: hazData } = useQuery({
    queryKey: ['safety-hazards'],
    queryFn: () => api.get('/safety/hazards').then((r) => r.data),
  })
  const openHazards = (hazData?.data ?? []).filter((h: HazardReport) => h.status === 'open').length

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Safety & HSE</h1>
        <p className="text-sm text-gray-500 mt-1">Incident tracking, hazard reporting, inspections, and training</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open Incidents', value: openIncidents, color: 'text-red-600' },
          { label: 'Open Hazards', value: openHazards, color: 'text-amber-600' },
          { label: 'Total Incidents', value: incData?.total ?? 0, color: 'text-blue-600' },
          { label: 'Total Hazards', value: hazData?.total ?? 0, color: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 px-4">
          {(['incidents', 'hazards', 'inspections', 'training'] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
              {t === 'incidents' && openIncidents > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{openIncidents}</span>
              )}
              {t === 'hazards' && openHazards > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{openHazards}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'incidents' && <IncidentsTab />}
        {activeTab === 'hazards' && <HazardsTab />}
        {activeTab === 'inspections' && <InspectionsTab />}
        {activeTab === 'training' && <TrainingTab />}
      </div>
    </div>
  )
}
