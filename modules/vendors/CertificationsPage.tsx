'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface Certification {
  id: string; vendor: string; cert_type: string; cert_number: string
  issuer: string; issued: string; expiry: string; status: 'valid' | 'expired' | 'pending'
}

const MOCK: Certification[] = [
  { id: 'c1', vendor: 'Jackson', cert_type: 'Electrical License',    cert_number: 'EL-2025-001', issuer: 'State Board',      issued: '2023-01-15', expiry: '2026-01-15', status: 'valid' },
  { id: 'c2', vendor: 'Jackson', cert_type: 'Safety Certification',  cert_number: 'SC-2024-019', issuer: 'OSHA',             issued: '2024-03-01', expiry: '2025-03-01', status: 'expired' },
  { id: 'c3', vendor: 'Jatin ahuja', cert_type: 'Quality Management', cert_number: 'ISO-9001-022', issuer: 'ISO Authority',   issued: '2024-06-10', expiry: '2027-06-10', status: 'valid' },
  { id: 'c4', vendor: 'Aman Asati', cert_type: 'Construction License',cert_number: 'CL-2025-033', issuer: 'PWD',              issued: '2025-01-01', expiry: '2027-01-01', status: 'valid' },
  { id: 'c5', vendor: 'khushi sharma', cert_type: 'Fire Safety Cert', cert_number: 'FS-2025-008',  issuer: 'Fire Department', issued: '2025-02-15', expiry: '2025-08-15', status: 'pending' },
]

const STATUS_ICON = {
  valid:   <CheckCircle className="w-4 h-4 text-green-500" />,
  expired: <AlertCircle className="w-4 h-4 text-red-500" />,
  pending: <Clock className="w-4 h-4 text-amber-500" />,
}
const STATUS_COLORS = {
  valid:   'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  vendor:      z.string().min(1, 'Required'),
  cert_type:   z.string().min(1, 'Required'),
  cert_number: z.string().min(1, 'Required'),
  issuer:      z.string().min(1, 'Required'),
  issued:      z.string().min(1, 'Required'),
  expiry:      z.string().min(1, 'Required'),
})
type Form = z.infer<typeof schema>

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Certification) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) as any })
  return (
    <Modal open onClose={onClose} title="Add Certification" size="md">
      <form onSubmit={handleSubmit(d => {
        const expiry = new Date(d.expiry)
        const status: Certification['status'] = expiry < new Date() ? 'expired' : 'valid'
        onAdd({ id: `c${Date.now()}`, ...d, status })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Vendor / Contractor</label>
            <input {...register('vendor')} className={inp} placeholder="Vendor name" />
            {errors.vendor && <p className="text-xs text-red-600 mt-1">{errors.vendor.message}</p>}
          </div>
          <div>
            <label className={lbl}>Certification Type</label>
            <input {...register('cert_type')} className={inp} placeholder="Electrical License" />
            {errors.cert_type && <p className="text-xs text-red-600 mt-1">{errors.cert_type.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Certificate Number</label>
            <input {...register('cert_number')} className={inp} placeholder="EL-2025-001" />
            {errors.cert_number && <p className="text-xs text-red-600 mt-1">{errors.cert_number.message}</p>}
          </div>
          <div>
            <label className={lbl}>Issuing Authority</label>
            <input {...register('issuer')} className={inp} placeholder="State Board" />
            {errors.issuer && <p className="text-xs text-red-600 mt-1">{errors.issuer.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Issue Date</label>
            <input type="date" {...register('issued')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Expiry Date</label>
            <input type="date" {...register('expiry')} className={inp} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Certification</button>
        </div>
      </form>
    </Modal>
  )
}

export function CertificationsPage() {
  const [certs, setCerts] = useState<Certification[]>(MOCK)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('')

  const displayed = filter ? certs.filter(c => c.status === filter) : certs
  const expiredCount = certs.filter(c => c.status === 'expired').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certifications & Docs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage vendor and contractor certifications and documents</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Certification
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Certifications', value: certs.length,                                         color: 'text-blue-600' },
          { label: 'Valid',                value: certs.filter(c => c.status === 'valid').length,       color: 'text-green-600' },
          { label: 'Expired / Pending',    value: certs.filter(c => c.status !== 'valid').length,      color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {expiredCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-800 font-medium">{expiredCount} certification(s) expired — renew immediately to maintain compliance</p>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'valid', 'expired', 'pending'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Vendor', 'Certification Type', 'Number', 'Issuer', 'Issued', 'Expiry', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.vendor}</td>
                <td className="px-4 py-3 text-gray-700">{c.cert_type}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.cert_number}</td>
                <td className="px-4 py-3 text-gray-600">{c.issuer}</td>
                <td className="px-4 py-3 text-gray-500">{c.issued}</td>
                <td className="px-4 py-3 text-gray-500">{c.expiry}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {STATUS_ICON[c.status]}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCerts(prev => prev.filter(x => x.id !== c.id))} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">No certifications found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={c => setCerts(prev => [...prev, c])} />}
    </div>
  )
}
