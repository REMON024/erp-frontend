'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Document } from '@/types'
import { formatDate } from '@/utils/format'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const MODULES = ['projects', 'compliance', 'safety', 'finance', 'vendors', 'contractors', 'equipment']
const FILE_TYPE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/octet-stream': '📐',
  'image/png': '🖼️',
  'image/jpeg': '🖼️',
}

function fileIcon(type?: string) { return FILE_TYPE_ICONS[type ?? ''] ?? '📎' }

function formatFileSize(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const uploadSchema = z.object({
  module_name:  z.string().min(1, 'Required'),
  reference_id: z.string().min(1, 'Required'),
  file_name:    z.string().min(1, 'Required'),
  file_type:    z.string().optional(),
  notes:        z.string().optional(),
})
type UploadForm = z.infer<typeof uploadSchema>

function UploadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema) as any,
    defaultValues: { file_type: 'application/pdf' },
  })
  const mutation = useMutation({
    mutationFn: (d: unknown) => api.post('/documents/upload', d).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); onClose() },
  })
  return (
    <Modal open onClose={onClose} title="Upload Document" size="md">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select {...register('module_name')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select module</option>
              {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {errors.module_name && <p className="text-xs text-red-600 mt-1">{errors.module_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID</label>
            <input {...register('reference_id')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="p1, v1, eq3…" />
            {errors.reference_id && <p className="text-xs text-red-600 mt-1">{errors.reference_id.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
          <input {...register('file_name')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="document_name.pdf" />
          {errors.file_name && <p className="text-xs text-red-600 mt-1">{errors.file_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
          <select {...register('file_type')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="application/pdf">PDF</option>
            <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel</option>
            <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word</option>
            <option value="application/octet-stream">CAD/DWG</option>
            <option value="image/png">Image (PNG)</option>
            <option value="image/jpeg">Image (JPG)</option>
          </select>
        </div>

        {/* Mock file picker */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
          <p className="text-2xl mb-2">📁</p>
          <p className="text-sm text-gray-500">Mock upload — file name registered above</p>
          <p className="text-xs text-gray-400 mt-1">Real upload will connect to S3/Azure in Phase 2</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
            {mutation.isPending ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function VersionDrawer({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const { data: versions } = useQuery<Document[]>({
    queryKey: ['doc-versions', doc.id],
    queryFn: () => api.get(`/documents/${doc.id}/versions`).then((r) => r.data),
  })
  return (
    <Drawer open onClose={onClose} title={`Version History — ${doc.file_name}`}>
      <div className="divide-y divide-gray-100">
        {(versions ?? []).map((v, idx) => (
          <div key={v.id} className="px-4 py-4 flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">
              v{v.version ?? idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{v.file_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Uploaded {formatDate(v.uploaded_at)} · {formatFileSize(v.file_size)}</p>
            </div>
            <button className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0">Download</button>
          </div>
        ))}
        {!versions?.length && <p className="px-4 py-8 text-center text-gray-400 text-sm">No version history available</p>}
      </div>
    </Drawer>
  )
}

export function DocumentsPage() {
  const qc = useQueryClient()
  const [moduleFilter, setModuleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [viewVersions, setViewVersions] = useState<Document | null>(null)

  const { data } = useQuery({
    queryKey: ['documents', moduleFilter, search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (moduleFilter) p.set('module_name', moduleFilter)
      if (search) p.set('search', search)
      return api.get(`/documents?${p}`).then((r) => r.data)
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const documents: Document[] = data?.data ?? []

  // Group by module for summary
  const moduleCounts: Record<string, number> = {}
  documents.forEach((d) => { moduleCounts[d.module_name] = (moduleCounts[d.module_name] ?? 0) + 1 })

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Project files, permits, certificates, and reports</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium self-start sm:self-auto">
          + Upload Document
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Files',    value: documents.length,                                         color: 'text-blue-600' },
          { label: 'Projects',       value: moduleCounts['projects'] ?? 0,                            color: 'text-purple-600' },
          { label: 'Compliance',     value: (moduleCounts['compliance'] ?? 0) + (moduleCounts['safety'] ?? 0), color: 'text-amber-600' },
          { label: 'Finance',        value: moduleCounts['finance'] ?? 0,                             color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search file name..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setModuleFilter('')}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium ${moduleFilter === '' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            All
          </button>
          {MODULES.map((m) => (
            <button key={m} onClick={() => setModuleFilter(m)}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium capitalize ${moduleFilter === m ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Document grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow group">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
                {fileIcon(doc.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate" title={doc.file_name}>{doc.file_name}</p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{doc.module_name} · {doc.reference_id}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatFileSize(doc.file_size)}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{formatDate(doc.uploaded_at)}</p>
                {doc.version && doc.version > 1 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">v{doc.version}</span>
                )}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setViewVersions(doc)} className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg hover:bg-gray-50">History</button>
                <button className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Download</button>
                <button onClick={() => del.mutate(doc.id)} className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">×</button>
              </div>
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📁</p>
            <p>No documents found</p>
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {viewVersions && <VersionDrawer doc={viewVersions} onClose={() => setViewVersions(null)} />}
    </div>
  )
}
