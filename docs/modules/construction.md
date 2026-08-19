# construction — Development & Business Flow

*Folder:* `modules/construction/` · *Route:* `/construction/work-orders` ·
*Menu code:* `WORK_ORDERS`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `WorkOrdersPage.tsx` | `/construction/work-orders` | Contractor work orders, their material budget, progress bills, vouchers and payments |

At ~660 lines this is the largest page in the app: one screen carries the whole
subcontractor lifecycle.

## 2. Development flow (architecture)

```
WorkOrdersPage
  reads   /work-orders            ['work-orders', search, status, project]
          /work-order-bills?workOrderId  ['wo-bills', workOrderId]     (bill drawer)
          /projects ['projects-list'], /vendors ['vendors-list'],
          /materials ['materials-list'], /accounts ['accounts-list']   (voucher form)

  writes  POST|PUT /work-orders                    create / edit (incl. material lines)
          POST /work-orders/{id}/approve           Draft → Active
          POST /work-order-bills                   add a progress bill
          POST /work-order-bills/{id}/approve      Pending → Approved (+ expense journal)
          POST /payments/contractor                pay an approved bill (+ PV journal)
          POST /vouchers                           manual voucher from the bill
          → invalidate work-orders, wo-bills, vouchers
```

The `/accounts` read exists only so the page can build a manual voucher inline — most of
the accounting side is otherwise automatic.

## 3. Backend contract

| Endpoint | Used by | Permission |
| --- | --- | --- |
| `GET/POST/PUT /work-orders` | order list & form | `WORK_ORDERS:View/Create/Edit` |
| `POST /work-orders/{id}/approve` | approve action | `WORK_ORDERS:Edit` |
| `POST /work-orders/{id}/release-retention` | retention release | `WORK_ORDERS:Edit` |
| `GET /work-order-bills`, `GET /work-orders/{id}/bills` | bill drawer | `WORK_ORDERS:View` |
| `POST /work-order-bills` | add bill | `WORK_ORDERS:Create` |
| `POST /work-order-bills/{id}/approve` | approve bill | `WORK_ORDERS:Edit` |
| `POST /payments/contractor` | pay bill | `COLLECTIONS:Create` |
| `POST /vouchers` | manual voucher | `VOUCHERS:Create` |

## 4. Business flow

```
WORK ORDER  Draft ──approve──► Active ──(work done)──► Completed ──release retention──►
   contract amount · advance · retention % · material budget lines
        │
        ├── stock-in against this order fills WorkOrderMaterial.ReceivedQty
        │
        └── PROGRESS BILL  Pending ──approve──► Approved ──contractor payment──► Paid
                 retention        = BillAmount × RetentionPercent
                 advance recovery = min(outstanding advance, 10 % of the bill)
                 net payable      = bill − retention − advance recovery
```

Ledger effects (all automatic):

| Action | Posting |
| --- | --- |
| Bill approved | DR `5001` Construction Expense (bill) / CR `2003` Contractor Payable (net) + CR `2004` Retention Payable + CR `1007` Advance to Contractor |
| Contractor paid | DR `2003` Contractor Payable / CR `1001`\|`1002` Cash or Bank |
| Retention released | DR `2004` Retention Payable / CR `2003` Contractor Payable |

Server-enforced rules the UI must respect:

* Advance ≤ contract amount; end date ≥ start date; project and vendor must exist.
* A `Draft` or `Cancelled` order **cannot be billed**.
* Total billed (excluding cancelled bills) may not exceed the contract amount — the error
  states the remaining billable amount.
* Only `Pending` bills can be approved; only non-pending bills can be paid.
* Retention can only be released on a `Completed` order, and only if something is held.

## 5. Gotchas

* **Stock-in requires a work order** with the material budgeted on it. If site receipts
  are being refused, the missing piece is usually a `WorkOrderMaterial` line, not stock.
* The page offers a manual voucher action in addition to the automatic postings — using
  both for the same bill double-counts. Prefer the automatic path.
* Vendor **type** (`Contractor`/`Both`) is filtered client-side only.
* Retention sits in `2004` until release; the work-order progress report is the place to
  see held vs released.

## 6. Extension checklist

1. New work-order field → backend `SaveWorkOrderRequest` + `WorkOrderDto`, then the form.
2. New bill deduction → `CreateWorkOrderBillCommand` (maths) **and**
   `ApproveWorkOrderBillCommand` (ledger split); keep bill = net + retention + advance or
   the journal silently refuses to post.
3. Splitting this page up: extract the bill drawer and the voucher modal first — they are
   self-contained.
