# sales — Development & Business Flow

*Folder:* `modules/sales/` ·
*Routes:* `/sales` (invoices), `/sales/clients`, `/sales/units`, `/sales/bookings`,
`/sales/schedules`, `/sales/invoices`, `/sales/collections` ·
*Menu codes:* `CLIENTS`, `UNITS`, `BOOKINGS`, `PAYMENT_SCHEDULES`, `INVOICES`, `COLLECTIONS`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `ClientsPage.tsx` | `/sales/clients` | Customer master (KYC, nominee, status) |
| `UnitsPage.tsx` | `/sales/units` | Sellable units, pricing, availability |
| `BookingsPage.tsx` | `/sales/bookings` | Book a unit; even or custom installment plan; cancel |
| `PaymentSchedulePage.tsx` | `/sales/schedules` | All installments; generate an invoice for a due line |
| `InvoicesPage.tsx` | `/sales/invoices`, `/sales` | Invoice list, create, print |
| `CollectionsPage.tsx` | `/sales/collections` | Record customer payments, print receipts, chart |

## 2. Development flow (architecture)

```
ClientsPage      reads  /customers            ['customers', search]
                 writes POST|PUT /customers → invalidate customers, customers-list

UnitsPage        reads  /units ['units', projectId, status, search]
                        /projects ['projects-list'], /blocks ['blocks-list']
                 writes POST|PUT /units → invalidate units, units-list

BookingsPage     reads  /bookings ['bookings', search, status]
                        /customers ['customers-list'], /units ['units-list']
                        /installments?bookingId=… (ad-hoc api.get for the schedule preview)
                 writes POST /bookings, POST /bookings/{id}/cancel
                        → invalidate bookings, units, units-list

PaymentSchedulePage reads  /installments ['installments', status]
                    writes POST /invoices (for one due installment)
                           → invalidate installments, invoices

InvoicesPage     reads  /invoices ['invoices', search, status]
                        /customers ['customers-list'], /projects ['projects-list']
                 writes POST /invoices → invalidate invoices, invoices-list
                        POST /invoices/{id}/cancel  ← no backend endpoint (see Gotchas)

CollectionsPage  reads  /payments ['payments', search]
                        /invoices ['invoices-list'], /customers ['customers-list']
                 writes POST /payments
                        → invalidate payments, invoices, invoices-list, installments
```

Printing (invoice, receipt) goes through `utils/printUtils.ts`, which opens a styled
popup window and calls `print()` — pop-ups must be allowed.

## 3. Backend contract

| Endpoint | Used by | Permission |
| --- | --- | --- |
| `GET/POST/PUT /customers` | Clients, dropdowns | `CLIENTS:*` |
| `GET/POST/PUT /units`, `PATCH /units/{id}/status` | Units | `UNITS:*` |
| `GET/POST/PUT /bookings`, `POST /bookings/{id}/cancel` | Bookings | `BOOKINGS:*` |
| `GET /installments`, `GET /bookings/{id}/installments` | Schedule, Bookings | `PAYMENT_SCHEDULES:View`, `BOOKINGS:View` |
| `GET/POST/PUT /invoices`, `POST /invoices/{id}/send` | Invoices, Schedule | `INVOICES:*` |
| `GET/POST /payments` | Collections | `COLLECTIONS:*` |

## 4. Business flow

```
client ─┐
unit  ──┴─► BOOKING ──► installment schedule ──► invoice per installment
                                                      │
                                                      ▼
                                              COLLECTION (payment)
                                                      │
              ┌───────────────────────────────────────┼──────────────────────────┐
              ▼                                       ▼                          ▼
     invoice Paid/partial                   installment Paid/Partial     booking fully paid
                                                                          → unit = Sold
```

Rules the UI must respect (all enforced server-side):

| Step | Rule |
| --- | --- |
| Booking | Unit must be `Available`; customer must be `Active` |
| Booking | Discount < unit price; advance ≤ net price |
| Booking (custom plan) | Lines must sum **exactly** to the financed amount (`net − advance`); the form disables submit until they do |
| Booking | Creating it flips the unit to `Booked` and generates every installment **and** its invoice |
| Cancel booking | Unit returns to `Available`; open invoices and installments become `Cancelled` |
| Invoice | One invoice per installment; discount < subtotal; due ≥ invoice date |
| Invoice | Only a `Draft` invoice can be sent; `Paid`/`Cancelled` cannot be edited |
| Collection | Amount > 0; either an invoice or a booking must be referenced |
| Collection | Duplicate `referenceNo` for the same customer is refused (idempotency) |

Statuses shown in the UI:

* Unit — `Available` → `Booked` → `Sold` (or `Cancelled`)
* Booking — `Active` / `Cancelled`
* Installment — `Unpaid` / `Partial` / `Paid` / `Overdue` / `Cancelled`
* Invoice — `Draft` / `Sent` / `Paid` / `Overdue` / `Cancelled`

**Overdue and penalty are computed on read.** `GET /installments` marks past-due lines
`Overdue` and recomputes a 2 %-per-month prorated penalty every time the schedule page
loads; `GET /invoices` marks past-due `Sent` invoices `Overdue`. Nothing needs to be
scheduled — but the numbers change as the page is refreshed.

**Revenue recognition** follows the `revenue.basis` system setting: on `cash` (default)
the collection credits Sales Revenue; on `invoice` sending the invoice does, and the
collection clears receivables. Booking advances always credit Customer Advances.

## 5. Gotchas

* `InvoicesPage` calls `POST /invoices/{id}/cancel`, which **does not exist** on the
  backend; the failure is swallowed and the list simply refetches. Implement the command
  or remove the action.
* Collections warns when a payment is not linked to an invoice — the API accepts it as
  long as a booking id is present, but the installment sync will not happen.
* `['units-list']` and `['customers-list']` are shared dropdown keys — invalidate them
  after any create/edit, or other pages show stale options.

## 6. Extension checklist

1. New field on a booking → backend `BookingDto`/`CreateBookingRequest`, then the zod
   schema, form and table in `BookingsPage.tsx`.
2. New status → update the local `STATUS_COLORS` map and the filter options, plus the
   backend transition writer.
3. New print layout → `utils/printUtils.ts` (keep the shared `base()` stylesheet).
4. After any sales write, invalidate every affected key: bookings, units, units-list,
   invoices, invoices-list, installments, payments.
