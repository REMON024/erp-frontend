'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { PurchaseRequest, PurchaseOrder } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  po_created: 'bg-purple-100 text-purple-700',
  sent: 'bg-blue-100 text-blue-700',
  received: 'bg-emerald-100 text-emerald-700',
}

const prSchema = z.object({
  project_id: z.string().min(1, 'Required'),
  items: z.array(z.object({
    material_id: z.string().min(1, 'Required'),
    quantity: z.coerce.number().positive(),
    unit: z.string().min(1, 'Required'),
    estimated_price: z.coerce.number().positive(),
  })).min(1, 'At least one item required'),
})
type PRForm = z.infer<typeof prSchema>

function PRForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<PRForm>({
    resolver: zodResolver(prSchema) as any,
    defaultValues: { items: [{ material_id: '', quantity: 1, unit: '', estimated_price: 0 }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const total = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.estimated_price ?? 0)), 0)

  const mutation = useMutation({
    mutationFn: (data: unknown) => api.post('/purchase-requests', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-requests'] }); onClose() },
  })

  return (
    <Modal open onClose={onClose} title="New Purchase Request" size="lg">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
          <input {...register('project_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. p1" />
          {errors.project_id && <p className="text-xs text-red-600 mt-1">{errors.project_id.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Items</label>
            <button type="button" onClick={() => append({ material_id: '', quantity: 1, unit: 'pcs', estimated_price: 0 })}
              className="text-xs text-blue-600 hover:underline">+ Add Item</button>
          </div>
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-4">
                  <input {...register(`items.${i}.material_id`)} placeholder="Material ID" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-2">
                  <input type="number" {...register(`items.${i}.quantity`)} placeholder="Qty" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-2">
                  <input {...register(`items.${i}.unit`)} placeholder="Unit" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-3">
                  <input type="number" {...register(`items.${i}.estimated_price`)} placeholder="Est. Price" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-1 flex justify-center pt-1.5">
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-right text-sm font-medium text-gray-700">
            Estimated Total: <span className="text-blue-700">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Saving...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PRCard({ pr }: { pr: PurchaseRequest }) {
  const qc = useQueryClient()
  const total = pr.items.reduce((s, i) => s + i.quantity * (i.estimated_price ?? 0), 0)

  const approve = useMutation({
    mutationFn: () => api.post(`/purchase-requests/${pr.id}/approve`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-requests'] }),
  })
  const reject = useMutation({
    mutationFn: () => api.post(`/purchase-requests/${pr.id}/reject`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-requests'] }),
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">PR #{pr.id.toUpperCase()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Project: {pr.project_id} · {pr.items.length} item(s)</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(pr.created_at)}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[pr.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {pr.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      <div className="mt-3 border-t border-gray-100 pt-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
        {pr.status === 'submitted' && (
          <div className="flex gap-2">
            <button onClick={() => reject.mutate()} className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Reject</button>
            <button onClick={() => approve.mutate()} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Approve</button>
          </div>
        )}
      </div>
    </div>
  )
}

function POCard({ po }: { po: PurchaseOrder }) {
  const qc = useQueryClient()
  const receive = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${po.id}/receive`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{po.po_number}</p>
          <p className="text-sm text-gray-500 mt-0.5">Vendor: {po.vendor_id} · Project: {po.project_id}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(po.created_at)}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {po.status.toUpperCase()}
        </span>
      </div>
      <div className="mt-3 border-t border-gray-100 pt-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">{formatCurrency(po.total_amount)}</span>
        {po.status === 'sent' && (
          <button onClick={() => receive.mutate()} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Confirm GRN
          </button>
        )}
      </div>
    </div>
  )
}

export function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<'pr' | 'po'>('pr')
  const [prStatus, setPRStatus] = useState('')
  const [showPRForm, setShowPRForm] = useState(false)

  const { data: prData } = useQuery({
    queryKey: ['purchase-requests', prStatus],
    queryFn: () => {
      const params = new URLSearchParams()
      if (prStatus) params.set('status', prStatus)
      return api.get(`/purchase-requests?${params}`).then((r) => r.data)
    },
  })

  const { data: poData } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data),
  })

  const prs: PurchaseRequest[] = prData?.data ?? []
  const pos: PurchaseOrder[] = poData?.data ?? []

  const pending = prs.filter((r) => r.status === 'submitted').length

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Procurement</h1>
          <p className="text-sm text-gray-500 mt-1">Purchase requests, purchase orders, and GRN</p>
        </div>
        <button onClick={() => setShowPRForm(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium self-start sm:self-auto">
          + New Purchase Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: prs.length, color: 'text-blue-600' },
          { label: 'Pending Approval', value: pending, color: 'text-amber-600' },
          { label: 'Purchase Orders', value: pos.length, color: 'text-purple-600' },
          { label: 'PO Value', value: formatCurrency(pos.reduce((s, o) => s + o.total_amount, 0)), color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex gap-4 border-b border-gray-200 px-4">
          {(['pr', 'po'] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'pr' ? 'Purchase Requests' : 'Purchase Orders'}
              {t === 'pr' && pending > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{pending}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'pr' && (
          <div>
            <div className="p-4 border-b border-gray-100 flex gap-2">
              {['', 'draft', 'submitted', 'approved', 'rejected', 'po_created'].map((s) => (
                <button key={s} onClick={() => setPRStatus(s)}
                  className={`px-3 py-1.5 text-xs rounded-full border font-medium ${prStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                  {s === '' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prs.map((pr) => <PRCard key={pr.id} pr={pr} />)}
              {prs.length === 0 && <div className="col-span-2 py-12 text-center text-gray-400">No purchase requests found</div>}
            </div>
          </div>
        )}

        {activeTab === 'po' && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pos.map((po) => <POCard key={po.id} po={po} />)}
            {pos.length === 0 && <div className="col-span-2 py-12 text-center text-gray-400">No purchase orders found</div>}
          </div>
        )}
      </div>

      {showPRForm && <PRForm onClose={() => setShowPRForm(false)} />}
    </div>
  )
}
