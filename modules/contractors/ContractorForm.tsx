'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const schema = z.object({
  company_name:   z.string().min(2, 'Required'),
  contact_person: z.string().min(2, 'Required'),
  email:          z.string().email('Valid email required'),
  phone:          z.string().min(8, 'Required'),
  address:        z.string().min(4, 'Required'),
})
type FormValues = z.infer<typeof schema>

const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function ContractorForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const mutation = useMutation({
    mutationFn: (v: unknown) => api.post('/contractors', v).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contractors'] }); onSuccess() },
  })
  return (
    <form onSubmit={handleSubmit((v) => mutation.mutateAsync(v as unknown))} className="space-y-4">
      {[
        { name: 'company_name', label: 'Company Name', placeholder: 'Babul Construction Co.' },
        { name: 'contact_person', label: 'Contact Person', placeholder: 'Babul Mia' },
        { name: 'phone', label: 'Phone', placeholder: '01811111111' },
        { name: 'address', label: 'Address', placeholder: 'Keraniganj, Dhaka' },
      ].map(({ name, label, placeholder }) => (
        <div key={name}>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
          <input {...register(name as keyof FormValues)} placeholder={placeholder} className={inputCls} />
          {errors[name as keyof FormValues] && <p className="mt-1 text-xs text-red-500">{errors[name as keyof FormValues]?.message}</p>}
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
        <input type="email" {...register('email')} placeholder="contact@contractor.com" className={inputCls} />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : 'Onboard'}
        </button>
      </div>
    </form>
  )
}
