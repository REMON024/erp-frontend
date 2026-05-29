'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Phone, MapPin, Building, Lock, CheckCircle } from 'lucide-react'

const profileSchema = z.object({
  name:     z.string().min(1, 'Required'),
  email:    z.string().email('Invalid email'),
  phone:    z.string().optional(),
  company:  z.string().optional(),
  role:     z.string().optional(),
  location: z.string().optional(),
})

const passwordSchema = z.object({
  current_password: z.string().min(6, 'Minimum 6 characters'),
  new_password:     z.string().min(6, 'Minimum 6 characters'),
  confirm_password: z.string().min(6, 'Minimum 6 characters'),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type ProfileForm   = z.infer<typeof profileSchema>
type PasswordForm  = z.infer<typeof passwordSchema>

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

export function SettingsPage() {
  const [saved, setSaved]         = useState(false)
  const [pwSaved, setPwSaved]     = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile')

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      name:     'Admin User',
      email:    'admin@constructionerp.com',
      phone:    '+91-98765-43210',
      company:  'Construction ERP Co.',
      role:     'Administrator',
      location: 'Mumbai, Maharashtra',
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema) as any,
  })

  function onProfileSave(data: ProfileForm) {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function onPasswordSave(data: PasswordForm) {
    passwordForm.reset()
    setPwSaved(true)
    setTimeout(() => setPwSaved(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Tab nav */}
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
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
              A
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">Admin User</p>
              <p className="text-sm text-gray-500">Administrator · admin@constructionerp.com</p>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 mb-4">Your Personal Information</h3>

          {saved && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-800 font-medium">Profile updated successfully</p>
            </div>
          )}

          <form onSubmit={profileForm.handleSubmit(onProfileSave)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input {...profileForm.register('name')} className={inp + ' pl-9'} />
                </div>
                {profileForm.formState.errors.name && <p className="text-xs text-red-600 mt-1">{profileForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className={lbl}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input type="email" {...profileForm.register('email')} className={inp + ' pl-9'} />
                </div>
                {profileForm.formState.errors.email && <p className="text-xs text-red-600 mt-1">{profileForm.formState.errors.email.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input {...profileForm.register('phone')} className={inp + ' pl-9'} placeholder="+91-98765-43210" />
                </div>
              </div>
              <div>
                <label className={lbl}>Company</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input {...profileForm.register('company')} className={inp + ' pl-9'} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Role</label>
                <input {...profileForm.register('role')} className={inp} placeholder="Administrator" />
              </div>
              <div>
                <label className={lbl}>Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input {...profileForm.register('location')} className={inp + ' pl-9'} placeholder="City, State" />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Save Changes
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

          {pwSaved && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-800 font-medium">Password changed successfully</p>
            </div>
          )}

          <form onSubmit={passwordForm.handleSubmit(onPasswordSave)} className="space-y-4">
            <div>
              <label className={lbl}>Current Password</label>
              <input type="password" {...passwordForm.register('current_password')} className={inp} placeholder="••••••••" />
              {passwordForm.formState.errors.current_password && <p className="text-xs text-red-600 mt-1">{passwordForm.formState.errors.current_password.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>New Password</label>
                <input type="password" {...passwordForm.register('new_password')} className={inp} placeholder="••••••••" />
                {passwordForm.formState.errors.new_password && <p className="text-xs text-red-600 mt-1">{passwordForm.formState.errors.new_password.message}</p>}
              </div>
              <div>
                <label className={lbl}>Confirm New Password</label>
                <input type="password" {...passwordForm.register('confirm_password')} className={inp} placeholder="••••••••" />
                {passwordForm.formState.errors.confirm_password && <p className="text-xs text-red-600 mt-1">{passwordForm.formState.errors.confirm_password.message}</p>}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Change Password
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
              { label: 'Budget Overrun Alerts',       desc: 'Notify when project costs exceed budget thresholds',   defaultOn: true },
              { label: 'Material Request Approvals',  desc: 'Notify when material requests need your approval',     defaultOn: true },
              { label: 'Safety Incidents',             desc: 'Immediate alerts for new safety incidents reported',   defaultOn: true },
              { label: 'Project Milestone Updates',   desc: 'Updates when project milestones are completed',        defaultOn: false },
              { label: 'Vendor Invoice Due Dates',    desc: 'Reminders for upcoming vendor invoice due dates',      defaultOn: true },
              { label: 'Certification Expiry',        desc: 'Alerts when vendor certifications are about to expire',defaultOn: true },
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
          <div className="flex justify-end pt-4">
            <button className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
