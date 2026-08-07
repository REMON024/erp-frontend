'use client'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchBar } from '@/components/ui/SearchBar'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import { ScopePicker, scopeToParams, EMPTY_SCOPE, type ScopeValue } from '@/components/pickers/ScopePicker'
import { Modal } from '@/components/ui/Modal'
import { AttachmentPanel } from '@/components/pickers/AttachmentPanel'
import { Plus, ShoppingCart, ClipboardList, CheckCircle, Receipt, Undo2, ListTree, Paperclip } from 'lucide-react'
import api from '@/lib/api'
import { NewOrderModal } from './NewOrderModal'
import { BillsModal } from './BillsModal'
import { ItemsModal } from './ItemsModal'
import {
  type OrderListItem, type OrderType, type OrderCapabilities,
  type Vendor, type Material,
  STATUS_COLORS, scopeColor, ORDER_TYPE_LABEL, fmt,
} from './types'

/**
 * Purchase orders and work orders in one place. They stay separate aggregates with separate
 * lifecycles behind the scenes — this screen merges the entry flow and the list, and only
 * offers each row the actions its own type supports.
 */
export function OrdersPage() {
  const qc = useQueryClient()
  const [search,  setSearch]  = useState('')
  const [type,    setType]    = useState<'' | OrderType>('')
  const [status,  setStatus]  = useState('')
  const [scope,   setScope]   = useState<ScopeValue>(EMPTY_SCOPE)
  const [creating, setCreating] = useState(false)
  const [billsFor, setBillsFor] = useState<OrderListItem | null>(null)
  const [itemsFor, setItemsFor] = useState<OrderListItem | null>(null)
  // Purchase orders have no detail screen of their own, so files hang off the list row — and the
  // same action serves work orders, which keeps one place to look for an order's paperwork.
  const [filesFor, setFilesFor] = useState<OrderListItem | null>(null)
  const [err,      setErr]      = useState('')

  const { data: capabilities } = useApiData<OrderCapabilities>({
    url: '/orders/capabilities', queryKey: ['order-capabilities'],
  })
  // No projects fetch here — ScopePicker pulls the list itself off the shared cache key.
  const { data: vendors = [] }   = useApiData<Vendor[]>({ url: '/vendors', queryKey: ['vendors-list'] })
  const { data: materials = [] } = useApiData<Material[]>({ url: '/resources', queryKey: ['resources-list'] })

  const { data: orders = [], isLoading, error, refetch } = useApiData<OrderListItem[]>({
    url: '/orders',
    params: {
      search: search || undefined, type: type || undefined,
      status: status || undefined, ...scopeToParams(scope),
    },
    queryKey: ['orders', search, type, status,
               scope.projectId, scope.nodeId],
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['orders'] })
    refetch()
  }

  const approve = async (o: OrderListItem) => {
    setErr('')
    try {
      await api.post(`/orders/${o.orderType}/${o.id}/approve`)
      invalidate()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? `Failed to approve ${o.orderNo}`)
    }
  }

  const releaseRetention = async (o: OrderListItem) => {
    setErr('')
    try {
      await api.post(`/work-orders/${o.id}/release-retention`)
      invalidate()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to release retention')
    }
  }

  const canCreate = capabilities?.canCreatePurchase || capabilities?.canCreateWork

  // Only statuses that exist for the selected type, so the filter never offers a dead option.
  const statusOptions = type === 'Purchase' ? ['Draft', 'Approved', 'Received', 'Cancelled']
    : type === 'Work'                       ? ['Draft', 'Active', 'Completed', 'Cancelled']
    : ['Draft', 'Approved', 'Active', 'Received', 'Completed', 'Cancelled']

  const totalValue = orders.reduce((s, o) => s + o.amount, 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        subtitle="Purchase orders to suppliers and work orders to contractors"
        action={canCreate ? (
          <button onClick={() => setCreating(true)}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Order
          </button>
        ) : undefined}
      />

      {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

      <div className="flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search order no. or vendor…" />
        <Select value={type} onChange={e => { setType(e.target.value as '' | OrderType); setStatus('') }} className="w-44">
          <option value="">All order types</option>
          <option value="Purchase">Purchase Orders</option>
          <option value="Work">Work Orders</option>
        </Select>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <ScopePicker value={scope} onChange={setScope} mode="filter" />
        <span className="text-xs text-content-muted ml-auto">
          {orders.length} order{orders.length === 1 ? '' : 's'} · {fmt(totalValue)}
        </span>
      </div>

      <DataState loading={isLoading} error={error?.message ?? null} empty={orders.length === 0}
        emptyMessage="No orders match these filters.">
        <div className="overflow-x-auto border border-border-default rounded-xl">
          <table className="w-full min-w-[1020px] text-sm">
            <thead className="bg-surface-muted border-b border-border-default">
              <tr>
                {[
                  { h: 'Type' }, { h: 'Order No.' }, { h: 'Vendor' }, { h: 'Project' },
                  { h: 'Scope' },
                  { h: 'Date' }, { h: 'Lines', num: true }, { h: 'Amount', num: true },
                  { h: 'Status' }, { h: '' },
                ].map(({ h, num }) => (
                  <th key={h} className={`px-3 py-2 text-xs font-semibold text-content-muted ${num ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {orders.map(o => {
                const isWork = o.orderType === 'Work'
                return (
                  <tr key={`${o.orderType}-${o.id}`} className="hover:bg-surface-muted">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-content-muted">
                        {isWork ? <ClipboardList className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                        {ORDER_TYPE_LABEL[o.orderType]}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">{o.orderNo}</td>
                    <td className="px-3 py-2 text-content text-xs">{o.vendorName}</td>
                    <td className="px-3 py-2 text-content-muted text-xs">{o.projectName ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${scopeColor(o.scopeLevel)}`}>
                        {o.scopeLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-content-muted text-xs">{o.orderDate || '—'}</td>
                    <td className="px-3 py-2 text-content-muted text-xs text-right tabular-nums">{o.lineCount}</td>
                    <td className="px-3 py-2 font-semibold text-content text-xs text-right tabular-nums">{fmt(o.amount)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[o.status] ?? 'bg-surface-muted text-content-muted'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        {o.status === 'Draft' && (isWork ? capabilities?.canApproveWork : capabilities?.canApprovePurchase) && (
                          <button onClick={() => approve(o)} title={isWork ? 'Approve → Active' : 'Approve'}
                            className="p-1 text-content-muted hover:text-success hover:bg-success/10 rounded transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => setFilesFor(o)} title="Attachments"
                          className="p-1 text-content-muted hover:text-primary hover:bg-primary/10 rounded transition-colors">
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                        {/* Line-level receipt history: work orders carry resource lines that
                            stock-in books against, so only they have a history to show. */}
                        {isWork && (
                          <button onClick={() => setItemsFor(o)} title="Item history"
                            className="p-1 text-content-muted hover:text-primary hover:bg-primary/10 rounded transition-colors">
                            <ListTree className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Progress billing and retention exist only on work orders. */}
                        {isWork && (
                          <button onClick={() => setBillsFor(o)} title="Progress bills"
                            className="p-1 text-content-muted hover:text-primary hover:bg-primary/10 rounded transition-colors">
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isWork && (o.retentionPercent ?? 0) > 0 && (
                          <button onClick={() => releaseRetention(o)} title="Release retention"
                            className="p-1 text-content-muted hover:text-info hover:bg-info/10 rounded transition-colors">
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </DataState>

      {creating && capabilities && (
        <NewOrderModal
          capabilities={capabilities}
          vendors={vendors} materials={materials}
          onClose={() => setCreating(false)}
          onSaved={invalidate}
        />
      )}
      {itemsFor && (
        <ItemsModal wo={itemsFor} onClose={() => setItemsFor(null)} />
      )}
      {filesFor && (
        <Modal open onClose={() => setFilesFor(null)} title={`Attachments — ${filesFor.orderNo}`} size="md">
          <AttachmentPanel
            entityType={filesFor.orderType === 'Work' ? 'WorkOrder' : 'PurchaseOrder'}
            entityId={filesFor.id}
          />
        </Modal>
      )}
      {billsFor && (
        <BillsModal wo={billsFor} onClose={() => setBillsFor(null)} onChanged={invalidate} />
      )}
    </div>
  )
}
