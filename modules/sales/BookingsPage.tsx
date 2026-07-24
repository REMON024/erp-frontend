'use client'
import { useState } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, XCircle, Clock, CalendarDays, List } from 'lucide-react'
import api from '@/lib/api'

interface Installment { installmentNo: number; dueDate: string; amount: number; status: string }

interface Customer { id: number; fullName: string; status: string }
interface Unit     { id: number; unitNo: string; status: string; totalPrice: number; blockName: string; projectId: number }
interface Booking {
  id: number; bookingNo: string; projectId: number; unitId: number; unitNo: string
  customerId: number; customerName: string; bookingDate: string
  bookingAmount: number; totalPrice: number; discountAmount: number
  netAmount: number; installmentCount: number; handoverDate?: string; status: string
}

const STATUS_COLORS: Record<string, string> = {
  Active:    'bg-primary/10 text-primary',
  Cancelled: 'bg-danger/10 text-danger',
}
function fmt(n: number) { return `৳${n.toLocaleString('en-BD')}` }
function isoToday() { return new Date().toISOString().split('T')[0] }

const inp = 'w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none'
const lbl = 'block text-sm font-medium text-content mb-1'

const schema = z.object({
  customerId:       z.coerce.number().min(1, 'Required'),
  unitId:           z.coerce.number().min(1, 'Required'),
  bookingDate:      z.string().min(1, 'Required'),
  bookingAmount:    z.coerce.number().min(1, 'Required'),
  discountAmount:   z.coerce.number().min(0),
  installmentCount: z.coerce.number().int().min(0),
  handoverDate:     z.string().optional(),
})
type Form = z.infer<typeof schema>

function BookingModal({ customers, units, onClose, onSaved }: {
  customers: Customer[]; units: Unit[]; onClose: () => void; onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { bookingDate: isoToday(), discountAmount: 0, installmentCount: 12 },
  })

  const availableUnits = units.filter(u => u.status === 'Available')
  const selectedUnitId = watch('unitId')
  const selectedUnit = units.find(u => u.id === Number(selectedUnitId))

  const [schedule, setSchedule] = useState<Installment[] | null>(null)

  // Custom (hand-built) schedule — uneven instalments that must sum to the financed amount.
  const [useCustom, setUseCustom] = useState(false)
  const [lines, setLines] = useState<{ dueDate: string; amount: number }[]>([{ dueDate: isoToday(), amount: 0 }])
  const watchBooking  = Number(watch('bookingAmount')) || 0
  const watchDiscount = Number(watch('discountAmount')) || 0
  const financed = selectedUnit ? Math.max(0, selectedUnit.totalPrice - watchDiscount - watchBooking) : 0
  const scheduleTotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const scheduleMatches = Math.round(scheduleTotal * 100) === Math.round(financed * 100)

  const onSubmit = async (d: Form) => {
    if (useCustom && !scheduleMatches) { setErr(`Schedule must sum to the financed amount (${fmt(financed)})`); return }
    setSaving(true); setErr('')
    try {
      const payload: any = { ...d }
      if (useCustom) {
        payload.installmentCount = 0
        payload.schedule = lines.map(l => ({ dueDate: l.dueDate, amount: Number(l.amount) }))
      }
      const res = await api.post('/bookings', payload)
      const bookingId = res.data?.id
      if (bookingId && (useCustom || Number(d.installmentCount) > 0)) {
        try {
          const schedRes = await api.get(`/installments?bookingId=${bookingId}`)
          const items: Installment[] = schedRes.data?.data ?? schedRes.data ?? []
          if (items.length > 0) { setSchedule(items); return }
        } catch { /* show schedule failed silently */ }
      }
      onSaved(); onClose()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  if (schedule) {
    return (
      <Modal open onClose={() => { onSaved(); onClose() }} title="Booking Confirmed — Installment Schedule" size="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-success bg-success/10 border border-success/20 rounded-lg px-4 py-2 text-sm">
            <List className="w-4 h-4" /> Booking saved. Review the installment schedule below.
          </div>
          <div className="overflow-x-auto border border-border-default rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>{[{ h: '#', align: 'center' as const }, { h: 'Due Date' }, { h: 'Amount', num: true }, { h: 'Status' }].map(({ h, num, align }) => (
                  <th key={h} className={`px-4 py-2 text-xs font-semibold text-content-muted ${num ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {schedule.map(s => (
                  <tr key={s.installmentNo}>
                    <td className="px-4 py-2 text-content-muted text-center">{s.installmentNo}</td>
                    <td className="px-4 py-2 text-content text-xs">{s.dueDate}</td>
                    <td className="px-4 py-2 font-semibold text-content text-right tabular-nums">{fmt(s.amount)}</td>
                    <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-content-muted">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-2 border-t border-border-default">
            <button onClick={() => { onSaved(); onClose() }}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium">
              Done
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="New Booking" size="lg">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Client <span className="text-danger">*</span></label>
            <Select {...register('customerId')}>
              <option value="">Select client</option>
              {customers.filter(c => c.status === 'Active').map(c => (
                <option key={c.id} value={c.id}>{c.fullName}</option>
              ))}
            </Select>
            {errors.customerId && <p className="text-xs text-danger mt-1">{errors.customerId.message}</p>}
          </div>
          <div>
            <label className={lbl}>Booking Date <span className="text-danger">*</span></label>
            <DateField {...register('bookingDate')} />
          </div>
        </div>
        <div>
          <label className={lbl}>Unit <span className="text-content-muted font-normal">(only available units)</span></label>
          <Select {...register('unitId')}
            onChange={e => {
              setValue('unitId', Number(e.target.value))
              const u = units.find(x => x.id === Number(e.target.value))
              if (u) setValue('bookingAmount', Math.round(u.totalPrice * 0.1))
            }}>
            <option value="">Select unit</option>
            {availableUnits.map(u => (
              <option key={u.id} value={u.id}>{u.unitNo} — {u.blockName} | {fmt(u.totalPrice)}</option>
            ))}
          </Select>
          {availableUnits.length === 0 && <p className="text-xs text-warning mt-1">No available units</p>}
          {errors.unitId && <p className="text-xs text-danger mt-1">{errors.unitId.message}</p>}
        </div>
        {selectedUnit && (
          <div className="bg-surface-muted rounded-lg px-3 py-2 text-xs text-content-muted">
            Unit price: <strong>{fmt(selectedUnit.totalPrice)}</strong>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Booking Amount (৳) <span className="text-danger">*</span></label>
            <input type="number" {...register('bookingAmount')} className={inp} placeholder="10% of price" />
            {errors.bookingAmount && <p className="text-xs text-danger mt-1">{errors.bookingAmount.message}</p>}
          </div>
          <div>
            <label className={lbl}>Discount (৳)</label>
            <input type="number" {...register('discountAmount')} className={inp} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Installments</label>
            <input type="number" {...register('installmentCount')} className={inp} placeholder="12" min={0} disabled={useCustom} />
          </div>
        </div>

        {/* Custom schedule builder */}
        <div className="border border-border-default rounded-lg p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-content">
            <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} className="w-4 h-4" />
            Custom payment schedule (uneven instalments)
          </label>
          {useCustom && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-content-muted">Financed amount to schedule: <strong className="text-content">{fmt(financed)}</strong></span>
                <span className={scheduleMatches ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                  Total: {fmt(scheduleTotal)} {scheduleMatches ? '✓' : `(must equal ${fmt(financed)})`}
                </span>
              </div>
              {lines.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <DateField value={l.dueDate}
                    onChange={e => setLines(ls => ls.map((x, i) => i === idx ? { ...x, dueDate: e.target.value } : x))}
                    className="text-xs flex-1" />
                  <input type="number" step="any" value={l.amount} placeholder="Amount"
                    onChange={e => setLines(ls => ls.map((x, i) => i === idx ? { ...x, amount: Number(e.target.value) } : x))}
                    className="border border-border-default rounded px-2 py-1 text-xs w-32" />
                  <button type="button" onClick={() => setLines(ls => ls.length > 1 ? ls.filter((_, i) => i !== idx) : ls)}
                    className="text-content-muted/50 hover:text-danger"><XCircle className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setLines(ls => [...ls, { dueDate: isoToday(), amount: 0 }])}
                className="text-xs text-primary hover:text-primary font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add instalment
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Cancel</button>
          <button type="submit" disabled={saving || (useCustom && !scheduleMatches)} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-60">
            {saving ? 'Saving…' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function BookingsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [modal,  setModal]  = useState<'new' | 'cancel' | null>(null)
  const [target, setTarget] = useState<Booking | null>(null)

  const { data: customers = [] } = useApiData<Customer[]>({ url: '/customers', queryKey: ['customers-list'] })
  const { data: units = [] }     = useApiData<Unit[]>({ url: '/units', queryKey: ['units-list'] })

  const { data: bookings = [], isLoading, error, refetch } = useApiData<Booking[]>({
    url: '/bookings',
    params: { search: search || undefined, status: status || undefined },
    queryKey: ['bookings', search, status],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['bookings'] })
    qc.invalidateQueries({ queryKey: ['units'] })
    qc.invalidateQueries({ queryKey: ['units-list'] })
  }

  const cancelBooking = async () => {
    if (!target) return
    try { await api.post(`/bookings/${target.id}/cancel`); invalidate() } catch { /* noop */ }
    setModal(null); setTarget(null)
  }

  const activeBookings = bookings.filter(b => b.status === 'Active')
  const totalValue = activeBookings.reduce((s, b) => s + b.netAmount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Manage unit bookings and sales agreements"
        action={
          <button onClick={() => setModal('new')}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Booking
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Booking Value', value: fmt(totalValue),         color: 'text-info', bg: 'bg-info/10' },
          { label: 'Active Bookings',     value: activeBookings.length,    color: 'text-primary',   bg: 'bg-primary/10' },
          { label: 'Total Bookings',      value: bookings.length,          color: 'text-content',   bg: 'bg-surface' },
          { label: 'Cancelled',           value: bookings.filter(b => b.status === 'Cancelled').length, color: 'text-danger', bg: 'bg-danger/10' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-border-default p-5 ${s.bg}`}>
            <p className="text-sm text-content-muted">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search booking no, client, unit…" onRefresh={refetch}>
        <Select value={status} onChange={e => setStatus(e.target.value)}
          className="min-w-[150px]">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Cancelled">Cancelled</option>
        </Select>
      </SearchBar>

      <DataState loading={isLoading} error={error ? 'Failed to load bookings.' : null} onRetry={refetch}
        empty={bookings.length === 0} emptyMessage="No bookings yet.">
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-surface-muted border-b border-border-default">
                <tr>
                  {[
                    { h: 'Booking No.' }, { h: 'Client' }, { h: 'Unit' },
                    { h: 'Net Amount', num: true }, { h: 'Booking Amt', num: true },
                    { h: 'Installments', align: 'center' as const }, { h: 'Date' }, { h: 'Status' }, { h: '' },
                  ].map(({ h, num, align }) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-content-muted uppercase tracking-wide ${num ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{b.bookingNo}</td>
                    <td className="px-4 py-3 font-medium text-content text-sm">{b.customerName}</td>
                    <td className="px-4 py-3 text-content-muted text-xs font-semibold">{b.unitNo}</td>
                    <td className="px-4 py-3 font-semibold text-content text-right tabular-nums">{fmt(b.netAmount)}</td>
                    <td className="px-4 py-3 text-content-muted text-xs text-right tabular-nums">{fmt(b.bookingAmount)}</td>
                    <td className="px-4 py-3 text-content-muted text-center">{b.installmentCount}</td>
                    <td className="px-4 py-3 text-content-muted text-xs">
                      <div className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{b.bookingDate}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? 'bg-surface-muted text-content-muted'}`}>
                        {b.status === 'Active' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.status === 'Active' && (
                        <button onClick={() => { setTarget(b); setModal('cancel') }}
                          className="p-1.5 text-content-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors" title="Cancel Booking">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {modal === 'new' && (
        <BookingModal customers={customers} units={units} onClose={() => setModal(null)} onSaved={invalidate} />
      )}

      {modal === 'cancel' && target && (
        <Modal open onClose={() => { setModal(null); setTarget(null) }} title="Cancel Booking" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-content-muted">
              Cancel booking <strong>{target.bookingNo}</strong> for <strong>{target.customerName}</strong>?
              Unit <strong>{target.unitNo}</strong> will be released back to available.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setModal(null); setTarget(null) }}
                className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-muted">Keep Booking</button>
              <button onClick={cancelBooking}
                className="px-4 py-2 text-sm bg-danger text-white rounded-lg hover:bg-danger font-medium">Cancel Booking</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
