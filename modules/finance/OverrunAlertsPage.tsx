'use client'
import { useState } from 'react'
import { AlertTriangle, AlertCircle, CheckCircle, Bell, DollarSign } from 'lucide-react'

interface Alert {
  id: string; project: string; category: string
  budget: number; spent: number; overrun: number; overrun_pct: number
  severity: 'critical' | 'warning' | 'info'; status: 'active' | 'acknowledged' | 'resolved'
  date: string; description: string
}

const MOCK: Alert[] = [
  { id: 'a1', project: 'Riverside Complex', category: 'Labor Cost',     budget: 3000000,  spent: 3750000,  overrun: 750000,  overrun_pct: 25.0, severity: 'critical', status: 'active',       date: '2025-11-22', description: 'Labor costs exceeding budget due to overtime and contractor rate increases' },
  { id: 'a2', project: 'Green Valley',      category: 'Materials',      budget: 1800000,  spent: 2100000,  overrun: 300000,  overrun_pct: 16.7, severity: 'critical', status: 'active',       date: '2025-11-20', description: 'Steel and cement prices increased significantly above project estimates' },
  { id: 'a3', project: 'Skyline Tower',     category: 'Equipment',      budget: 800000,   spent: 920000,   overrun: 120000,  overrun_pct: 15.0, severity: 'warning',  status: 'acknowledged', date: '2025-11-18', description: 'Additional crane hire required for Phase 3 structural work' },
  { id: 'a4', project: 'Metro Station',     category: 'Subcontract',    budget: 4500000,  spent: 4850000,  overrun: 350000,  overrun_pct: 7.8,  severity: 'warning',  status: 'active',       date: '2025-11-15', description: 'Subcontractor scope creep on MEP systems installation' },
  { id: 'a5', project: 'Riverside Complex', category: 'Overhead',       budget: 500000,   spent: 540000,   overrun: 40000,   overrun_pct: 8.0,  severity: 'info',     status: 'resolved',     date: '2025-11-10', description: 'Site management overhead slightly above estimate — resolved by renegotiating office rental' },
]

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning:  'bg-amber-100 text-amber-700 border-amber-200',
  info:     'bg-blue-100 text-blue-700 border-blue-200',
}
const SEV_ICON: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="w-4 h-4 text-red-500" />,
  warning:  <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info:     <Bell className="w-4 h-4 text-blue-500" />,
}
const STS_COLORS: Record<string, string> = {
  active:       'bg-red-100 text-red-700',
  acknowledged: 'bg-amber-100 text-amber-700',
  resolved:     'bg-green-100 text-green-700',
}

const fmt = (n: number) => `৳${(n / 1000).toFixed(0)}K`

export function OverrunAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK)
  const [filter, setFilter] = useState('')

  function acknowledge(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a))
  }
  function resolve(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a))
  }

  const displayed   = filter ? alerts.filter(a => a.severity === filter || a.status === filter) : alerts
  const critical    = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length
  const warning     = alerts.filter(a => a.severity === 'warning'  && a.status !== 'resolved').length
  const totalOverrun= alerts.filter(a => a.status !== 'resolved').reduce((s, a) => s + a.overrun, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overrun Alerts</h1>
        <p className="text-sm text-gray-500 mt-0.5">Budget overrun notifications and cost escalation alerts</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Overrun</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{fmt(totalOverrun)}</p>
            <p className="text-xs text-gray-400 mt-1">Active alerts only</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-red-50">
            <DollarSign className="w-5 h-5 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Critical Alerts</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{critical}</p>
            <p className="text-xs text-gray-400 mt-1">Immediate attention required</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Warnings</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{warning}</p>
            <p className="text-xs text-gray-400 mt-1">Monitor closely</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-50">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 font-medium">Resolved</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{alerts.filter(a => a.status === 'resolved').length}</p>
            <p className="text-xs text-gray-400 mt-1">Issues closed</p>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-green-50">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: '',            label: 'All' },
          { key: 'critical',    label: 'Critical' },
          { key: 'warning',     label: 'Warning' },
          { key: 'active',      label: 'Active' },
          { key: 'acknowledged',label: 'Acknowledged' },
          { key: 'resolved',    label: 'Resolved' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium ${filter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert cards */}
      <div className="space-y-4">
        {displayed.map(a => (
          <div key={a.id} className={`bg-white rounded-xl border p-5 ${a.status === 'resolved' ? 'opacity-70' : ''} ${a.severity === 'critical' && a.status !== 'resolved' ? 'border-red-200' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  a.severity === 'critical' ? 'bg-red-50' : a.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                }`}>
                  {SEV_ICON[a.severity]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{a.project}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.category} · {a.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border capitalize ${SEV_COLORS[a.severity]}`}>{a.severity}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STS_COLORS[a.status]}`}>{a.status}</span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">{a.description}</p>

            <div className="grid grid-cols-4 gap-4 text-xs mb-4">
              <div>
                <span className="text-gray-400">Budget</span>
                <p className="font-semibold text-gray-900">{fmt(a.budget)}</p>
              </div>
              <div>
                <span className="text-gray-400">Spent</span>
                <p className="font-semibold text-gray-900">{fmt(a.spent)}</p>
              </div>
              <div>
                <span className="text-gray-400">Overrun</span>
                <p className="font-semibold text-red-600">+{fmt(a.overrun)}</p>
              </div>
              <div>
                <span className="text-gray-400">Overrun %</span>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${a.overrun_pct >= 20 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  +{a.overrun_pct}%
                </span>
              </div>
            </div>

            <div className="mb-3">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((a.spent / a.budget) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Spent {Math.round((a.spent / a.budget) * 100)}% of budget</p>
            </div>

            {a.status !== 'resolved' && (
              <div className="flex gap-2">
                {a.status === 'active' && (
                  <button onClick={() => acknowledge(a.id)} className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                    Acknowledge
                  </button>
                )}
                <button onClick={() => resolve(a.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                </button>
                <button className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">
                  View Budget Details
                </button>
              </div>
            )}
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200">No alerts found</div>
        )}
      </div>
    </div>
  )
}
