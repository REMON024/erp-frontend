'use client'
import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Input, Field } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DateField } from '@/components/ui/DateField'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { useApiData } from '@/hooks/useApiData'
import { useQueryClient } from '@tanstack/react-query'
import { ScopePicker, EMPTY_SCOPE, type ScopeValue } from '@/components/pickers/ScopePicker'
import api from '@/lib/api'
import type { ProjectUnit } from '@/modules/projects/ProjectUnitsPage'

/**
 * Margin policy: how much profit to add per unit of measure, and where it applies.
 *
 * Replaces the sales rate card. A rate card set the whole price, so it drifted away from what a
 * flat actually cost to build. A margin is set once at the project — or overridden on a block — and
 * the price follows cost from there.
 */

interface Project { id: number; projectName: string; projectCode: string }

interface ProfitConfig {
  id: number
  nodeId: number
  nodeName: string
  breadcrumb: string
  levelName: string
  projectUnitId: number
  projectUnitCode: string
  projectUnitSymbol: string | null
  profitPerUnit: number
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  notes: string | null
  appliesToCount: number
}

function isoToday() { return new Date().toISOString().split('T')[0] }

export function ProfitConfigPage() {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState('')
  const [editing, setEditing] = useState<ProfitConfig | 'new' | null>(null)

  const { data: projects = [] } = useApiData<Project[]>({ url: '/projects', queryKey: ['projects-list'] })

  const { data: configs = [], isLoading, error, refetch } = useApiData<ProfitConfig[]>({
    url: '/profit-configs',
    params: { projectId: projectId || undefined },
    queryKey: ['profit-configs', projectId],
    enabled: !!projectId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['profit-configs'] })
    // The listing prices off these rows, so it has to be refetched or it would show stale margins.
    qc.invalidateQueries({ queryKey: ['sellable-items'] })
  }

  const remove = async (config: ProfitConfig) => {
    if (!window.confirm(
      `Delete the ${config.profitPerUnit}/${config.projectUnitSymbol ?? config.projectUnitCode} margin on `
      + `${config.nodeName}? Anything relying on it falls back to the level above, or becomes unpriced.`
    )) return
    try {
      await api.delete(`/profit-configs/${config.id}`)
      invalidate()
    } catch (e: any) {
      window.alert(e.response?.data?.errors?.[0] ?? 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit Config"
        subtitle="Margin per unit of measure. The nearest one above an item wins, so a project-wide rate covers everything until a block overrides it"
        action={
          <div className="flex items-center gap-2">
            <Select value={projectId} onChange={e => setProjectId(e.target.value)} className="min-w-[220px]">
              <option value="">Select project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.projectCode} — {p.projectName}</option>
              ))}
            </Select>
            {projectId && (
              <PermissionGate module="PROFIT_CONFIG" action="create">
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setEditing('new')}>
                  New margin
                </Button>
              </PermissionGate>
            )}
          </div>
        }
      />

      <DataState
        loading={!!projectId && isLoading}
        error={error ? 'Failed to load.' : null}
        onRetry={refetch}
        empty={!!projectId && !isLoading && configs.length === 0}
        emptyMessage="No margin set for this project yet — until one is, nothing in it has a selling price."
      >
        <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  {['Applies at', 'Margin', 'Per', 'From', 'To', 'Governs', ''].map((c, i) => (
                    <th key={c || i} className={`px-3 py-2 text-xs font-semibold text-content-muted uppercase tracking-wide ${
                      i >= 1 && i <= 5 ? 'text-right' : 'text-left'}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {configs.map(c => (
                  <tr key={c.id} className="hover:bg-surface-muted/50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-content flex items-center gap-2">
                        {c.nodeName}
                        {!c.isActive && <Badge tone="neutral">Inactive</Badge>}
                      </div>
                      <div className="text-xs text-content-muted">{c.breadcrumb}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-content">
                      {c.profitPerUnit.toLocaleString('en-BD')}
                    </td>
                    <td className="px-3 py-2 text-right text-content-muted">
                      {c.projectUnitSymbol ?? c.projectUnitCode}
                    </td>
                    <td className="px-3 py-2 text-right text-content-muted">{c.effectiveFrom}</td>
                    <td className="px-3 py-2 text-right text-content-muted">{c.effectiveTo ?? 'open'}</td>
                    {/* Resolved, not counted by subtree: a nearer margin on a block shadows this
                        row, so a raw descendant count would overstate what it actually governs. */}
                    <td className="px-3 py-2 text-content-muted">
                      {c.appliesToCount} item{c.appliesToCount === 1 ? '' : 's'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <PermissionGate module="PROFIT_CONFIG" action="edit">
                          <button onClick={() => setEditing(c)}
                            className="p-1.5 text-content-muted hover:text-primary" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                        <PermissionGate module="PROFIT_CONFIG" action="delete">
                          <button onClick={() => remove(c)}
                            className="p-1.5 text-content-muted hover:text-danger" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>

      {editing && (
        <ConfigModal
          config={editing === 'new' ? null : editing}
          projectId={projectId}
          onClose={() => setEditing(null)}
          onSaved={() => { invalidate(); setEditing(null) }}
        />
      )}
    </div>
  )
}

function ConfigModal({ config, projectId, onClose, onSaved }: {
  config: ProfitConfig | null
  projectId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [scope, setScope] = useState<ScopeValue>(
    config ? { projectId, nodeId: String(config.nodeId) } : { ...EMPTY_SCOPE, projectId })
  const [unitId, setUnitId]   = useState(config ? String(config.projectUnitId) : '')
  const [perUnit, setPerUnit] = useState(config ? String(config.profitPerUnit) : '')
  const [from, setFrom]       = useState(config?.effectiveFrom ?? isoToday())
  const [to, setTo]           = useState(config?.effectiveTo ?? '')
  const [active, setActive]   = useState(config?.isActive ?? true)
  const [notes, setNotes]     = useState(config?.notes ?? '')
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  const { data: units = [] } = useApiData<ProjectUnit[]>({
    url: '/project-units', queryKey: ['project-units-list'],
  })

  const submit = async () => {
    setSaving(true); setErr('')
    const body = {
      nodeId: Number(scope.nodeId),
      projectUnitId: Number(unitId),
      profitPerUnit: Number(perUnit),
      effectiveFrom: from,
      effectiveTo: to || null,
      isActive: active,
      notes: notes.trim() || null,
    }
    try {
      if (config) await api.put(`/profit-configs/${config.id}`, body)
      else        await api.post('/profit-configs', body)
      onSaved()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const valid = !!scope.nodeId && !!unitId && perUnit !== '' && Number(perUnit) >= 0 && !!from

  return (
    <Modal open onClose={onClose} title={config ? 'Edit margin' : 'New margin'} size="md">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-content mb-1">Applies at</p>
          {/* Leaving the scope blank would mean the project root, which is the common case: one
              margin covering everything. Naming a block overrides it for that branch only. */}
          <ScopePicker value={scope} onChange={setScope} mode="form" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Per unit of measure" required>
            <Select value={unitId} onChange={e => setUnitId(e.target.value)}>
              <option value="">Select unit</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}{u.symbol ? ` (${u.symbol})` : ''}</option>
              ))}
            </Select>
          </Field>
          <Field label="Profit per unit" required>
            <Input type="number" step="0.0001" min={0} value={perUnit}
              onChange={e => setPerUnit(e.target.value)} placeholder="520" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Effective from" required>
            <DateField value={from} onChange={e => setFrom(e.target.value)} />
          </Field>
          <Field label="Effective to">
            <DateField value={to} onChange={e => setTo(e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-content-muted">
          Leave &quot;to&quot; blank to keep this margin open. To revise it, add a new row starting on
          the day the new rate applies — editing this one would restate prices that were already quoted.
        </p>

        <Field label="Notes">
          <Input value={notes} onChange={e => setNotes(e.target.value)} maxLength={500}
            placeholder="Why this rate" />
        </Field>

        <label className="flex items-center gap-2 text-sm text-content cursor-pointer">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Active
        </label>

        {err && <p className="text-xs text-danger">{err}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!valid}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}
