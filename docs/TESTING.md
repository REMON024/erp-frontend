# Frontend Testing Guide

How to test `erp-frontend` against a backend loaded with the prepared QA dataset.

**The full test scope lives in the backend repo:** `ConstructERP/docs/TEST_SCOPE.md`. It covers both
sides of the product — every module, every test case ID, the RBAC matrix, and the reference figures
each screen must display. This file is the frontend-specific half: how to get a browser pointed at
seeded data, and what to check that is the frontend's own responsibility.

---

## 1. Point the app at a seeded API

The API base URL comes from `NEXT_PUBLIC_API_URL`, falling back to `http://localhost:5235/api`
(`lib/api.ts`).

```bash
# 1. Start the backend with the QA dataset on
cd ../ConstructERP
SEED_TEST_SCENARIOS=true dotnet run --project src/ConstructERP.API

# 2. Point the frontend at it and start
cd ../erp-frontend
NEXT_PUBLIC_API_URL=http://localhost:5235/api pnpm dev
```

The backend seeds on startup. Watch for the `Seeded QA test scenarios: 2 projects, ...` log line —
if it is absent, the flag did not take. If a reconciliation assert throws, the dataset disagrees
with the documented figures and startup fails deliberately; fix the seeder before testing.

---

## 2. Test accounts

| Role | Email | Password | Use it to check |
|---|---|---|---|
| `company_admin` | admin@skyline.com | `Admin@123456` | Everything; the full sidebar |
| `operations` | ops@skyline.com | `Ops@123456` | Sales, orders, accounting; read-only inventory |
| `inventory` | store@skyline.com | `Store@123456` | Stock screens and the resource catalogue |
| `engineer` | engineer@skyline.com | `Eng@123456` | Estimates only; project-scoped to `QA-ALPHA` |

Development credentials for a test environment. The RBAC expectations per role are the matrix in
§8 of the backend test scope.

---

## 3. What the QA data gives you on screen

Two projects. **`QA-ALPHA`** is the rich one — every list screen has rows in it, including at least
one row per status. **`QA-BETA`** is deliberately near-empty; use it to check that project filters
actually isolate and that empty states render properly rather than spinning forever.

Screens with a row for every status branch:

| Screen | Statuses present |
|---|---|
| `/projects/units` | Sold, Booked, Available, Cancelled |
| `/estimates` | Draft, Approved, Revised, Rejected |
| `/orders` | POs: Draft, Approved, Received, Cancelled · WOs: Draft, Active, Completed, Cancelled |
| `/sales/bookings` | Active, Cancelled |
| `/sales/schedules` | Paid, Partial, Unpaid, Overdue |
| `/sales/invoices` | Draft, Sent, Paid, Overdue, Cancelled |
| `/sales/collections` | Bank, Cheque, Online |
| `/accounting/vouchers` | JV, PV, RV, CV, BV · 17 posted + 1 Draft |
| `/inventory/levels` | One material below its minimum (Ceramic Floor Tile, 300 of 500) |
| `/inventory/resources` | Material, Equipment, Service, Labour, plus one Inactive |
| `/investment/distribution` | Declared (pending lines) and Paid (paid lines) |

Report totals to check against are in §6 of the backend test scope. The short version:

- Trial balance: 5001 = 5,100,000 · 4001 = 3,000,000 · 3003 = 32,000,000
- AR aging: one invoice in each of Current, 1–30, 31–60, 61–90
- Material consumption: 3,757,700 issued

---

## 4. Frontend-specific checks

These are the cases the backend cannot cover — they are the frontend's own behaviour. Full detail
is §9.11 (`TS-FE-01` … `TS-FE-12`) of the backend test scope.

**Routing.** Every route under `app/(dashboard)/` resolves. The regression to watch for is a module
that exists in `modules/` with no App Router entry — that is how `/documents` became unreachable.

**Boundary states.** Each list screen needs three: loading, error, empty.
- Loading — navigate with the network throttled; a blank page is a failure.
- Error — stop the API and reload; expect an error boundary with a retry, not a crash.
- Empty — filter to `QA-BETA`; expect a deliberate empty state, not an endless spinner.

**Scope pickers.** Estimates, stock issues and orders all cascade Project → Block → Floor → Unit.
Clearing a parent must clear its children. `QA-ALPHA` has the full hierarchy (2 blocks, 3 floors,
6 units) to exercise this.

**Auth edges.**
- A 401 mid-session clears the session and redirects to `/login`.
- A 401 from `/auth/login` itself renders inline — it must **not** redirect, or you get a loop.
  Same for `/auth/forgot-password` and `/auth/reset-password`.
- Deep-linking a protected route while logged out lands on login, then returns to the target.
- No protected-route flicker on first paint.

**Presentation.** Consistent currency and date formatting across screens; tables usable at 1280 /
1024 / 768 px with no horizontal page scroll; a create flow completable by keyboard alone.

---

## 5. Known gap: no automated frontend tests

There is no test runner configured in this repo. `msw` is a dependency and
`public/mockServiceWorker.js` exists, but no handlers are written and nothing imports them — so
every case above is manual today.

The recommended fix, in order:

1. **Vitest + Testing Library** for component and hook tests.
2. **msw handlers seeded from the QA figures** in §6 of the backend test scope, so the frontend
   asserts against the same numbers the backend does. That shared source of truth is the point —
   handlers invented independently drift.
3. **Playwright** for the two highest-value end-to-end flows: booking → invoice → collection, and
   purchase order → GRN → issue to project. Chromium is already available in the CI environment.
