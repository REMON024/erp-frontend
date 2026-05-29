'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, ClipboardList, Eye } from 'lucide-react'

// ── Mock data ─────────────────────────────────────────────────────────────────
type WOStatus = 'draft' | 'active' | 'completed' | 'cancelled'

interface WorkOrder {
  id: string; workOrderNo: string; projectId: string; projectName: string
  vendorId: string; vendorName: string; scope: string
  startDate: string; endDate: string
  contractAmount: number; advanceAmount: number; retentionPercent: number
  status: WOStatus
}

const MOCK_PROJECTS = [
  { id: 'p1', name: 'Block-A Residential' },
  { id: 'p3', name: 'Block-C Residential' },
  { id: 'p4', name: 'Block-D Residential' },
]

const MOCK_VENDORS = [
  { id: 'v1', name: 'Rahman Builders Ltd.' },
  { id: 'v2', name: 'Dhaka Construction Co.' },
  { id: 'v3', name: 'Steel Masters BD' },
  { id: 'v4', name: 'ElectroPro Services' },
]

const INITIAL_ORDERS: WorkOrder[] = [
  { id: 'wo1', workOrderNo: 'WO-2025-001', projectId: 'p1', projectName: 'Block-A Residential', vendorId: 'v1', vendorName: 'Rahman Builders Ltd.',     scope: 'Civil & structural work for all 6 floors',      startDate: '2024-07-01', endDate: '2025-03-31', contractAmount: 12500000, advanceAmount: 2500000, retentionPercent: 5, status: 'completed' },
  { id: 'wo2', workOrderNo: 'WO-2025-002', projectId: 'p1', projectName: 'Block-A Residential', vendorId: 'v4', vendorName: 'ElectroPro Services',       scope: 'Electrical wiring and panel installation',       startDate: '2024-09-01', endDate: '2025-02-28', contractAmount: 1800000,  advanceAmount: 360000,  retentionPercent: 5, status: 'completed' },
  { id: 'wo3', workOrderNo: 'WO-2025-003', projectId: 'p3', projectName: 'Block-C Residential', vendorId: 'v2', vendorName: 'Dhaka Construction Co.',    scope: 'Foundation and basement work up to ground floor', startDate: '2025-02-01', endDate: '2025-08-31', contractAmount: 8500000,  advanceAmount: 1700000, retentionPercent: 8, status: 'active'    },
  { id: 'wo4', workOrderNo: 'WO-2025-004', projectId: 'p3', projectName: 'Block-C Residential', vendorId: 'v3', vendorName: 'Steel Masters BD',          scope: 'Steel fabrication and reinforcement work',       startDate: '2025-04-01', endDate: '2026-01-31', contractAmount: 6200000,  advanceAmount: 1240000, retentionPercent: 8, status: 'active'    },
  { id: 'wo5', workOrderNo: 'WO-2025-005', projectId: 'p4', projectName: 'Block-D Residential', vendorId: 'v1', vendorName: 'Rahman Builders Ltd.',     scope: 'Piling and sub-structure work',                  startDate: '2025-09-01', endDate: '2026-04-30', contractAmount: 5000000,  advanceAmount: 500000,  retentionPercent: 10, status: 'draft'    },
]

const STATUS_COLORS: Record<WOStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}

const fmt = (n: number) => `৳${(n / 100000).toFixed(1)}L`

const schema = z.object({
  projectId:        z.string().min(1, 'Required'),
  vendorId:         z.string().min(1, 'Required'),
  scope:            z.string().min(1, 'Required'),
  startDate:        z.string().min(1, 'Required'),
  endDate:          z.string().min(1, 'Required'),
  contractAmount:   z.coerce.number().min(1, 'Required'),
  advanceAmount:    z.coerce.number().min(0),
  retentionPercent: z.coerce.number().min(0).max(100),
})
type Form = z.infer<typeof schema>

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

function WOModal({ wo, onClose, onSave }: {
  wo?: WorkOrder; onClose: () => void; onSave: (d: Form) => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: wo
      ? { projectId: wo.projectId, vendorId: wo.vendorId, scope: wo.scope,
          startDate: wo.startDate, endDate: wo.endDate, contractAmount: wo.contractAmount,
          advanceAmount: wo.advanceAmount, retentionPercent: wo.retentionPercent }
      : { retentionPercent: 5, advanceAmount: 0 },
  })

  return (
    <Modal open onClose={onClose} title={wo ? 'Edit Work Order' : 'New Work Order'} size="lg">
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Project <span className="text-red-500">*</span></label>
            <select {...register('projectId')} className={inp}>
              <option value="">Select project…</option>
              {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.projectId && <p className="text-xs text-red-600 mt-1">{errors.projectId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Contractor / Vendor <span className="text-red-500">*</span></label>
            <select {...register('vendorId')} className={inp}>
              <option value="">Select vendor…</option>
              {MOCK_VENDORS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            {errors.vendorId && <p className="text-xs text-red-600 mt-1">{errors.vendorId.message}</p>}
          </div>
        </div>

        <div>
          <label className={lbl}>Scope of Work <span className="text-red-500">*</span></label>
          <textarea {...register('scope')} className={inp} rows={2} placeholder="Describe the work to be done…" />
          {errors.scope && <p className="text-xs text-red-600 mt-1">{errors.scope.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Start Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('startDate')} className={inp} />
          </div>
          <div>
            <label className={lbl}>End Date <span className="text-red-500">*</span></label>
            <input type="date" {...register('endDate')} className={inp} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Contract Amount (৳) <span className="text-red-500">*</span></label>
            <input type="number" {...register('contractAmount')} className={inp} placeholder="5000000" />
            {errors.contractAmount && <p className="text-xs text-red-600 mt-1">{errors.contractAmount.message}</p>}
          </div>
          <div>
            <label className={lbl}>Advance Amount (৳)</label>
            <input type="number" {...register('advanceAmount')} className={inp} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Retention (%)</label>
            <input type="number" {...register('retentionPercent')} className={inp} placeholder="5" min={0} max={100} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            {wo ? 'Save Changes' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function WorkOrdersPage() {
  const [orders,  setOrders]  = useState<WorkOrder[]>(INITIAL_ORDERS)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState<WOStatus | ''>('')
  const [project, setProject] = useState('')
  const [modal,   setModal]   = useState<'add' | 'edit' | null>(null)
  const [target,  setTarget]  = useState<WorkOrder | null>(null)

  const displayed = orders.filter(o => {
    const matchSearch  = o.workOrderNo.toLowerCase().includes(search.toLowerCase()) ||
                         o.vendorName.toLowerCase().includes(search.toLowerCase()) ||
                         o.scope.toLowerCase().includes(search.toLowerCase())
    const matchStatus  = !status  || o.status === status
    const matchProject = !project || o.projectId === project
    return matchSearch && matchStatus && matchProject
  })

  const totalContract = orders.reduce((s, o) => s + o.contractAmount, 0)
  const active = orders.filter(o => o.status === 'active').length

  const handleSave = (data: Form) => {
    const proj   = MOCK_PROJECTS.find(p => p.id === data.projectId)!
    const vendor = MOCK_VENDORS.find(v => v.id === data.vendorId)!
    if (modal === 'add') {
      const count = orders.length + 1
      setOrders(prev => [{
        id: `wo${Date.now()}`,
        workOrderNo: `WO-2026-${String(count).padStart(3, '0')}`,
        projectId: data.projectId, projectName: proj.name,
        vendorId: data.vendorId, vendorName: vendor.name,
        scope: data.scope, startDate: data.startDate, endDate: data.endDate,
        contractAmount: Number(data.contractAmount),
        advanceAmount: Number(data.advanceAmount),
        retentionPercent: Number(data.retentionPercent),
        status: 'draft',
      }, ...prev])
    } else if (target) {
      setOrders(prev => prev.map(o => o.id === target.id
        ? { ...o, projectId: data.projectId, projectName: proj.name,
            vendorId: data.vendorId, vendorName: vendor.name,
            scope: data.scope, startDate: data.startDate, endDate: data.endDate,
            contractAmount: Number(data.contractAmount),
            advanceAmount: Number(data.advanceAmount),
            retentionPercent: Number(data.retentionPercent) }
        : o))
    }
    setModal(null); setTarget(null)
  }

  const handleApprove = (id: string) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'active' } : o))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        subtitle="Manage contractor work orders for each project"
        action={
          <button onClick={() => setModal('add')}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Work Order
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Completed</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{orders.filter(o => o.status === 'completed').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Contract Value</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{fmt(totalContract)}</p>
        </div>
      </div>

      {/* Filters */}
      <SearchBar value={search} onChange={setSearch} placeholder="Search work orders…">
        <select value={project} onChange={e => setProject(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Projects</option>
          {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Status</option>
          {(['draft','active','completed','cancelled'] as WOStatus[]).map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </SearchBar>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Work Order', 'Project', 'Contractor', 'Contract Value', 'Advance', 'Retention', 'Period', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">{o.workOrderNo}</p>
                      <p className="text-gray-400 text-xs truncate max-w-[120px]">{o.scope}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">{o.projectName.split(' ')[0]}</span>
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs font-medium">{o.vendorName}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{fmt(o.contractAmount)}</td>
                <td className="px-4 py-3 text-gray-600">{fmt(o.advanceAmount)}</td>
                <td className="px-4 py-3 text-gray-600">{o.retentionPercent}%</td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {o.startDate} →<br />{o.endDate}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[o.status]}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setTarget(o); setModal('edit') }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {o.status === 'draft' && (
                      <button onClick={() => handleApprove(o.id)}
                        className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline px-1">
                        Approve
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {displayed.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">No work orders match your filters.</div>
        )}
      </div>

      {modal === 'add' && <WOModal onClose={() => setModal(null)} onSave={handleSave} />}
      {modal === 'edit' && target && (
        <WOModal wo={target} onClose={() => { setModal(null); setTarget(null) }} onSave={handleSave} />
      )}
    </div>
  )
}
