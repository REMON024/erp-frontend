'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Phone, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  phone:     z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Minimum 6 characters'),
  newPassword:     z.string().min(6, 'Minimum 6 characters'),
  confirmPassword: z.string().min(6, 'Minimum 6 characters'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ProfileForm  = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

export function SettingsPage() {
  const { user, setAuth, token } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile')
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwMsg,      setPwMsg]      = useState<{ ok: boolean; text: string } | null>(null)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      phone:     user?.phoneNumber ?? '',
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema) as any,
  })

  const onProfileSave = async (data: ProfileForm) => {
    setProfileMsg(null)
    try {
      const res = await api.put(`/users/${user?.id}`, {
        firstName:   data.firstName,
        lastName:    data.lastName,
        phoneNumber: data.phone || undefined,
      })
      // Refresh auth store with updated user data
      if (user && token) {
        setAuth({ ...user, firstName: data.firstName, lastName: data.lastName, fullName: `${data.firstName} ${data.lastName}`, phoneNumber: data.phone || null }, token)
      }
      setProfileMsg({ ok: true, text: 'Profile updated successfully' })
    } catch (e: any) {
      setProfileMsg({ ok: false, text: e.response?.data?.errors?.[0] ?? 'Failed to update profile' })
    }
  }

  const onPasswordSave = async (data: PasswordForm) => {
    setPwMsg(null)
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      })
      passwordForm.reset()
      setPwMsg({ ok: true, text: 'Password changed successfully' })
    } catch (e: any) {
      setPwMsg({ ok: false, text: e.response?.data?.errors?.[0] ?? 'Failed to change password' })
    }
  }

  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : 'U'

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {([
          { key: 'profile',       label: 'Profile Details' },
          { key: 'password',      label: 'Change Password' },
          { key: 'notifications', label: 'Notifications' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold select-none">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{user?.fullName}</p>
              <p className="text-sm text-gray-500">{user?.role?.replace(/_/g, ' ')} · {user?.email}</p>
            </div>
          </div>

          {profileMsg && (
            <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border ${profileMsg.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {profileMsg.ok ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <p className="text-sm font-medium">{profileMsg.text}</p>
            </div>
          )}

          <form onSubmit={profileForm.handleSubmit(onProfileSave as any)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>First Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input {...profileForm.register('firstName')} className={inp + ' pl-9'} />
                </div>
                {profileForm.formState.errors.firstName && <p className="text-xs text-red-600 mt-1">{profileForm.formState.errors.firstName.message}</p>}
              </div>
              <div>
                <label className={lbl}>Last Name <span className="text-red-500">*</span></label>
                <input {...profileForm.register('lastName')} className={inp} />
                {profileForm.formState.errors.lastName && <p className="text-xs text-red-600 mt-1">{profileForm.formState.errors.lastName.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Email Address</label>
                <input value={user?.email ?? ''} disabled className={inp + ' bg-gray-50 text-gray-400 cursor-not-allowed'} />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className={lbl}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input {...profileForm.register('phone')} className={inp + ' pl-9'} placeholder="+880-…" />
                </div>
              </div>
            </div>
            <div>
              <label className={lbl}>Role</label>
              <input value={user?.role?.replace(/_/g, ' ') ?? ''} disabled className={inp + ' bg-gray-50 text-gray-400 cursor-not-allowed'} />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={profileForm.formState.isSubmitting}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
                {profileForm.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Change Password
          </h3>
          <p className="text-sm text-gray-500 mb-6">Ensure your account uses a strong and secure password</p>

          {pwMsg && (
            <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border ${pwMsg.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {pwMsg.ok ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <p className="text-sm font-medium">{pwMsg.text}</p>
            </div>
          )}

          <form onSubmit={passwordForm.handleSubmit(onPasswordSave as any)} className="space-y-4">
            <div>
              <label className={lbl}>Current Password <span className="text-red-500">*</span></label>
              <input type="password" {...passwordForm.register('currentPassword')} className={inp} placeholder="••••••••" />
              {passwordForm.formState.errors.currentPassword && <p className="text-xs text-red-600 mt-1">{passwordForm.formState.errors.currentPassword.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>New Password <span className="text-red-500">*</span></label>
                <input type="password" {...passwordForm.register('newPassword')} className={inp} placeholder="••••••••" />
                {passwordForm.formState.errors.newPassword && <p className="text-xs text-red-600 mt-1">{passwordForm.formState.errors.newPassword.message}</p>}
              </div>
              <div>
                <label className={lbl}>Confirm New Password <span className="text-red-500">*</span></label>
                <input type="password" {...passwordForm.register('confirmPassword')} className={inp} placeholder="••••••••" />
                {passwordForm.formState.errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={passwordForm.formState.isSubmitting}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
                {passwordForm.formState.isSubmitting ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Notification Preferences</h3>
          <p className="text-sm text-gray-500 mb-6">Choose what notifications you receive</p>
          <div className="space-y-4">
            {[
              { label: 'Budget Overrun Alerts',       desc: 'Notify when project costs exceed budget thresholds',    defaultOn: true },
              { label: 'Material Request Approvals',  desc: 'Notify when material requests need your approval',      defaultOn: true },
              { label: 'Safety Incidents',            desc: 'Immediate alerts for new safety incidents reported',    defaultOn: true },
              { label: 'Project Milestone Updates',   desc: 'Updates when project milestones are completed',         defaultOn: false },
              { label: 'Vendor Invoice Due Dates',    desc: 'Reminders for upcoming vendor invoice due dates',       defaultOn: true },
              { label: 'Certification Expiry',        desc: 'Alerts when vendor certifications are about to expire', defaultOn: true },
            ].map(n => (
              <div key={n.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{n.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked={n.defaultOn} />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
