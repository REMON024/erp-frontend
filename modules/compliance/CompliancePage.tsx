'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { CompliancePermit } from '@/types'
import { ComplianceDocument } from '@/mocks/fixtures/compliance'
import { formatDate } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
}

const CATEGORY_COLORS: Record<string, string> = {
  legal: 'bg-blue-100 text-blue-700',
  environmental: 'bg-emerald-100 text-emerald-700',
  labor: 'bg-purple-100 text-purple-700',
  safety: 'bg-red-100 text-red-700',
  financial: 'bg-amber-100 text-amber-700',
}

const permitSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  title: z.string().min(1, 'Required'),
  permit_number: z.string().min(1, 'Required'),
  issuing_authority: z.string().min(1, 'Required'),
  issue_date: z.string().min(1, 'Required'),
  expiry_date: z.string().min(1, 'Required'),
})
type PermitForm = z.infer<typeof permitSchema>

const docSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  title: z.string().min(1, 'Required'),
  category: z.enum(['legal', 'environmental', 'labor', 'safety', 'financial']),
  file_name: z.string().min(1, 'Required'),
  notes: z.string().optional(),
})
type DocForm = z.infer<typeof docSchema>

function AddPermitModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<PermitForm>({
    resolver: zodResolver(permitSchema) as any,
  })
  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post('/compliance/permits', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-permits'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Add Permit" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
            <input {...register('project_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permit Number</label>
            <input {...register('permit_number')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="RAJUK-2025-0001" />
            {errors.permit_number && <p className="text-xs text-red-600 mt-1">{errors.permit_number.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input {...register('title')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Authority</label>
          <input {...register('issuing_authority')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="RAJUK" />
          {errors.issuing_authority && <p className="text-xs text-red-600 mt-1">{errors.issuing_authority.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
            <input type="date" {...register('issue_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input type="date" {...register('expiry_date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Saving...' : 'Add Permit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AddDocModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<DocForm>({
    resolver: zodResolver(docSchema) as any,
    defaultValues: { category: 'legal' },
  })
  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post('/compliance/documents', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-docs'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Upload Document" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
            <input {...register('project_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="p1" />
            {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select {...register('category')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {['legal', 'environmental', 'labor', 'safety', 'financial'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input {...register('title')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
          <input {...register('file_name')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="document.pdf" />
          {errors.file_name && <p className="text-xs text-red-600 mt-1">{errors.file_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input {...register('notes')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Saving...' : 'Upload'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PermitsTab() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const today = new Date()

  const { data } = useQuery({
    queryKey: ['compliance-permits', statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      return api.get(`/compliance/permits?${params}`).then((r) => r.data)
    },
  })

  const deletePermit = useMutation({
    mutationFn: (id: string) => api.delete(`/compliance/permits/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-permits'] }),
  })

  const permits: CompliancePermit[] = data?.data ?? []
  const expiredCount = permits.filter((p) => p.status === 'expired').length

  return (
    <div>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex gap-1">
          {['', 'active', 'expired', 'pending'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {s === '' ? 'All' : s}
              {s === 'expired' && expiredCount > 0 && (
                <span className="ml-1 bg-red-500 text-white rounded-full px-1">{expiredCount}</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Add Permit
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {permits.map((p) => {
          const expiry = new Date(p.expiry_date)
          const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
          const isExpiring = daysLeft <= 30 && daysLeft > 0
          return (
            <div key={p.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{p.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{p.permit_number} · {p.issuing_authority}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>Issued: {p.issue_date ? formatDate(p.issue_date) : '—'}</span>
                    <span>·</span>
                    <span className={isExpiring ? 'text-amber-600 font-medium' : ''}>
                      Expires: {formatDate(p.expiry_date)}
                      {isExpiring && ` (${daysLeft} days left)`}
                    </span>
                    <span>·</span>
                    <span>Project: {p.project_id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                  <button onClick={() => deletePermit.mutate(p.id)} className="text-gray-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>
              </div>
            </div>
          )
        })}
        {permits.length === 0 && <div className="py-12 text-center text-gray-400">No permits found</div>}
      </div>
      {showAdd && <AddPermitModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function DocumentsTab() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data } = useQuery({
    queryKey: ['compliance-docs', categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      return api.get(`/compliance/documents?${params}`).then((r) => r.data)
    },
  })

  const deleteDoc = useMutation({
    mutationFn: (id: string) => api.delete(`/compliance/documents/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-docs'] }),
  })

  const docs: ComplianceDocument[] = data?.data ?? []

  return (
    <div>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex gap-1">
          {['', 'legal', 'environmental', 'labor', 'safety', 'financial'].map((c) => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium ${categoryFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {c === '' ? 'All' : c}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Upload Document
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {docs.map((doc) => (
          <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">
                PDF
              </div>
              <div>
                <p className="font-medium text-gray-900">{doc.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{doc.file_name} · Project: {doc.project_id}</p>
                {doc.notes && <p className="text-xs text-gray-400 mt-0.5">{doc.notes}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[doc.category]}`}>{doc.category}</span>
              <span className="text-xs text-gray-400">{formatDate(doc.uploaded_at)}</span>
              <button onClick={() => deleteDoc.mutate(doc.id)} className="text-gray-400 hover:text-red-600 text-lg leading-none">×</button>
            </div>
          </div>
        ))}
        {docs.length === 0 && <div className="py-12 text-center text-gray-400">No documents found</div>}
      </div>
      {showAdd && <AddDocModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

export function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'permits' | 'documents'>('permits')

  const { data: permitsData } = useQuery({
    queryKey: ['compliance-permits'],
    queryFn: () => api.get('/compliance/permits').then((r) => r.data),
  })
  const expiredCount = (permitsData?.data ?? []).filter((p: CompliancePermit) => p.status === 'expired').length

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Compliance</h1>
        <p className="text-sm text-gray-500 mt-1">Permits, regulatory documents, and compliance tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Permits', value: permitsData?.total ?? 0, color: 'text-blue-600' },
          { label: 'Expired Permits', value: expiredCount, color: 'text-red-600' },
          { label: 'Active Permits', value: (permitsData?.data ?? []).filter((p: CompliancePermit) => p.status === 'active').length, color: 'text-emerald-600' },
          { label: 'Pending Renewal', value: expiredCount, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {expiredCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-xl">⚠</span>
          <div>
            <p className="font-medium text-red-800">{expiredCount} permit(s) have expired and need renewal</p>
            <p className="text-sm text-red-600">Ensure timely renewal to avoid compliance violations</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 px-4">
          {(['permits', 'documents'] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
              {t === 'permits' && expiredCount > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{expiredCount}</span>
              )}
            </button>
          ))}
        </div>
        {activeTab === 'permits' && <PermitsTab />}
        {activeTab === 'documents' && <DocumentsTab />}
      </div>
    </div>
  )
}
