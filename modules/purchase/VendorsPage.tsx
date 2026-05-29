'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Phone, Mail, Building2 } from 'lucide-react'

type VendorCategory = 'materials' | 'contractor' | 'services' | 'other'

export interface Vendor {
  id: string; name: string; contact_person: string; phone: string; email: string
  address: string; category: VendorCategory; trade_license: string
  bank_name: string; bank_account: string; status: 'active' | 'inactive'
}

export const VENDORS: Vendor[] = [
  { id: 'v1', name: 'Dhaka Building Materials Ltd.',    contact_person: 'Mr. Hasan',    phone: '+880-191-1111111', email: 'sales@dhakabm.bd',      address: 'Tejgaon, Dhaka',      category: 'materials',   trade_license: 'TL-2021-4512', bank_name: 'Dutch-Bangla Bank', bank_account: '12345678901', status: 'active' },
  { id: 'v2', name: 'National Steel & Iron Co.',        contact_person: 'Mr. Rahim',    phone: '+880-192-2222222', email: 'info@nationalsteel.bd',  address: 'Mugda, Dhaka',        category: 'materials',   trade_license: 'TL-2019-3312', bank_name: 'Islami Bank',       bank_account: '98765432101', status: 'active' },
  { id: 'v3', name: 'Premier Electrical Supplies',      contact_person: 'Mr. Sohel',    phone: '+880-193-3333333', email: 'sohel@premier-elec.bd',  address: 'Banasree, Dhaka',     category: 'materials',   trade_license: 'TL-2020-5678', bank_name: 'BRAC Bank',         bank_account: '11122233344', status: 'active' },
  { id: 'v4', name: 'Al-Amin Plumbing Works',           contact_person: 'Mr. Al-Amin',  phone: '+880-194-4444444', email: 'alamin@plumbing.bd',     address: 'Jatrabari, Dhaka',    category: 'contractor',  trade_license: 'TL-2022-7890', bank_name: 'Sonali Bank',       bank_account: '55566677788', status: 'active' },
  { id: 'v5', name: 'Structural Construction Co.',      contact_person: 'Eng. Nasim',   phone: '+880-195-5555555', email: 'nasim@structural.bd',    address: 'Gulshan, Dhaka',      category: 'contractor',  trade_license: 'TL-2018-2233', bank_name: 'Eastern Bank',      bank_account: '99988877766', status: 'active' },
  { id: 'v6', name: 'BD Tile & Sanitary House',         contact_person: 'Mr. Rubel',    phone: '+880-196-6666666', email: 'rubel@bdtile.bd',        address: 'Mirpur, Dhaka',       category: 'materials',   trade_license: 'TL-2023-1199', bank_name: 'Mercantile Bank',   bank_account: '33344455566', status: 'active' },
  { id: 'v7', name: 'Apex Transport Services',          contact_person: 'Mr. Jalal',    phone: '+880-197-7777777', email: 'jalal@apextransport.bd', address: 'Demra, Dhaka',        category: 'services',    trade_license: 'TL-2020-6677', bank_name: 'Pubali Bank',       bank_account: '77788899900', status: 'active' },
  { id: 'v8', name: 'Greenfield Landscaping',           contact_person: 'Ms. Shirin',   phone: '+880-198-8888888', email: 'shirin@greenfield.bd',   address: 'Uttara, Dhaka',       category: 'services',    trade_license: 'TL-2021-9988', bank_name: 'City Bank',         bank_account: '44455566677', status: 'inactive' },
]

const CATEGORY_COLORS: Record<VendorCategory, string> = {
  materials:  'bg-blue-100 text-blue-700',
  contractor: 'bg-orange-100 text-orange-700',
  services:   'bg-green-100 text-green-700',
  other:      'bg-gray-100 text-gray-600',
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

const schema = z.object({
  name:           z.string().min(1, 'Required'),
  contact_person: z.string().min(1, 'Required'),
  phone:          z.string().min(1, 'Required'),
  email:          z.string().email('Invalid email'),
  address:        z.string().optional(),
  category:       z.enum(['materials', 'contractor', 'services', 'other']),
  trade_license:  z.string().optional(),
  bank_name:      z.string().optional(),
  bank_account:   z.string().optional(),
})
type Form = z.infer<typeof schema>

function AddVendorModal({ onClose, onAdd }: { onClose: () => void; onAdd: (v: Vendor) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { category: 'materials' },
  })
  return (
    <Modal open onClose={onClose} title="Add Vendor / Supplier" size="md">
      <form onSubmit={handleSubmit(d => {
        onAdd({
          id: `v${Date.now()}`,
          name: d.name,
          contact_person: d.contact_person,
          phone: d.phone,
          email: d.email,
          address: d.address ?? '',
          category: d.category,
          trade_license: d.trade_license ?? '',
          bank_name: d.bank_name ?? '',
          bank_account: d.bank_account ?? '',
          status: 'active',
        })
        onClose()
      })} className="space-y-4 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Company / Vendor Name</label>
            <input {...register('name')} className={inp} placeholder="Vendor Company Name" />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Contact Person</label>
            <input {...register('contact_person')} className={inp} placeholder="Mr. Contact Name" />
            {errors.contact_person && <p className="text-xs text-red-600 mt-1">{errors.contact_person.message}</p>}
          </div>
          <div>
            <label className={lbl}>Category</label>
            <select {...register('category')} className={inp}>
              <option value="materials">Materials Supplier</option>
              <option value="contractor">Contractor</option>
              <option value="services">Services</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Phone</label>
            <input {...register('phone')} className={inp} placeholder="+880-191-0000000" />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register('email')} className={inp} placeholder="vendor@company.bd" />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
        </div>
        <div>
          <label className={lbl}>Address</label>
          <input {...register('address')} className={inp} placeholder="Area, Dhaka" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Trade License No.</label>
            <input {...register('trade_license')} className={inp} placeholder="TL-YYYY-XXXX" />
          </div>
          <div>
            <label className={lbl}>Bank Name</label>
            <input {...register('bank_name')} className={inp} placeholder="Bank name" />
          </div>
        </div>
        <div>
          <label className={lbl}>Bank Account No.</label>
          <input {...register('bank_account')} className={inp} placeholder="Account number" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add Vendor</button>
        </div>
      </form>
    </Modal>
  )
}

export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>(VENDORS)
  const [showAdd, setShowAdd] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('')

  const displayed = filterCat ? vendors.filter(v => v.category === filterCat) : vendors

  const activeCount      = vendors.filter(v => v.status === 'active').length
  const materialsCount   = vendors.filter(v => v.category === 'materials').length
  const contractorCount  = vendors.filter(v => v.category === 'contractor').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor / Supplier Master</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage approved vendors and suppliers</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Vendors</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{vendors.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Material Suppliers</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{materialsCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Contractors</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{contractorCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'materials', 'contractor', 'services', 'other'] as const).map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 text-xs rounded-full border font-medium capitalize ${filterCat === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
            {c === '' ? 'All' : c === 'materials' ? 'Materials Supplier' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Vendor', 'Category', 'Contact', 'Address', 'Trade License', 'Bank Info', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-xs leading-tight">{v.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{v.contact_person}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${CATEGORY_COLORS[v.category]}`}>
                      {v.category === 'materials' ? 'Materials' : v.category.charAt(0).toUpperCase() + v.category.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <p className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{v.phone}</p>
                    <p className="flex items-center gap-1 text-xs mt-0.5"><Mail className="w-3 h-3" />{v.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.address}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{v.trade_license || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {v.bank_name ? (
                      <div>
                        <p className="font-medium text-gray-700">{v.bank_name}</p>
                        <p className="text-gray-400 font-mono">{v.bank_account}</p>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="text-gray-400 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setVendors(p => p.filter(x => x.id !== v.id))} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddVendorModal onClose={() => setShowAdd(false)} onAdd={v => setVendors(p => [v, ...p])} />}
    </div>
  )
}
