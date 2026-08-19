# dashboard — Development & Business Flow

*Folder:* `modules/dashboard/` · *Route:* `/dashboard` · *Menu code:* `DASHBOARD`

## 1. Pages

| File | Purpose |
| --- | --- |
| `DashboardPage.tsx` | KPI cards, recent activity lists, chart section |
| `DashboardCharts.tsx` | Recharts visuals, lazily imported |

## 2. Development flow (architecture)

```
app/(dashboard)/dashboard/page.tsx ──► modules/dashboard/DashboardPage.tsx

six parallel reads, each with its own cache key (no shared key with other pages,
so the dashboard never invalidates a list page and vice versa):

  useApiData<Project[]>  '/projects'                      ['dash-projects']
  useApiData<Invoice[]>  '/invoices'                      ['dash-invoices']
  useApiData<Payment[]>  '/payments'                      ['dash-payments']
  useApiData<Material[]> '/materials'                     ['dash-materials']
  useApiData<Booking[]>  '/bookings'                      ['dash-bookings']
  useApiData<Estimate[]> '/cost-estimates?status=Approved' ['dash-estimates']

KPIs are computed client-side from those arrays; charts render in
<DashboardCharts /> which is lazy-loaded so the first paint is not chart-bound.
```

This page is **read-only** — no mutations, no invalidation.

## 3. Backend contract

| Read | Endpoint |
| --- | --- |
| Projects | `GET /projects` |
| Invoices | `GET /invoices` |
| Payments (collections) | `GET /payments` |
| Materials | `GET /materials` |
| Bookings | `GET /bookings` |
| Approved estimates | `GET /cost-estimates?status=Approved` |

## 4. Business flow

The landing snapshot of the business: active projects, revenue collected, outstanding
dues, low-stock materials, recent bookings/collections, and trend charts.

* Every figure is derived in the browser from full list responses — there is **no
  dashboard aggregate endpoint**. That keeps the backend simple but means the page pulls
  six unpaginated lists.
* `/dashboard` is in `ALWAYS_ALLOWED` (`auth.store.ts`), so every authenticated user can
  reach it regardless of their menu set. It is also the redirect target when the route
  guard blocks a page.
* Because the underlying endpoints are permission-guarded, a user without e.g.
  `INVOICES:View` gets a 403 for that one query; the page renders the remaining cards.

## 5. Gotchas

* Six full-table reads on every mount (`staleTime: 0`). If the dataset grows, add a
  dedicated summary endpoint rather than paginating here.
* Keep the `dash-*` key prefix — sharing keys with list pages would make every list
  mutation refetch the dashboard.

## 6. Extension checklist

1. New KPI from existing data → compute it in `DashboardPage.tsx`.
2. New KPI needing new data → add a `useApiData` call with a `dash-*` key, or (better,
   once several are needed) a backend summary query under `AccountingReports`.
3. New chart → `DashboardCharts.tsx`, keeping it inside the lazy boundary.
