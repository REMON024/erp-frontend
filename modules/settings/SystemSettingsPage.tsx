'use client'
import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'

interface Setting { key: string; value: string }

const OPTIONS: Record<string, { label: string; help: string; choices: { value: string; label: string }[] }> = {
  'revenue.basis': {
    label: 'Revenue Recognition Basis',
    help: 'Cash: revenue recognised when collected. Invoice: revenue accrued at invoice issue (clears receivable on collection).',
    choices: [
      { value: 'cash', label: 'Cash (on collection)' },
      { value: 'invoice', label: 'Invoice (accrual)' },
    ],
  },
  'purchase.eplEnforcement': {
    label: 'Purchase EPL Enforcement',
    help: 'Warn: unmatched material purchases require a reason but proceed. Block: unmatched material purchases are rejected.',
    choices: [
      { value: 'warn', label: 'Warn (capture reason)' },
      { value: 'block', label: 'Block unmatched' },
    ],
  },
}

export function SystemSettingsPage() {
  const qc = useQueryClient()
  const { data = [], isLoading, error, refetch } = useApiData<Setting[]>({ url: '/settings', queryKey: ['settings'] })
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    setValues(Object.fromEntries(data.map((s) => [s.key, s.value])))
  }, [data])

  const save = async (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setSaving(key)
    try {
      await api.put('/settings', { key, value })
      qc.invalidateQueries({ queryKey: ['settings'] })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" subtitle="Cross-cutting policy controls" />
      <DataState loading={isLoading} error={error ? 'Failed to load settings.' : null} onRetry={refetch}>
        <div className="space-y-4 max-w-2xl">
          {Object.entries(OPTIONS).map(([key, cfg]) => (
            <div key={key} className="bg-surface rounded-xl border border-border-default p-5">
              <h3 className="font-semibold text-content text-sm">{cfg.label}</h3>
              <p className="text-xs text-content-muted mt-1">{cfg.help}</p>
              <div className="mt-3 flex gap-2">
                {cfg.choices.map((c) => {
                  const active = values[key] === c.value
                  return (
                    <button
                      key={c.value}
                      onClick={() => save(key, c.value)}
                      disabled={saving === key}
                      className={`px-4 py-2 rounded-lg text-sm border transition ${
                        active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-content border-border-default hover:border-blue-400'
                      } ${saving === key ? 'opacity-60' : ''}`}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </DataState>
    </div>
  )
}
