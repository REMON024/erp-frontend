'use client'
import { useState, useMemo } from 'react'
import { DateField } from '@/components/ui/DateField'
import { Select } from '@/components/ui/Select'
import {
  Search, Filter, ChevronDown, ChevronRight, Clock,
  User, Database, RefreshCw, X,
} from 'lucide-react'
import { useApiData } from '@/hooks/useApiData'

type AuditAction = 'Create' | 'Update' | 'Delete'

interface AuditLog {
  id: number
  tableName: string
  entityId: string
  action: AuditAction
  oldValues: string | null
  newValues: string | null
  changedBy: string
  changedByName: string
  changedAt: string
  ipAddress: string
}

const KNOWN_TABLES = [
  'Users', 'Roles', 'Menus', 'RoleMenuPermissions', 'Projects', 'Blocks', 'Units',
  'Customers', 'Bookings', 'Installments', 'Invoices', 'Payments',
  'Vendors', 'PurchaseOrders', 'GRN', 'Materials', 'StockTransactions',
  'WorkOrders', 'WorkOrderBills', 'Vouchers', 'Accounts',
]

const ACTION_COLORS: Record<AuditAction, string> = {
  Create: 'bg-emerald-100 text-emerald-700',
  Update: 'bg-primary/10 text-primary',
  Delete: 'bg-red-100 text-red-700',
}

const PAGE_SIZE = 8

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function JsonViewer({ raw }: { raw: string | null }) {
  if (!raw) return <span className="text-content-muted italic text-xs">—</span>
  try {
    const parsed = JSON.parse(raw)
    return (
      <pre className="text-xs bg-surface-muted border border-border-default rounded p-2 overflow-x-auto whitespace-pre-wrap max-w-md">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    )
  } catch {
    return <span className="text-xs text-content-muted">{raw}</span>
  }
}

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasValues = log.oldValues || log.newValues

  return (
    <>
      <tr className="hover:bg-surface-muted transition-colors">
        <td className="px-4 py-3">
          <button
            onClick={() => hasValues && setExpanded(v => !v)}
            className={`flex items-center gap-1 ${hasValues ? 'cursor-pointer text-primary' : 'text-content-muted cursor-default'}`}
          >
            {hasValues
              ? expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
              : <span className="w-3.5" />
            }
            <span className="font-mono text-xs text-content-muted">#{log.id}</span>
          </button>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-content">
            <Database className="w-3.5 h-3.5 text-content-muted" />
            {log.tableName}
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-content-muted">{log.entityId}</td>
        <td className="px-4 py-3">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${ACTION_COLORS[log.action]}`}>
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-content-muted shrink-0" />
            <div>
              <p className="text-xs font-medium text-content">{log.changedByName}</p>
              <p className="text-[11px] text-content-muted">{log.changedBy}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 text-xs text-content-muted">
            <Clock className="w-3 h-3 text-content-muted" />
            {formatDate(log.changedAt)}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-content-muted font-mono">{log.ipAddress}</td>
      </tr>
      {expanded && (
        <tr className="bg-surface-muted border-t border-border-default">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-1.5">Old Values</p>
                <JsonViewer raw={log.oldValues} />
              </div>
              <div>
                <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-1.5">New Values</p>
                <JsonViewer raw={log.newValues} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function AuditLogsPage() {
  const [search, setSearch]             = useState('')
  const [tableFilter, setTableFilter]   = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')
  const [fromDate, setFromDate]         = useState('')
  const [toDate, setToDate]             = useState('')
  const [page, setPage]                 = useState(1)

  const { data: logs = [], isLoading, refetch } = useApiData<AuditLog[]>({
    url: '/audit-logs',
    params: {
      search:    search    || undefined,
      table:     tableFilter  || undefined,
      action:    actionFilter || undefined,
      fromDate:  fromDate  || undefined,
      toDate:    toDate    || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
    queryKey: ['audit-logs', search, tableFilter, actionFilter, fromDate, toDate, page],
  })

  // Client-side fallback filtering (in case the backend returns all and ignores params)
  const filtered = useMemo(() => logs.filter(log => {
    if (search && !log.changedBy.includes(search) && !log.changedByName.toLowerCase().includes(search.toLowerCase())) return false
    if (tableFilter  && log.tableName !== tableFilter) return false
    if (actionFilter && log.action    !== actionFilter) return false
    if (fromDate && new Date(log.changedAt) < new Date(fromDate)) return false
    if (toDate   && new Date(log.changedAt) > new Date(toDate + 'T23:59:59Z')) return false
    return true
  }), [logs, search, tableFilter, actionFilter, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const clearFilters = () => {
    setSearch(''); setTableFilter(''); setActionFilter(''); setFromDate(''); setToDate(''); setPage(1)
  }
  const hasFilter = search || tableFilter || actionFilter || fromDate || toDate

  const counts = useMemo(() => ({
    total:  logs.length,
    create: logs.filter(l => l.action === 'Create').length,
    update: logs.filter(l => l.action === 'Update').length,
    delete: logs.filter(l => l.action === 'Delete').length,
  }), [logs])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-content">Audit Logs</h1>
          <p className="text-sm text-content-muted mt-0.5">Track all data changes across the system</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events',  value: counts.total,  color: 'text-content',   bg: 'bg-surface-muted'   },
          { label: 'Creates',       value: counts.create, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Updates',       value: counts.update, color: 'text-primary',    bg: 'bg-primary/10'    },
          { label: 'Deletes',       value: counts.delete, color: 'text-red-700',     bg: 'bg-red-50'     },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
            <p className="text-xs text-content-muted">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border-default rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-content-muted" />
          <span className="text-sm font-medium text-content">Filters</span>
          {hasFilter && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by user..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <Select
            value={tableFilter}
            onChange={e => { setTableFilter(e.target.value); setPage(1) }}
            className="min-w-[150px]"
          >
            <option value="">All Tables</option>
            {KNOWN_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>

          <Select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value as AuditAction | ''); setPage(1) }}
            className="min-w-[150px]"
          >
            <option value="">All Actions</option>
            <option value="Create">Create</option>
            <option value="Update">Update</option>
            <option value="Delete">Delete</option>
          </Select>

          <DateField
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1) }}
            className="min-w-[150px]"
          />
          <DateField
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(1) }}
            className="min-w-[150px]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
          <span className="text-sm text-content-muted">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {hasFilter ? ' (filtered)' : ''}
          </span>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-content-muted hover:text-primary transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-muted border-b border-border-default">
              <tr>
                {['#', 'Table', 'Entity ID', 'Action', 'Changed By', 'Date & Time', 'IP Address'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-content-muted uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-content-muted text-sm">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                paginated.map(log => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border-default flex items-center justify-between">
            <span className="text-xs text-content-muted">
              Page {page} of {totalPages} — showing {paginated.length} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border-default rounded-lg hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs rounded-lg ${p === page ? 'bg-primary text-white' : 'border border-border-default hover:bg-surface-muted'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-border-default rounded-lg hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
