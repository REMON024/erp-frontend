'use client'
import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApiData } from '@/hooks/useApiData'
import { Paperclip, Download, Trash2, Upload, FileText } from 'lucide-react'
import api from '@/lib/api'

/**
 * Files kept against one record — an approval letter on a project, a delivery challan on a
 * receipt, a cheque image on a payment.
 *
 * Lives beside the pickers rather than in components/ui because it fetches; components/ui is for
 * dumb primitives.
 *
 * There is no attachment permission of its own: the API resolves the governing menu from
 * `entityType`, so this panel is exactly as restricted as the record it sits on. A 403 therefore
 * means "you may not see this record's files", which is why it renders as an empty panel rather
 * than an error.
 */

/** Must match AttachmentEntityTypes on the server — anything else is rejected there. */
export type AttachmentEntityType =
  | 'Project' | 'PurchaseOrder' | 'WorkOrder' | 'WorkOrderBill' | 'CostEstimate'
  | 'Voucher' | 'Booking' | 'Payment' | 'StockTransaction'

interface Attachment {
  id: number
  fileName: string
  contentType: string
  sizeBytes: number
  description?: string | null
  uploadedBy?: string | null
  uploadedAt: string
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentPanel({ entityType, entityId, readOnly, className }: {
  entityType: AttachmentEntityType
  /** Omitted or 0 while the parent record is still unsaved — the panel disables itself. */
  entityId?: number
  readOnly?: boolean
  className?: string
}) {
  const qc = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const enabled = !!entityId
  const queryKey = ['attachments', entityType, String(entityId ?? 0)]

  const { data: files = [] } = useApiData<Attachment[]>({
    url: '/attachments',
    params: { entityType, entityId },
    queryKey,
    enabled,
  })

  const refresh = () => qc.invalidateQueries({ queryKey })

  const upload = async (file: File) => {
    setBusy(true); setErr('')
    try {
      // multipart, so the browser sets its own boundary — do not set Content-Type by hand.
      const form = new FormData()
      form.append('entityType', entityType)
      form.append('entityId', String(entityId))
      form.append('file', file)
      await api.post('/attachments', form)
      refresh()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Upload failed')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const download = async (f: Attachment) => {
    setErr('')
    try {
      // Downloads go through the authorized API, not a static URL, so the bytes arrive as a blob
      // that has to be handed to the browser deliberately.
      const res = await api.get(`/attachments/${f.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = f.fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setErr(`Could not download ${f.fileName}.`)
    }
  }

  const remove = async (f: Attachment) => {
    setErr('')
    try {
      await api.delete(`/attachments/${f.id}`)
      refresh()
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Delete failed')
    }
  }

  return (
    <div className={`rounded-lg border border-border-default p-3 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-content-muted uppercase tracking-wide flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> Attachments
          {files.length > 0 && <span className="normal-case font-normal">({files.length})</span>}
        </p>
        {!readOnly && (
          <>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              disabled={!enabled || busy}
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }}
            />
            <button
              type="button"
              disabled={!enabled || busy}
              onClick={() => fileInput.current?.click()}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
            >
              <Upload className="w-3.5 h-3.5" /> {busy ? 'Uploading…' : 'Upload'}
            </button>
          </>
        )}
      </div>

      {err && <p className="text-xs text-danger mb-2">{err}</p>}

      {!enabled ? (
        <p className="text-xs text-content-muted">Save this record first, then attach files to it.</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-content-muted">No files yet.</p>
      ) : (
        <ul className="divide-y divide-border-default">
          {files.map(f => (
            <li key={f.id} className="flex items-center gap-2 py-1.5">
              <FileText className="w-3.5 h-3.5 text-content-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-content truncate" title={f.fileName}>{f.fileName}</p>
                <p className="text-[11px] text-content-muted">
                  {fmtSize(f.sizeBytes)} · {f.uploadedAt}{f.uploadedBy ? ` · ${f.uploadedBy}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => download(f)} title="Download"
                className="p-1 text-content-muted hover:text-primary hover:bg-primary/10 rounded transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
              {!readOnly && (
                <button type="button" onClick={() => remove(f)} title="Delete"
                  className="p-1 text-content-muted hover:text-danger hover:bg-danger/10 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
