# Frontend — Development & Business Flow Docs

One document per module under `modules/`, describing **how the code is wired**
(development flow architecture) and **what the user actually does** (business flow).

This page holds what every module shares; the per-module page only records what is
different. Companion docs: [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (system-level data
flow), [`../PAGES_GUIDE.md`](../PAGES_GUIDE.md) (plain-language page tour),
[`../../DESIGN_GUIDELINES.md`](../../DESIGN_GUIDELINES.md) (tokens, primitives, styling
rules — mandatory reading before writing UI).

> **Next.js 16 / React 19.** APIs and conventions differ from older versions. Read the
> relevant guide in `node_modules/next/dist/docs/` before writing routing or server code.

---

## 1. Layout

```
app/                       ← App Router: routing + layouts only
  (auth)/…/page.tsx        ← public routes (login, forgot-password)
  (dashboard)/…/page.tsx   ← guarded routes; each is a 2-line re-export of a module page
  layout.tsx, providers.tsx, globals.css
modules/<module>/          ← ALL feature UI lives here (one folder per business area)
components/ui/             ← shared primitives (Modal, Table, Select, DataState, …)
components/layout/         ← DashboardLayout, Sidebar, Topbar
hooks/useApiData.ts        ← the read hook (React Query + axios)
lib/api.ts                 ← axios instance: base URL, bearer token, 401 handling
lib/query-client.ts        ← React Query defaults
store/auth.store.ts        ← user, token, menus, route guard (zustand + persist)
store/theme.store.ts       ← dark mode
types/, utils/             ← shared types and helpers (format, cn, permissions, printUtils)
```

A route file is intentionally trivial:

```tsx
// app/(dashboard)/sales/bookings/page.tsx
import { BookingsPage } from '@/modules/sales/BookingsPage'
export default function Page() { return <BookingsPage /> }
```

Everything else — data, state, validation, layout — lives in the module component. Keep
it that way: it is what makes a page movable between routes.

## 2. Request path (identical in every module)

```
Component
   │  useApiData<T>({ url, params, queryKey, enabled })      ← reads
   │  api.post/put/patch/delete(...)                          ← writes
   ▼
hooks/useApiData.ts  → React Query useQuery
   │   queryFn: api.get(url, { params }) → unwraps res.data.data ?? res.data
   ▼
lib/api.ts (axios)
   │   baseURL   = process.env.NEXT_PUBLIC_API_URL ?? http://localhost:5235/api
   │   request   → Authorization: Bearer localStorage.erp_token
   │   response  → 401 (except /auth/login): clear token+user, redirect to /login
   ▼
ConstructERP API  → 200 payload | 400 { errors: [ "..." ] }
```

**Error convention.** The backend returns domain refusals as
`400 { errors: ["Unit is already booked."] }`. Pages surface them with:

```ts
catch (e: any) {
  setErr(e?.response?.data?.errors?.[0] ?? 'Something went wrong')
}
```

**Cache convention.** `lib/query-client.ts` sets `staleTime: 0`, refetch on mount and on
window focus, `retry: 1`. After a mutation, pages call a local `invalidate()` that
invalidates every affected key — including *other* modules' keys, because one write
often changes several read models:

```ts
const invalidate = () => {
  qc.invalidateQueries({ queryKey: ['bookings'] })
  qc.invalidateQueries({ queryKey: ['units'] })       // a booking also changes unit status
  qc.invalidateQueries({ queryKey: ['units-list'] })
}
```

## 3. Auth, menus and access

```
LoginForm → POST /auth/login → auth.store.setAuth(user, token)
   token → localStorage.erp_token + a cookie (SameSite=Lax)
DashboardLayout (mounted for every (dashboard) route)
   no token                → redirect /login
   token && !menusLoaded   → loadMenus(): GET /menus/my-menus
   menusLoaded             → isPathAllowed(pathname) ? render : redirect /dashboard
Sidebar renders the same menu tree (icon strings mapped to Lucide components)
```

Key points:

* **The menu tree is the access model.** `hasAccess(routeOrCode)` matches a menu code or
  a route prefix; `isPathAllowed(pathname)` guards navigation. `/dashboard`, `/` and
  `/settings` are always allowed. `super_admin` short-circuits to *allow all*.
* The client guard is **UX only** — the API enforces permissions independently on every
  request (`RoleMenuPermission` matrix, union across the user's roles).
* `utils/permissions.ts` is *not* a gate. It is a coarse role→module preview used on the
  users page while assigning roles. Never use it to hide real functionality.
* `components/ui/PermissionGate` wraps children in `hasAccess(module)`.
* There is **no `middleware.ts`** — route protection is client-side in
  `app/(dashboard)/layout.tsx` + `DashboardLayout`.

## 4. Page anatomy (the pattern to copy)

```tsx
'use client'
// 1. data
const { data, isLoading, error, refetch } = useApiData<Row[]>({ url: '/things', params: { search } })
// 2. shell
<PageHeader title="Things" action={<Button onClick={openCreate}><Plus/>New</Button>} />
<SearchBar value={search} onChange={setSearch} />
// 3. states
<DataState loading={isLoading} error={error?.message} empty={!rows.length} onRetry={refetch}>
   <Table … />
</DataState>
// 4. create/edit in a Modal with react-hook-form + zod
const schema = z.object({ name: z.string().min(1, 'Required') })
const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
// 5. mutate with the raw axios instance, then invalidate()
await api.post('/things', payload); invalidate(); onClose()
```

Conventions worth keeping:

| Concern | Convention |
| --- | --- |
| Client components | Every module page starts with `'use client'` |
| Forms | `react-hook-form` + `zod` via `@hookform/resolvers/zod`; `z.coerce.number()` for numeric inputs |
| Money | `৳` with `toLocaleString('en-BD')` (most pages define a local `fmt`) |
| Dates | ISO `yyyy-MM-dd` strings over the wire; `DateField` for input |
| Status | A local `STATUS_COLORS` record mapping status → token classes |
| Styling | Semantic tokens only (`bg-primary`, `text-danger`…). Never raw palette or hex — see DESIGN_GUIDELINES |
| Charts | `recharts`, lazily imported (see `modules/dashboard/DashboardCharts.tsx`) |
| Printing | `utils/printUtils.ts` opens a styled popup and calls `print()` |

## 5. Module index

| Module | Routes | Doc |
| --- | --- | --- |
| auth | `/login`, `/forgot-password` | [auth.md](auth.md) |
| dashboard | `/dashboard` | [dashboard.md](dashboard.md) |
| projects | `/projects`, `/projects/blocks`, `/estimates`, `/budget`, `/material-budget` | [projects.md](projects.md) |
| sales | `/sales/*` | [sales.md](sales.md) |
| purchase | `/purchase`, `/purchase/vendors`, `/purchase/grn` | [purchase.md](purchase.md) |
| inventory | `/inventory/*` | [inventory.md](inventory.md) |
| construction | `/construction/work-orders` | [construction.md](construction.md) |
| accounting | `/accounting/*`, `/reports/trial-balance` | [accounting.md](accounting.md) |
| investments | `/investment/investors`, `/investment/entries`, `/investment/report` | [investments.md](investments.md) |
| profit-distribution | `/investment/distribution` | [profit-distribution.md](profit-distribution.md) |
| reports | `/reports/*` | [reports.md](reports.md) |
| users | `/users` | [users.md](users.md) |
| roles | `/roles` | [roles.md](roles.md) |
| menus | `/menus` | [menus.md](menus.md) |
| audit-logs | `/audit-logs` | [audit-logs.md](audit-logs.md) |
| settings | `/settings`, `/settings/system` | [settings.md](settings.md) |
| tasks | `/tasks` | [tasks.md](tasks.md) |
| documents | *(no route mounted)* | [documents.md](documents.md) |

## 6. Adding a page — the standard path

1. Create `modules/<module>/<Name>Page.tsx` (`'use client'`, follow §4).
2. Add `app/(dashboard)/<path>/page.tsx` re-exporting it.
3. Backend: add the menu code (`MenuCodes`), seed the `Menu` row with this `route`, and
   grant it in the role matrix — **until the menu exists the route guard redirects the
   user to `/dashboard`.**
4. Wire reads through `useApiData` with a stable `queryKey`; wire writes through `api.*`
   and invalidate every key the write touches.
5. Check dark mode and mobile before opening the PR (DESIGN_GUIDELINES §1, §6).
