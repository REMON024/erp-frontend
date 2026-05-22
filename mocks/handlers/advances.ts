import { http, HttpResponse } from 'msw'
import { MOCK_ADVANCES, MOCK_RETENTION_RELEASES } from '@/mocks/fixtures/advances'
import { ContractorAdvance, RetentionRelease } from '@/types'
import { addJournalEntry } from '@/mocks/shared-state'

let advances = [...MOCK_ADVANCES]
let releases = [...MOCK_RETENTION_RELEASES]

export const advancesHandlers = [
  // ─── Contractor Advances ────────────────────────────────────────────────────
  http.get('/api/contractor-advances', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const contractorId = url.searchParams.get('contractor_id')
    const status = url.searchParams.get('status')
    let data = [...advances]
    if (projectId) data = data.filter(a => a.project_id === projectId)
    if (contractorId) data = data.filter(a => a.contractor_id === contractorId)
    if (status) data = data.filter(a => a.status === status)
    const totalDisbursed = data.filter(a => ['disbursed', 'recovered', 'closed'].includes(a.status)).reduce((s, a) => s + a.amount, 0)
    const totalRecovered = data.reduce((s, a) => s + a.recovered_amount, 0)
    return HttpResponse.json({ data, total: data.length, total_disbursed: totalDisbursed, total_outstanding: totalDisbursed - totalRecovered })
  }),

  http.get('/api/contractor-advances/:id', ({ params }) => {
    const adv = advances.find(a => a.id === params.id)
    if (!adv) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ data: adv })
  }),

  http.post('/api/contractor-advances', async ({ request }) => {
    const body = await request.json() as Partial<ContractorAdvance>
    const newAdv: ContractorAdvance = {
      id: `adv${Date.now()}`,
      project_id: body.project_id ?? '',
      contractor_id: body.contractor_id ?? '',
      amount: body.amount ?? 0,
      purpose: body.purpose ?? '',
      status: 'requested',
      recovered_amount: 0,
      recovery_pct: body.recovery_pct ?? 10,
      created_at: new Date().toISOString(),
    }
    advances.push(newAdv)
    return HttpResponse.json({ data: newAdv }, { status: 201 })
  }),

  http.post('/api/contractor-advances/:id/approve', ({ params }) => {
    const idx = advances.findIndex(a => a.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    advances[idx] = { ...advances[idx], status: 'approved' }
    return HttpResponse.json({ data: advances[idx] })
  }),

  http.post('/api/contractor-advances/:id/disburse', async ({ params, request }) => {
    const idx = advances.findIndex(a => a.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as { disbursed_date?: string }
    const disbursedDate = body.disbursed_date ?? new Date().toISOString().slice(0, 10)
    advances[idx] = { ...advances[idx], status: 'disbursed', disbursed_date: disbursedDate }

    // Auto-post GL: Debit Advance to Contractors, Credit Cash
    addJournalEntry({
      project_id: advances[idx].project_id,
      date: disbursedDate,
      reference: `ADV-DISB-${advances[idx].id.toUpperCase()}`,
      description: `Advance disbursed to contractor ${advances[idx].contractor_id}`,
      created_by: 'system',
      lines: [
        { id: `jl-adv-d-${Date.now()}`, journal_id: '', account_id: 'acc3', debit: advances[idx].amount, credit: 0 },
        { id: `jl-adv-c-${Date.now()}`, journal_id: '', account_id: 'acc1', debit: 0, credit: advances[idx].amount },
      ],
    })
    return HttpResponse.json({ data: advances[idx] })
  }),

  http.patch('/api/contractor-advances/:id', async ({ params, request }) => {
    const idx = advances.findIndex(a => a.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Partial<ContractorAdvance>
    advances[idx] = { ...advances[idx], ...body }
    if (advances[idx].recovered_amount >= advances[idx].amount) advances[idx].status = 'closed'
    return HttpResponse.json({ data: advances[idx] })
  }),

  // ─── Retention Releases ─────────────────────────────────────────────────────
  http.get('/api/retention-releases', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const contractorId = url.searchParams.get('contractor_id')
    let data = [...releases]
    if (projectId) data = data.filter(r => r.project_id === projectId)
    if (contractorId) data = data.filter(r => r.contractor_id === contractorId)
    return HttpResponse.json({ data, total: data.length, total_released: data.reduce((s, r) => s + r.amount, 0) })
  }),

  http.post('/api/retention-releases', async ({ request }) => {
    const body = await request.json() as Partial<RetentionRelease>
    const newRelease: RetentionRelease = {
      id: `rr${Date.now()}`,
      project_id: body.project_id ?? '',
      contractor_id: body.contractor_id ?? '',
      bill_id: body.bill_id ?? '',
      amount: body.amount ?? 0,
      release_date: body.release_date ?? new Date().toISOString().slice(0, 10),
      phase: body.phase ?? 'practical_completion',
      created_at: new Date().toISOString(),
    }
    releases.push(newRelease)

    // Auto-post GL: Debit Retention Payable, Credit Cash
    addJournalEntry({
      project_id: newRelease.project_id,
      date: newRelease.release_date,
      reference: `RET-REL-${newRelease.id.toUpperCase()}`,
      description: `Retention release — ${newRelease.phase.replace('_', ' ')} — contractor ${newRelease.contractor_id}`,
      created_by: 'system',
      lines: [
        { id: `jl-ret-d-${Date.now()}`, journal_id: '', account_id: 'acc8', debit: newRelease.amount, credit: 0 },
        { id: `jl-ret-c-${Date.now()}`, journal_id: '', account_id: 'acc1', debit: 0, credit: newRelease.amount },
      ],
    })
    return HttpResponse.json({ data: newRelease }, { status: 201 })
  }),
]
