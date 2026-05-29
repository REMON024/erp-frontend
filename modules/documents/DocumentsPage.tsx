'use client'
import { useEffect, useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, RefreshCw, AlertCircle, Upload, Trash2, FileText, Download } from 'lucide-react'
import api from '@/lib/api'
import type { Document } from '@/types'

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const MODULES = ['general', 'projects', 'procurement', 'safety', 'finance', 'contracts', 'compliance']

function fmtSize(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const uploadSchema = z.object({
  file_name:    z.string().min(1, 'Required'),
  module_name:  z.string().min(1, 'Required'),
  reference_id: z.string().optional(),
  file_type:    z.string().optional(),
})
type UploadForm = z.infer<typeof uploadSchema>

function UploadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema) as any,
    defaultValues: { module_name: 'general', file_type: 'application/pdf' },
  })
  const onSubmit = async (d: UploadForm) => {
    setSaving(true); setErr('')
    try {
      await api.post('/documents/upload', { ...d, uploaded_by: 'u2', file_size: 102400 })
      onSaved(); onClose()
    }
    catch (e: any) { setErr(e.response?.data?.message ?? 'Failed to upload') }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title="Upload Document" size="sm">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
        <div>
          <label className={lbl}>File Name</label>
          <input {...register('file_name')} className={inp} placeholder="report-q4-2025.pdf" />
          {errors.file_name && <p className="text-xs text-red-600 mt-1">{errors.file_name.message}</p>}
        </div>
        <div>
          <label className={lbl}>Module</label>
          <select {...register('module_name')} className={inp}>
            {MODULES.map(m => <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Reference ID (optional)</label>
          <input {...register('reference_id')} className={inp} placeholder="p1 / pr1 / …" />
        </div>
        <div>
          <label className={lbl}>File Type</label>
          <select {...register('file_type')} className={inp}>
            <option value="application/pdf">PDF</option>
            <option value="image/jpeg">JPEG Image</option>
            <option value="image/png">PNG Image</option>
            <option value="application/vnd.ms-excel">Excel</option>
            <option value="application/msword">Word</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60 flex items-center gap-2">
            <Upload className="w-4 h-4" />{saving ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function fileIcon(type?: string) {
  const t = type ?? ''
  if (t.includes('pdf'))   return '📄'
  if (t.includes('image')) return '🖼️'
  if (t.includes('excel') || t.includes('sheet')) return '📊'
  if (t.includes('word'))  return '📝'
  return '📁'
}

export function DocumentsPage() {
  const [docs,     setDocs]     = useState<Document[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')
  const [module,   setModule]   = useState('')
  const [showAdd,  setShowAdd]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get('/documents', { params: { module_name: module || undefined, search: search || undefined } })
      setDocs(res.data.data ?? res.data)
    } catch { setError('Failed to load documents.') }
    finally { setLoading(false) }
  }, [search, module])

  useEffect(() => { load() }, [load])

  const remove = async (id: string) => {
    if (!confirm('Delete this document?')) return
    try { await api.delete(`/documents/${id}`); setDocs(prev => prev.filter(d => d.id !== id)) }
    catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Project files, contracts and reports</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {MODULES.slice(0, 4).map(m => (
          <div key={m} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 capitalize">{m}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{docs.filter(d => d.module_name === m).length}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search file name…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <select value={module} onChange={e => setModule(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No documents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{fileIcon(doc.file_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{doc.module_name}</p>
                  {doc.reference_id && <p className="text-xs text-gray-400 font-mono">Ref: {doc.reference_id}</p>}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">{fmtSize(doc.file_size)}</p>
                  <p className="text-xs text-gray-400">{doc.uploaded_at?.slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.file_url && doc.file_url !== '#' && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => remove(doc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {doc.version && doc.version > 1 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">v{doc.version}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && <UploadModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  )
}
