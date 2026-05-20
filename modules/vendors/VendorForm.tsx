'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const schema = z.object({
  company_name:    z.string().min(2, 'Company name required'),
  contact_person:  z.string().min(2, 'Contact person required'),
  email:           z.string().email('Valid email required'),
  phone:           z.string().min(8, 'Phone required'),
  address:         z.string().min(4, 'Address required'),
})
type FormValues = z.infer<typeof schema>

interface Props { onSuccess: () => void; onCancel: () => void }

const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function VendorForm({ onSuccess, onCancel }: Props) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (v: unknown) => api.post('/vendors', v).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); onSuccess() },
  })

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutateAsync(v as unknown))} className="space-y-4">
      <Field label="Company Name" error={errors.company_name?.message}>
        <input {...register('company_name')} placeholder="National Steel Suppliers" className={inputCls} />
      </Field>
      <Field label="Contact Person" error={errors.contact_person?.message}>
        <input {...register('contact_person')} placeholder="Kamal Ahmed" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" error={errors.email?.message}>
          <input type="email" {...register('email')} placeholder="kamal@nss.com" className={inputCls} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input {...register('phone')} placeholder="01711111111" className={inputCls} />
        </Field>
      </div>
      <Field label="Address" error={errors.address?.message}>
        <input {...register('address')} placeholder="Tejgaon, Dhaka" className={inputCls} />
      </Field>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : 'Register Vendor'}
        </button>
      </div>
    </form>
  )
}
