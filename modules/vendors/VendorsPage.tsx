'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Vendor } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Star, Phone, Mail, MapPin, Edit2, Trash2, Plus } from 'lucide-react'

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  preferred:'bg-purple-100 text-purple-700',
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
      <span className="ml-1 text-xs text-gray-500">{value} stars</span>
    </div>
  )
}

const BG_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500']
function avatarBg(id: string) { return BG_COLORS[id.charCodeAt(0) % BG_COLORS.length] }
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
function reliability(id: string) { return [3, 4, 5, 2][id.charCodeAt(0) % 4] }

const vendorSchema = z.object({
  name:    z.string().min(1, 'Required'),
  company: z.string().min(1, 'Required'),
  email:   z.string().email('Invalid email'),
  phone:   z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
  rating:  z.coerce.number().min(1).max(5),
})
type VendorForm = z.infer<typeof vendorSchema>

function AddVendorModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema) as any,
    defaultValues: { rating: 3 },
  })
  const mut = useMutation({
    mutationFn: (d: unknown) => api.post('/vendors', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Add Vendor" size="md">
      <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Contact Name</label>
            <input {...register('name')} className={inp} placeholder="John Smith" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Company / Specialty</label>
            <input {...register('company')} className={inp} placeholder="Electrical Engineer" />
            {errors.company && <p className="text-xs text-red-600 mt-1">{errors.company.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Phone</label>
            <input {...register('phone')} className={inp} placeholder="9876543210" />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input {...register('email')} className={inp} placeholder="vendor@email.com" />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Address / Location</label>
          <input {...register('address')} className={inp} placeholder="City, State" />
          {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}
        </div>
        <div>
          <label className={lbl}>Rating (1–5 stars)</label>
          <input type="number" min={1} max={5} {...register('rating')} className={inp} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mut.isPending ? 'Saving...' : 'Add Vendor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function VendorsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  const { data } = useQuery({
    queryKey: ['vendors', search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (search) p.set('search', search)
      return api.get(`/vendors?${p}`).then(r => r.data)
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/vendors/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })

  const vendors: Vendor[] = data?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage suppliers, contractors, and service providers</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search vendors..."
        className={inp + ' max-w-sm'}
      />

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {vendors.map(v => (
          <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 ${avatarBg(v.id)}`}>
                {initials(v.name ?? v.company_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{v.company}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {v.status}
                    </span>
                    <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del.mutate(v.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="mt-2"><StarRating value={v.rating ?? 0} /></div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {v.phone}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {v.email}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {v.address}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-400">Projects</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-400">Total Value</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{reliability(v.id)}%</p>
                <p className="text-xs text-gray-400">Reliability</p>
              </div>
            </div>
          </div>
        ))}
        {vendors.length === 0 && (
          <div className="col-span-2 py-16 text-center text-gray-400">No vendors found</div>
        )}
      </div>

      {showAdd && <AddVendorModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
