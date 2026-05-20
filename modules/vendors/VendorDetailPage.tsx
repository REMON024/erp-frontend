'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import api from '@/lib/api'
import { Vendor, VendorContract } from '@/types'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import { ArrowLeft, Star, Phone, Mail, MapPin, TrendingUp } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

interface VendorPerf { on_time_delivery: number; quality_score: number; response_time_hours: number; total_orders: number; completed_orders: number }
interface VendorPayment { id: string; po_number: string; amount: number; paid_date: string; method: string }

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn('w-5 h-5', s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200')} />
      ))}
      <span className="text-lg font-bold text-slate-800 ml-2">{rating?.toFixed(1)}</span>
    </div>
  )
}

const CONTRACT_STATUS: Record<VendorContract['status'], string> = {
  draft:       'bg-slate-100 text-slate-600',
  active:      'bg-green-100 text-green-700',
  expired:     'bg-red-100 text-red-600',
  terminated:  'bg-slate-200 text-slate-500',
}

export function VendorDetailPage({ id }: { id: string }) {
  const { data: vendor, isLoading } = useQuery<Vendor>({ queryKey: ['vendor', id], queryFn: () => api.get(`/vendors/${id}`).then((r) => r.data) })
  const { data: contractsData } = useQuery<{ data: VendorContract[] }>({ queryKey: ['vendor-contracts', id], queryFn: () => api.get(`/vendors/${id}/contracts`).then((r) => r.data) })
  const { data: paymentsData } = useQuery<{ data: VendorPayment[] }>({ queryKey: ['vendor-payments', id], queryFn: () => api.get(`/vendors/${id}/payments`).then((r) => r.data) })
  const { data: perf } = useQuery<VendorPerf>({ queryKey: ['vendor-perf', id], queryFn: () => api.get(`/vendors/${id}/performance`).then((r) => r.data) })

  if (isLoading) return <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
  if (!vendor) return <p className="text-slate-500">Vendor not found.</p>

  const contracts = contractsData?.data ?? []
  const payments  = paymentsData?.data ?? []
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  const radarData = perf ? [
    { subject: 'On-time',  value: perf.on_time_delivery },
    { subject: 'Quality',  value: perf.quality_score },
    { subject: 'Response', value: Math.max(0, 100 - perf.response_time_hours * 4) },
    { subject: 'Completion', value: Math.round((perf.completed_orders / perf.total_orders) * 100) },
  ] : []

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/vendors" className="p-2 rounded-lg hover:bg-slate-100 transition-colors mt-0.5">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
              {vendor.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{vendor.company_name}</h1>
          <p className="text-slate-500 text-sm">{vendor.contact_person}</p>
          {vendor.rating && <div className="mt-2"><StarRating rating={vendor.rating} /></div>}
        </div>
      </div>

      {/* Contact strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Phone,  label: 'Phone',   value: vendor.phone },
          { icon: Mail,   label: 'Email',   value: vendor.email },
          { icon: MapPin, label: 'Address', value: vendor.address },
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
      <Tabs defaultTab="profile">
        <TabList>
          <Tab id="profile"     label="Profile" />
          <Tab id="contracts"   label={`Contracts (${contracts.length})`} />
          <Tab id="payments"    label={`Payments (${payments.length})`} />
          <Tab id="performance" label="Performance" />
        </TabList>

        <TabPanel id="profile">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400">Company</p><p className="font-medium text-slate-800">{vendor.company_name}</p></div>
              <div><p className="text-xs text-slate-400">Contact</p><p className="font-medium text-slate-800">{vendor.contact_person}</p></div>
              <div><p className="text-xs text-slate-400">Email</p><p className="font-medium text-slate-800">{vendor.email}</p></div>
              <div><p className="text-xs text-slate-400">Phone</p><p className="font-medium text-slate-800">{vendor.phone}</p></div>
              <div className="col-span-2"><p className="text-xs text-slate-400">Address</p><p className="font-medium text-slate-800">{vendor.address}</p></div>
            </div>
          </div>
        </TabPanel>

        <TabPanel id="contracts">
          <div className="space-y-3">
            {contracts.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{c.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(c.start_date)} → {formatDate(c.end_date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900">{formatCurrency(c.value)}</p>
                  <span className={cn('inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize', CONTRACT_STATUS[c.status])}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
            {contracts.length === 0 && <p className="text-sm text-slate-400">No contracts found.</p>}
          </div>
        </TabPanel>

        <TabPanel id="payments">
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">Total Paid</span>
            <span className="text-xl font-bold text-blue-800">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.po_number}</p>
                  <p className="text-xs text-slate-400">{formatDate(p.paid_date)} · {p.method}</p>
                </div>
                <span className="font-semibold text-slate-900">{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {payments.length === 0 && <p className="text-sm text-slate-400">No payments recorded.</p>}
          </div>
        </TabPanel>

        <TabPanel id="performance">
          {perf ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h4 className="font-semibold text-slate-800 mb-4 text-sm">Performance Radar</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h4 className="font-semibold text-slate-800 text-sm">KPIs</h4>
                {[
                  { label: 'On-time Delivery',  value: `${perf.on_time_delivery}%`,  bar: perf.on_time_delivery },
                  { label: 'Quality Score',      value: `${perf.quality_score}%`,     bar: perf.quality_score },
                  { label: 'Orders Completed',   value: `${perf.completed_orders}/${perf.total_orders}`, bar: Math.round((perf.completed_orders / perf.total_orders) * 100) },
                  { label: 'Avg Response Time',  value: `${perf.response_time_hours}h`, bar: null },
                ].map((k) => (
                  <div key={k.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{k.label}</span>
                      <span className="font-semibold text-slate-800">{k.value}</span>
                    </div>
                    {k.bar !== null && (
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${k.bar}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-slate-400">No performance data.</p>}
        </TabPanel>
      </Tabs>
    </div>
  )
}
