'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Pencil, X, Phone, Mail, Globe, Hash, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataState } from '@/components/ui/DataState'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'

const schema = z.object({
  name:      z.string().min(1, 'Required'),
  code:      z.string().min(1, 'Required'),
  address:   z.string().optional(),
  phone:     z.string().optional(),
  email:     z.string().optional(),
  website:   z.string().optional(),
  taxNumber: z.string().optional(),
})
type Form = z.infer<typeof schema>

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-900 font-medium mt-0.5">{value || '—'}</p>
      </div>
    </div>
  )
}

export function CompanyPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const { data: company, isLoading, error } = useApiData<any>({
    url: '/company', queryKey: ['company'],
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    values: company ?? {},
  })

  const onEdit = () => { reset(company); setEditing(true) }

  const onSubmit = async (data: Form) => {
    setSaving(true); setErr('')
    try {
      await api.put('/company', data)
      qc.invalidateQueries({ queryKey: ['company'] })
      setEditing(false); setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setErr(e.response?.data?.errors?.[0] ?? 'Failed to save')
    } finally { setSaving(false) }
  }

  const initials = company?.name
    ?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() ?? '??'

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Company Profile"
        subtitle="View and manage your company's registration details"
        action={
          !editing ? (
            <button onClick={onEdit}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit Profile
            </button>
          ) : undefined
        }
      />

      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          Company profile updated successfully.
        </div>
      )}

      <DataState loading={isLoading} error={error ? 'Failed to load company data.' : null}>
        {/* View mode */}
        {!editing && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold shrink-0 select-none">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{company?.name ?? 'Not set up yet'}</h2>
                <p className="text-blue-100 text-sm mt-0.5">Code: {company?.code ?? '—'}</p>
              </div>
            </div>
            <div className="px-6 py-2">
              <Field icon={MapPin} label="Address"          value={company?.address} />
              <Field icon={Phone}  label="Phone"            value={company?.phone} />
              <Field icon={Mail}   label="Email"            value={company?.email} />
              <Field icon={Globe}  label="Website"          value={company?.website} />
              <Field icon={Hash}   label="Tax / VAT Number" value={company?.taxNumber} />
            </div>
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">Edit Company Profile</p>
                <p className="text-xs text-gray-400">Changes save immediately to the database</p>
              </div>
              <button onClick={() => setEditing(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {err && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Company Name <span className="text-red-500">*</span></label>
                  <input {...register('name')} className={inp} placeholder="Skyline Real Estate Ltd." />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className={lbl}>Company Code <span className="text-red-500">*</span></label>
                  <input {...register('code')} className={inp} placeholder="SRL-001" />
                  {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
                </div>
              </div>
              <div>
                <label className={lbl}>Address</label>
                <textarea {...register('address')} className={inp} rows={2} placeholder="Full company address" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Phone</label>
                  <input {...register('phone')} className={inp} placeholder="+880-2-XXXXXXX" />
                </div>
                <div>
                  <label className={lbl}>Email</label>
                  <input type="email" {...register('email')} className={inp} placeholder="info@company.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Website</label>
                  <input {...register('website')} className={inp} placeholder="https://www.company.com" />
                </div>
                <div>
                  <label className={lbl}>Tax / VAT Number</label>
                  <input {...register('taxNumber')} className={inp} placeholder="VAT-BD-XXXXXXXXX" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </DataState>
    </div>
  )
}
