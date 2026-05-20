'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { Contractor } from '@/types'
import { cn } from '@/utils/cn'
import { Modal } from '@/components/ui/Modal'
import { ContractorForm } from './ContractorForm'
import { Search, Plus, Star, Phone, HardHat } from 'lucide-react'

function useContractors(search: string, status: string) {
  return useQuery<{ data: Contractor[] }>({
    queryKey: ['contractors', search, status],
    queryFn: () => {
      const p = new URLSearchParams()
      if (search) p.set('search', search)
      if (status) p.set('status', status)
      return api.get(`/contractors?${p}`).then((r) => r.data)
    },
  })
}

function Stars({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-xs text-slate-400">Not rated</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200')} />
      ))}
      <span className="text-xs text-slate-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

export function ContractorsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const { data, isLoading } = useContractors(search, status)
  const contractors = data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contractors</h1>
          <p className="text-sm text-slate-500">{contractors.length} contractors</p>
        </div>
        <button onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Onboard Contractor
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contractors..."
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
          {[...Array(5)].map((_, i) => <div key={i} className="h-44 bg-slate-200 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contractors.map((c) => (
            <Link key={c.id} href={`/contractors/${c.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <HardHat className="w-5 h-5 text-amber-600" />
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
                  {c.status}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{c.company_name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{c.contact_person}</p>
              <div className="mt-3"><Stars rating={c.rating} /></div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <Phone className="w-3 h-3" /> {c.phone}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Onboard Contractor" size="md">
        <ContractorForm onSuccess={() => setNewOpen(false)} onCancel={() => setNewOpen(false)} />
      </Modal>
    </div>
  )
}
