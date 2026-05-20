'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { Vendor } from '@/types'
import { cn } from '@/utils/cn'
import { Modal } from '@/components/ui/Modal'
import { VendorForm } from './VendorForm'
import { Search, Plus, Star, Phone, Mail, Truck } from 'lucide-react'

function useVendors(search: string, status: string) {
  return useQuery<{ data: Vendor[] }>({
    queryKey: ['vendors', search, status],
    queryFn: () => {
      const p = new URLSearchParams()
      if (search) p.set('search', search)
      if (status) p.set('status', status)
      return api.get(`/vendors?${p}`).then((r) => r.data)
    },
  })
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200')} />
      ))}
      <span className="text-xs text-slate-500 ml-1">{rating?.toFixed(1)}</span>
    </div>
  )
}

export function VendorsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const { data, isLoading } = useVendors(search, status)
  const vendors = data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500">{vendors.length} registered vendors</p>
        </div>
        <button onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> New Vendor
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..."
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52" />
        </div>
        {['', 'active', 'inactive'].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 py-2 text-xs font-medium rounded-lg transition-colors capitalize',
              status === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <Link key={v.id} href={`/vendors/${v.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-blue-500" />
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
                  {v.status}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{v.company_name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{v.contact_person}</p>
              <div className="mt-3">
                {v.rating ? <StarRating rating={v.rating} /> : <span className="text-xs text-slate-400">Not rated</span>}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Phone className="w-3 h-3" /> {v.phone}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Mail className="w-3 h-3" /> {v.email}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Register Vendor" size="md">
        <VendorForm onSuccess={() => setNewOpen(false)} onCancel={() => setNewOpen(false)} />
      </Modal>
    </div>
  )
}
