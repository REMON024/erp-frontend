'use client'
import { useState, useMemo } from 'react'
import {
  Search, Filter, ChevronDown, ChevronRight, Clock,
  User, Database, RefreshCw, X,
} from 'lucide-react'

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

const MOCK_LOGS: AuditLog[] = [
  {
    id: 1, tableName: 'Users', entityId: 'usr-001', action: 'Create',
    oldValues: null,
    newValues: JSON.stringify({ firstName: 'Alice', lastName: 'Smith', email: 'alice@constructerp.bd', role: 'operations' }),
    changedBy: 'admin@constructerp.bd', changedByName: 'Super Admin',
    changedAt: '2026-05-23T10:15:00Z', ipAddress: '192.168.1.1',
  },
  {
    id: 2, tableName: 'Users', entityId: 'usr-002', action: 'Update',
    oldValues: JSON.stringify({ firstName: 'Bob', status: 'Active' }),
    newValues: JSON.stringify({ firstName: 'Bob', status: 'Inactive' }),
    changedBy: 'admin@constructerp.bd', changedByName: 'Super Admin',
    changedAt: '2026-05-23T09:45:00Z', ipAddress: '192.168.1.1',
  },
  {
    id: 3, tableName: 'Roles', entityId: 'role-003', action: 'Update',
    oldValues: JSON.stringify({ name: 'inventory', permissionCount: 4 }),
    newValues: JSON.stringify({ name: 'inventory', permissionCount: 8 }),
    changedBy: 'admin@constructerp.bd', changedByName: 'Super Admin',
    changedAt: '2026-05-22T16:30:00Z', ipAddress: '192.168.1.1',
  },
  {
    id: 4, tableName: 'Menus', entityId: 'menu-012', action: 'Create',
    oldValues: null,
    newValues: JSON.stringify({ code: 'REPORTS', label: 'Reports', route: '/reports', sortOrder: 15 }),
    changedBy: 'admin@constructerp.bd', changedByName: 'Super Admin',
    changedAt: '2026-05-22T14:00:00Z', ipAddress: '192.168.1.2',
  },
  {
    id: 5, tableName: 'Projects', entityId: 'proj-007', action: 'Update',
    oldValues: JSON.stringify({ status: 'Planning', budget: 5000000 }),
    newValues: JSON.stringify({ status: 'Active', budget: 5500000 }),
    changedBy: 'ops@constructerp.bd', changedByName: 'Operations Manager',
    changedAt: '2026-05-22T11:20:00Z', ipAddress: '192.168.1.5',
  },
  {
    id: 6, tableName: 'RoleMenuPermissions', entityId: 'perm-021', action: 'Delete',
    oldValues: JSON.stringify({ roleId: 'role-002', menuCode: 'ACCOUNTING', canView: true, canCreate: false }),
    newValues: null,
    changedBy: 'admin@constructerp.bd', changedByName: 'Super Admin',
    changedAt: '2026-05-21T17:45:00Z', ipAddress: '192.168.1.1',
  },
  {
    id: 7, tableName: 'Users', entityId: 'usr-005', action: 'Delete',
    oldValues: JSON.stringify({ firstName: 'Charlie', email: 'charlie@constructerp.bd', role: 'inventory' }),
    newValues: null,
    changedBy: 'admin@constructerp.bd', changedByName: 'Super Admin',
    changedAt: '2026-05-21T15:10:00Z', ipAddress: '192.168.1.1',
  },
  {
    id: 8, tableName: 'Menus', entityId: 'menu-008', action: 'Update',
    oldValues: JSON.stringify({ label: 'Stocks', sortOrder: 4 }),
    newValues: JSON.stringify({ label: 'Inventory', sortOrder: 5 }),
    changedBy: 'admin@constructerp.bd', changedByName: 'Super Admin',
    changedAt: '2026-05-20T09:00:00Z', ipAddress: '192.168.1.3',
  },
  {
    id: 9, tableName: 'Purchase', entityId: 'po-031', action: 'Create',
    oldValues: null,
    newValues: JSON.stringify({ vendorId: 'ven-002', amount: 120000, status: 'Pending' }),
    changedBy: 'ops@constructerp.bd', changedByName: 'Operations Manager',
    changedAt: '2026-05-20T08:30:00Z', ipAddress: '192.168.1.5',
  },
  {
    id: 10, tableName: 'Roles', entityId: 'role-004', action: 'Create',
    oldValues: null,
    newValues: JSON.stringify({ name: 'accountant', description: 'Finance team role', isActive: true }),
    changedBy: 'admin@constructerp.bd', changedByName: 'Super Admin',
    changedAt: '2026-05-19T13:00:00Z', ipAddress: '192.168.1.1',
  },
  {
    id: 11, tableName: 'Inventory', entityId: 'item-055', action: 'Update',
    oldValues: JSON.stringify({ quantity: 100, unitPrice: 250 }),
    newValues: JSON.stringify({ quantity: 85, unitPrice: 250 }),
    changedBy: 'store@constructerp.bd', changedByName: 'Store Manager',
    changedAt: '2026-05-19T10:15:00Z', ipAddress: '192.168.1.7',
  },
  {
    id: 12, tableName: 'Accounting', entityId: 'txn-092', action: 'Create',
    oldValues: null,
    newValues: JSON.stringify({ type: 'Debit', accountCode: '5001', amount: 75000, narration: 'Material Purchase' }),
    changedBy: 'ops@constructerp.bd', changedByName: 'Operations Manager',
    changedAt: '2026-05-18T14:50:00Z', ipAddress: '192.168.1.5',
  },
]

const ACTION_COLORS: Record<AuditAction, string> = {
  Create: 'bg-emerald-100 text-emerald-700',
  Update: 'bg-blue-100 text-blue-700',
  Delete: 'bg-red-100 text-red-700',
}

const TABLE_NAMES = [...new Set(MOCK_LOGS.map(l => l.tableName))].sort()
const PAGE_SIZE = 8

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function JsonViewer({ raw }: { raw: string | null }) {
  if (!raw) return <span className="text-slate-400 italic text-xs">—</span>
  try {
    const parsed = JSON.parse(raw)
    return (
      <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto whitespace-pre-wrap max-w-md">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    )
  } catch {
    return <span className="text-xs text-slate-600">{raw}</span>
  }
}

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasValues = log.oldValues || log.newValues

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          <button
            onClick={() => hasValues && setExpanded(v => !v)}
            className={`flex items-center gap-1 ${hasValues ? 'cursor-pointer text-blue-600' : 'text-slate-400 cursor-default'}`}
          >
            {hasValues
              ? expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
              : <span className="w-3.5" />
            }
            <span className="font-mono text-xs text-slate-400">#{log.id}</span>
          </button>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            {log.tableName}
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.entityId}</td>
        <td className="px-4 py-3">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${ACTION_COLORS[log.action]}`}>
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-700">{log.changedByName}</p>
              <p className="text-[11px] text-slate-400">{log.changedBy}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatDate(log.changedAt)}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.ipAddress}</td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 border-t border-slate-100">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Old Values</p>
                <JsonViewer raw={log.oldValues} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">New Values</p>
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
  const [search, setSearch]           = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')
  const [fromDate, setFromDate]       = useState('')
  const [toDate, setToDate]           = useState('')
  const [page, setPage]               = useState(1)

  const filtered = useMemo(() => {
    return MOCK_LOGS.filter(log => {
      if (search && !log.changedBy.includes(search) && !log.changedByName.toLowerCase().includes(search.toLowerCase())) return false
      if (tableFilter && log.tableName !== tableFilter) return false
      if (actionFilter && log.action !== actionFilter) return false
      if (fromDate && new Date(log.changedAt) < new Date(fromDate)) return false
      if (toDate && new Date(log.changedAt) > new Date(toDate + 'T23:59:59Z')) return false
      return true
    })
  }, [search, tableFilter, actionFilter, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const clearFilters = () => {
    setSearch(''); setTableFilter(''); setActionFilter(''); setFromDate(''); setToDate(''); setPage(1)
  }
  const hasFilter = search || tableFilter || actionFilter || fromDate || toDate

  const counts = useMemo(() => ({
    total: MOCK_LOGS.length,
    create: MOCK_LOGS.filter(l => l.action === 'Create').length,
    update: MOCK_LOGS.filter(l => l.action === 'Update').length,
    delete: MOCK_LOGS.filter(l => l.action === 'Delete').length,
  }), [])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track all data changes across the system</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events',  value: counts.total,  color: 'text-slate-700',   bg: 'bg-slate-50'   },
          { label: 'Creates',       value: counts.create, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Updates',       value: counts.update, color: 'text-blue-700',    bg: 'bg-blue-50'    },
          { label: 'Deletes',       value: counts.delete, color: 'text-red-700',     bg: 'bg-red-50'     },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Filters</span>
          {hasFilter && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by user..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={tableFilter}
            onChange={e => { setTableFilter(e.target.value); setPage(1) }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Tables</option>
            {TABLE_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value as AuditAction | ''); setPage(1) }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Actions</option>
            <option value="Create">Create</option>
            <option value="Update">Update</option>
            <option value="Delete">Delete</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1) }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(1) }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {hasFilter ? ' (filtered)' : ''}
          </span>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#', 'Table', 'Entity ID', 'Action', 'Changed By', 'Date & Time', 'IP Address'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                paginated.map(log => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} — showing {paginated.length} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs rounded-lg ${p === page ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
