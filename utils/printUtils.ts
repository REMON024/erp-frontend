function open(html: string, title: string) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Allow pop-ups to print/download.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 600)
}

function base() {
  return `
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;color:#111;font-size:13px;padding:40px;background:#fff}
      h1{font-size:26px;font-weight:800;color:#1e3a8a}
      h2{font-size:20px;color:#1e3a8a}
      .sub{color:#6b7280;font-size:12px;margin-top:2px}
      hr{border:none;border-top:2px solid #1e3a8a;margin:16px 0}
      .row{display:flex;justify-content:space-between;align-items:flex-start}
      .col{flex:1}
      .label{font-size:10px;text-transform:uppercase;color:#9ca3af;letter-spacing:.5px}
      .val{font-size:13px;font-weight:600;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#1e3a8a;color:#fff;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase}
      td{padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px}
      .totals{margin-top:12px;margin-left:auto;width:260px}
      .totals td{border:none;padding:4px 8px;font-size:12px}
      .totals .grand td{font-weight:800;font-size:15px;border-top:2px solid #1e3a8a;padding-top:8px;color:#1e3a8a}
      .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;background:#dcfce7;color:#15803d}
      .footer{margin-top:48px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:10px;color:#9ca3af;text-align:center}
      @media print{body{padding:20px}button{display:none!important}.no-print{display:none!important}}
    </style>
    <div class="no-print" style="text-align:right;margin-bottom:16px">
      <button onclick="window.print()" style="padding:8px 20px;background:#1e3a8a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
        🖨 Print / Save as PDF
      </button>
    </div>`
}

/**
 * The project and the part of it a document relates to, when known.
 *
 * Rendered as two columns to match the surrounding blocks, and omitted entirely when neither is
 * present — a receipt for a walk-in payment genuinely has no project, and an empty labelled box
 * reads as missing data rather than as not-applicable.
 */
function scopeBlock(projectName?: string, scopeLabel?: string): string {
  if (!projectName && !scopeLabel) return ''
  return `
      <div class="col">
        <p class="label">Project</p>
        <p class="val">${projectName || '—'}</p>
      </div>
      <div class="col">
        <p class="label">Item</p>
        <p class="val">${scopeLabel || '—'}</p>
      </div>`
}

export interface InvoicePrint {
  invoiceNo: string; customerName: string; invoiceDate: string; dueDate?: string
  invoiceType: string; subTotal: number; discountAmount: number
  vatAmount: number; taxAmount: number; totalAmount: number
  paidAmount: number; dueAmount: number; status: string
  companyName?: string
  /**
   * What the money is for. A printed invoice used to name the company, the customer and the date
   * and nothing else — so two flats in two different projects produced documents a buyer could not
   * tell apart. The breadcrumb comes from the server (ScopeLabel), not assembled here.
   */
  projectName?: string
  scopeLabel?: string
}

export function printInvoice(inv: InvoicePrint) {
  const fmt = (n: number) => '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 2 })
  const company = inv.companyName || 'ConstructERP'

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${inv.invoiceNo}</title>
  ${base()}
  </head><body>
    <div class="row">
      <div><h1>${company}</h1><p class="sub">Construction ERP System</p></div>
      <div style="text-align:right"><h2>INVOICE</h2><p class="sub">${inv.invoiceNo}</p></div>
    </div>
    <hr>
    <div class="row" style="gap:32px;margin-top:8px">
      <div class="col">
        <p class="label">Bill To</p>
        <p class="val">${inv.customerName}</p>
      </div>
      <div class="col">
        <p class="label">Invoice Date</p>
        <p class="val">${inv.invoiceDate}</p>
      </div>
      <div class="col">
        <p class="label">Due Date</p>
        <p class="val">${inv.dueDate || '—'}</p>
      </div>
    </div>
    <div class="row" style="gap:32px;margin-top:8px">
      ${scopeBlock(inv.projectName, inv.scopeLabel)}
      <div class="col">
        <p class="label">Type</p>
        <p class="val">${inv.invoiceType}</p>
      </div>
      <div class="col">
        <p class="label">Status</p>
        <p class="val"><span class="badge">${inv.status}</span></p>
      </div>
    </div>
    <table style="margin-top:24px">
      <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr><td>${inv.invoiceType} — ${inv.customerName}</td><td style="text-align:right">${fmt(inv.subTotal)}</td></tr>
        ${inv.discountAmount > 0 ? `<tr><td style="color:#dc2626">Discount</td><td style="text-align:right;color:#dc2626">− ${fmt(inv.discountAmount)}</td></tr>` : ''}
        ${inv.vatAmount > 0 ? `<tr><td>VAT</td><td style="text-align:right">${fmt(inv.vatAmount)}</td></tr>` : ''}
        ${inv.taxAmount > 0 ? `<tr><td>Tax</td><td style="text-align:right">${fmt(inv.taxAmount)}</td></tr>` : ''}
      </tbody>
    </table>
    <table class="totals">
      <tbody>
        <tr><td>Sub Total</td><td style="text-align:right">${fmt(inv.subTotal)}</td></tr>
        ${inv.discountAmount > 0 ? `<tr><td style="color:#dc2626">Discount</td><td style="text-align:right;color:#dc2626">− ${fmt(inv.discountAmount)}</td></tr>` : ''}
        ${inv.vatAmount > 0 ? `<tr><td>VAT</td><td style="text-align:right">${fmt(inv.vatAmount)}</td></tr>` : ''}
        ${inv.taxAmount > 0 ? `<tr><td>Tax</td><td style="text-align:right">${fmt(inv.taxAmount)}</td></tr>` : ''}
        <tr class="grand"><td>Total</td><td style="text-align:right">${fmt(inv.totalAmount)}</td></tr>
        ${inv.paidAmount > 0 ? `<tr><td style="color:#15803d">Paid</td><td style="text-align:right;color:#15803d">− ${fmt(inv.paidAmount)}</td></tr>` : ''}
        ${inv.dueAmount > 0 ? `<tr><td style="color:#dc2626;font-weight:700">Balance Due</td><td style="text-align:right;color:#dc2626;font-weight:700">${fmt(inv.dueAmount)}</td></tr>` : ''}
      </tbody>
    </table>
    <div class="footer">
      <p>Generated by ${company} · ${new Date().toLocaleDateString('en-BD')}</p>
      <p style="margin-top:4px">Thank you for your business.</p>
    </div>
  </body></html>`

  open(html, `Invoice ${inv.invoiceNo}`)
}

export interface ReceiptPrint {
  paymentNo: string; customerName: string; paymentDate: string
  amount: number; method: string; referenceNo?: string
  invoiceNo?: string; notes?: string; companyName?: string
  /** What the money was for — see the note on InvoicePrint. */
  projectName?: string
  scopeLabel?: string
}

export function printReceipt(p: ReceiptPrint) {
  const fmt = (n: number) => '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 2 })
  const company = p.companyName || 'ConstructERP'

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt ${p.paymentNo}</title>
  ${base()}
  </head><body>
    <div style="max-width:500px;margin:0 auto;border:2px solid #1e3a8a;border-radius:8px;padding:32px">
      <div class="row">
        <div><h1 style="font-size:20px">${company}</h1><p class="sub">Money Receipt</p></div>
        <div style="text-align:right">
          <p style="font-size:22px;font-weight:800;color:#1e3a8a">RECEIPT</p>
          <p class="sub" style="font-size:12px;font-weight:600">${p.paymentNo}</p>
        </div>
      </div>
      <hr>
      <table style="margin-top:8px">
        <tbody>
          <tr><td class="label" style="width:40%;padding:6px 0">Received From</td><td class="val" style="padding:6px 0">${p.customerName}</td></tr>
          <tr><td class="label" style="padding:6px 0">Date</td><td class="val" style="padding:6px 0">${p.paymentDate}</td></tr>
          <tr><td class="label" style="padding:6px 0">Payment Method</td><td class="val" style="padding:6px 0">${p.method}</td></tr>
          ${p.projectName ? `<tr><td class="label" style="padding:6px 0">Project</td><td class="val" style="padding:6px 0">${p.projectName}</td></tr>` : ''}
          ${p.scopeLabel ? `<tr><td class="label" style="padding:6px 0">Item</td><td class="val" style="padding:6px 0">${p.scopeLabel}</td></tr>` : ''}
          ${p.referenceNo ? `<tr><td class="label" style="padding:6px 0">Reference No.</td><td class="val" style="padding:6px 0">${p.referenceNo}</td></tr>` : ''}
          ${p.invoiceNo ? `<tr><td class="label" style="padding:6px 0">Against Invoice</td><td class="val" style="padding:6px 0">${p.invoiceNo}</td></tr>` : ''}
          ${p.notes ? `<tr><td class="label" style="padding:6px 0">Notes</td><td style="padding:6px 0;font-size:12px">${p.notes}</td></tr>` : ''}
        </tbody>
      </table>
      <div style="margin-top:24px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;text-align:center">
        <p class="label">Amount Received</p>
        <p style="font-size:28px;font-weight:800;color:#1e3a8a;margin-top:4px">${fmt(p.amount)}</p>
      </div>
      <div class="footer" style="margin-top:24px">
        <p>${company} · ${new Date().toLocaleDateString('en-BD')}</p>
        <p style="margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb">
          Authorized Signature: _______________________
        </p>
      </div>
    </div>
  </body></html>`

  open(html, `Receipt ${p.paymentNo}`)
}
