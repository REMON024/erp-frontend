'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Project } from '@/types'
import api from '@/lib/api'
import { MOCK_USERS } from '@/mocks/fixtures/users'

const schema = z.object({
  name:        z.string().min(2, 'Project name required'),
  code:        z.string().min(2, 'Project code required'),
  client_name: z.string().min(2, 'Client name required'),
  location:    z.string().min(2, 'Location required'),
  start_date:  z.string().min(1, 'Start date required'),
  end_date:    z.string().min(1, 'End date required'),
  budget:      z.coerce.number().positive('Budget must be positive'),
  manager_id:  z.string().min(1, 'Select a manager'),
})
type FormValues = z.infer<typeof schema>

interface Props {
  project?: Project
  onSuccess: () => void
  onCancel: () => void
}

const managers = MOCK_USERS.filter((u) => ['super_admin', 'company_admin', 'project_manager'].includes(u.role))

export function ProjectForm({ project, onSuccess, onCancel }: Props) {
  const qc = useQueryClient()
  const isEdit = !!project

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: project
      ? { name: project.name, code: project.code, client_name: project.client_name, location: project.location, start_date: project.start_date, end_date: project.end_date, budget: project.budget, manager_id: project.manager_id }
      : { manager_id: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: unknown) =>
      isEdit
        ? api.put(`/projects/${project!.id}`, values as FormValues).then((r) => r.data)
        : api.post('/projects', values as FormValues).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      if (isEdit) qc.invalidateQueries({ queryKey: ['project', project!.id] })
      onSuccess()
    },
  })

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )

  const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutateAsync(v as unknown))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Project Name" error={errors.name?.message}>
          <input {...register('name')} placeholder="Skyline Tower" className={inputCls} />
        </Field>
        <Field label="Project Code" error={errors.code?.message}>
          <input {...register('code')} placeholder="SKY-001" className={inputCls} />
        </Field>
      </div>

      <Field label="Client Name" error={errors.client_name?.message}>
        <input {...register('client_name')} placeholder="ABC Development Ltd" className={inputCls} />
      </Field>

      <Field label="Location" error={errors.location?.message}>
        <input {...register('location')} placeholder="Gulshan, Dhaka" className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date" error={errors.start_date?.message}>
          <input type="date" {...register('start_date')} className={inputCls} />
        </Field>
        <Field label="End Date" error={errors.end_date?.message}>
          <input type="date" {...register('end_date')} className={inputCls} />
        </Field>
      </div>

      <Field label="Budget (BDT)" error={errors.budget?.message}>
        <input type="number" {...register('budget')} placeholder="50000000" className={inputCls} />
      </Field>

      <Field label="Project Manager" error={errors.manager_id?.message}>
        <select {...register('manager_id')} className={inputCls}>
          <option value="">Select manager...</option>
          {managers.map((u) => (
            <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role.replace(/_/g, ' ')})</option>
          ))}
        </select>
      </Field>

      {mutation.isError && (
        <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting || mutation.isPending}
          className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </form>
  )
}
