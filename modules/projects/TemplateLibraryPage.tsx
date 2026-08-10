'use client'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Trash2, Pencil, LayoutTemplate } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { Modal } from '@/components/ui/Modal'
import { Input, Field } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PermissionGate } from '@/components/ui/PermissionGate'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'
import type { ProjectNode } from './ProjectStructurePage'

/**
 * The template library.
 *
 * Templates could be saved and applied but never seen: there was no screen that listed them, so a
 * layout saved with a typo, or one saved twice, stayed in the library forever with no way to
 * inspect, rename or remove it. Everything here reads through endpoints that already existed —
 * only the delete is new, because the node delete refuses anything with children.
 */

interface TreeNode { node: ProjectNode; children: TreeNode[] }

/** Nests the flat node list. Templates are small, so the whole library is fetched at once. */
function buildTrees(nodes: ProjectNode[]): TreeNode[] {
  const byParent = new Map<number | null, ProjectNode[]>()
  for (const n of nodes) {
    const key = n.parentId
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(n)
  }
  const build = (parentId: number | null): TreeNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map(node => ({ node, children: build(node.id) }))
  return build(null)
}

function TreeRow({ item, depth }: { item: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1)
  const hasKids = item.children.length > 0

  return (
    <>
      <div className="flex items-center gap-1 py-1 text-sm" style={{ paddingLeft: `${depth * 16}px` }}>
        {hasKids ? (
          <button type="button" onClick={() => setOpen(o => !o)} className="text-content-muted hover:text-content">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : <span className="w-3.5" />}
        <span className="text-content">{item.node.unitNo ?? item.node.name}</span>
        <span className="text-xs text-content-muted">{item.node.levelName}</span>
        {item.node.isSellable && !item.node.isSellableInherited && (
          <Badge tone="success">Sellable</Badge>
        )}
      </div>
      {open && item.children.map(c => <TreeRow key={c.node.id} item={c} depth={depth + 1} />)}
    </>
  )
}

export function TemplateLibraryPage() {
  const qc = useQueryClient()
  const [renaming, setRenaming] = useState<ProjectNode | null>(null)

  const { data: nodes = [], isLoading, error, refetch } = useApiData<ProjectNode[]>({
    url: '/project-nodes',
    params: { templates: true },
    queryKey: ['project-nodes', 'templates'],
  })

  const trees = useMemo(() => buildTrees(nodes), [nodes])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project-nodes'] })

  const remove = async (template: ProjectNode) => {
    const count = nodes.filter(n => n.path.startsWith(template.path)).length
    if (!window.confirm(
      `Delete the template "${template.name}" and all ${count} node${count === 1 ? '' : 's'} in it?\n\n`
      + 'Projects already created from it are unaffected — applying a template copies it.'
    )) return
    try {
      await api.delete(`/project-nodes/templates/${template.id}`)
      invalidate()
    } catch (e: any) {
      window.alert(e.response?.data?.errors?.[0] ?? 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Template Library"
        subtitle="Saved structures you can apply to a new project. Save one from any node on the Structure page."
      />

      <DataState
        loading={isLoading}
        error={error ? 'Failed to load templates.' : null}
        onRetry={refetch}
        empty={!isLoading && trees.length === 0}
        emptyMessage="No templates yet. Open a project's structure, pick a block or the project itself, and choose Save as template."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trees.map(t => (
            <div key={t.node.id} className="rounded-xl border border-border-default bg-surface p-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-border-default">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-content truncate">{t.node.name}</h3>
                  </div>
                  <p className="text-xs text-content-muted mt-0.5">
                    {t.node.levelName} · {nodes.filter(n => n.path.startsWith(t.node.path)).length} nodes
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <PermissionGate module="PROJECT_STRUCTURE" action="edit">
                    <button onClick={() => setRenaming(t.node)} title="Rename"
                      className="p-1.5 text-content-muted hover:text-primary">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate module="PROJECT_STRUCTURE" action="delete">
                    <button onClick={() => remove(t.node)} title="Delete"
                      className="p-1.5 text-content-muted hover:text-danger">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
              <div className="pt-2 max-h-64 overflow-y-auto">
                {t.children.map(c => <TreeRow key={c.node.id} item={c} depth={0} />)}
                {t.children.length === 0 && (
                  <p className="text-xs text-content-muted py-2">This template has nothing beneath its root.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </DataState>

      {renaming && (
        <RenameTemplateModal
          template={renaming}
          onClose={() => setRenaming(null)}
          onSaved={() => { invalidate(); setRenaming(null) }}
        />
      )}
    </div>
  )
}

function RenameTemplateModal({ template, onClose, onSaved }: {
  template: ProjectNode; onClose: () => void; onSaved: () => void
}) {
  const [name, setName] = useState(template.name)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setSaving(true); setErr('')
    try {
      // The node update endpoint, unchanged — a template is an ordinary node, which is the whole
      // reason this screen needed almost no new backend.
      await api.put(`/project-nodes/${template.id}`, {
        name: name.trim(),
        levelId: template.levelId,
        code: template.code,
        sortOrder: template.sortOrder,
        projectUnitId: template.projectUnitId,
        quantity: template.quantity,
        areaSqFt: template.areaSqFt,
        commonAreaSqFt: template.commonAreaSqFt,
        serviceAreaSqFt: template.serviceAreaSqFt,
        unitNo: template.unitNo,
        unitType: template.unitType,
        facing: template.facing,
        status: template.status,
      })
      onSaved()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Rename template" size="sm">
      <div className="space-y-4">
        <Field label="Template name" required>
          <Input value={name} onChange={e => setName(e.target.value)} maxLength={120} autoFocus />
        </Field>
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!name.trim() || name === template.name}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}
