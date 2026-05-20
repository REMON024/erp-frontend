'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { Contractor } from '@/types'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { AttendanceCalendar } from './AttendanceCalendar'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import { ArrowLeft, Star, Phone, Mail, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'

interface CPayment { id: string; project_id: string; amount: number; paid_date: string; description: string }

function StarRatingInput({ current, onChange }: { current: number; onChange: (r: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s}
          className={cn('w-7 h-7 cursor-pointer transition-colors',
            s <= (hover || current) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200')}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        />
      ))}
      <span className="text-slate-600 ml-2 font-semibold self-center">{current.toFixed(1)}</span>
    </div>
  )
}

export function ContractorDetailPage({ id }: { id: string }) {
  const now   = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const qc = useQueryClient()
  const { data: contractor, isLoading } = useQuery<Contractor>({ queryKey: ['contractor', id], queryFn: () => api.get(`/contractors/${id}`).then((r) => r.data) })
  const { data: paymentsData } = useQuery<{ data: CPayment[] }>({ queryKey: ['contractor-payments', id], queryFn: () => api.get(`/contractors/${id}/payments`).then((r) => r.data) })

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => api.put(`/contractors/${id}/rating`, { rating }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractor', id] }),
  })

  const payments    = paymentsData?.data ?? []
  const totalPaid   = payments.reduce((s, p) => s + p.amount, 0)

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1);  setYear((y) => y + 1) } else setMonth((m) => m + 1) }

  if (isLoading) return <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
  if (!contractor) return <p className="text-slate-500">Contractor not found.</p>

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/contractors" className="p-2 rounded-lg hover:bg-slate-100 transition-colors mt-0.5">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', contractor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
            {contractor.status}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{contractor.company_name}</h1>
          <p className="text-slate-500 text-sm">{contractor.contact_person}</p>
        </div>
      </div>

      {/* Contact strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Phone, label: 'Phone',   value: contractor.phone },
          { icon: Mail,  label: 'Email',   value: contractor.email },
          { icon: MapPin,label: 'Address', value: contractor.address },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <Icon className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultTab="attendance">
        <TabList>
          <Tab id="attendance" label="Attendance" />
          <Tab id="payments"   label={`Payments (${payments.length})`} />
          <Tab id="rating"     label="Rating" />
        </TabList>

        {/* Attendance */}
        <TabPanel id="attendance">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-800">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <AttendanceCalendar contractorId={id} year={year} month={month} />
        </TabPanel>

        {/* Payments */}
        <TabPanel id="payments">
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-green-700 font-medium">Total Paid</span>
            <span className="text-xl font-bold text-green-800">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.description}</p>
                  <p className="text-xs text-slate-400">{formatDate(p.paid_date)}</p>
                </div>
                <span className="font-semibold text-slate-900">{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {payments.length === 0 && <p className="text-sm text-slate-400">No payments recorded.</p>}
          </div>
        </TabPanel>

        {/* Rating */}
        <TabPanel id="rating">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">Current Rating</p>
              <StarRatingInput
                current={contractor.rating ?? 0}
                onChange={(r) => ratingMutation.mutate(r)}
              />
              {ratingMutation.isPending && <p className="text-xs text-blue-600 mt-2">Saving...</p>}
              {ratingMutation.isSuccess && <p className="text-xs text-green-600 mt-2">Rating updated!</p>}
            </div>
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <p className="text-sm font-medium text-slate-700">Performance Breakdown</p>
              {[
                { label: 'Attendance',    score: 92 },
                { label: 'Work Quality',  score: 85 },
                { label: 'Timeliness',    score: 78 },
                { label: 'Communication', score: 88 },
              ].map((k) => (
                <div key={k.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{k.label}</span>
                    <span className="font-semibold text-slate-700">{k.score}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full">
                    <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${k.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  )
}
