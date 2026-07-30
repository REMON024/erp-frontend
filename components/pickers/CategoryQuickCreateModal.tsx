'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input, Field } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'
import type { ResourceCategory } from './CategorySelect'

const TYPES = ['Material', 'Equipment', 'Service', 'Labour']

/**
 * Creates a category without leaving the form that needed it. Deliberately minimal — code and
 * sort order are left to the full admin page at Inventory ▸ Resource Categories; a blank code is
 * derived from the name server-side.
 */
export function CategoryQuickCreateModal({ defaultResourceType, onClose, onCreated }: {
  defaultResourceType?: string
  onClose: () => void
  onCreated: (category: ResourceCategory) => void
}) {
  const qc = useQueryClient()
  const [name, setName]     = useState('')
  const [type, setType]     = useState(defaultResourceType ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()   // never let this bubble into the form that hosts the modal

    const trimmed = name.trim()
    if (!trimmed) { setErr('Category name is required.'); return }

    setSaving(true); setErr('')
    try {
      // POST returns just the new id, so build the object locally rather than refetching.
      const res = await api.post<number>('/resource-categories',
        { name: trimmed, resourceType: type || null })
      const id = (res.data as any)?.data ?? res.data

      qc.invalidateQueries({ queryKey: ['resource-categories'] })
      onCreated({
        id: Number(id), code: '', name: trimmed, resourceType: type || null,
        isActive: true, sortOrder: 0, resourceCount: 0,
      })
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Could not create category.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="New Category" size="sm">
      <form onSubmit={submit} className="space-y-4">
        {err && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>}

        <Field label="Name" required>
          <Input value={name} onChange={e => setName(e.target.value)} autoFocus
            placeholder="Formwork" maxLength={100} />
        </Field>

        <Field label="Applies to">
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="">All types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add Category</Button>
        </div>
      </form>
    </Modal>
  )
}
