# audit-logs — Development & Business Flow

*Folder:* `modules/audit-logs/` · *Route:* `/audit-logs` · *Menu code:* `AUDIT_LOGS`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `AuditLogsPage.tsx` | `/audit-logs` | Read-only change trail with filters and an old-vs-new diff view |

## 2. Development flow (architecture)

```
AuditLogsPage
  reads GET /auditlogs?search&tableName&action&from&to&page&pageSize
        queryKey ['audit-logs', search, tableFilter, actionFilter, fromDate, toDate, page]
  no writes — the log is append-only and written by the backend DbContext
```

Rows carry `oldValues` / `newValues` as camelCase JSON strings; the page parses them to
render a field-by-field comparison.

## 3. Backend contract

| Endpoint | Permission | Shape |
| --- | --- | --- |
| `GET /auditlogs` | `AUDIT_LOGS:View` | `PaginatedList<AuditLogDto>` (default page size 50) |

## 4. Business flow

* Entries are produced automatically inside `ApplicationDbContext.SaveChangesAsync` for
  every tracked entity — `Create`, `Update`, `Delete` — with the acting user, timestamp
  and IP.
* Role assignments are logged explicitly by `SetUserRolesCommand` under the table name
  `AspNetUserRoles`, because Identity's join table is outside the automatic sweep.
* What the page is for: "who changed this booking's discount", "when was this user
  deactivated", "which values did this voucher have before".
* Nothing here can be edited or deleted through the API — that is the point.

## 5. Gotchas

* This is the fastest-growing table in the database (every field change on every entity).
  Always keep the query paginated and filtered; plan an archival strategy before it gets
  large.
* Operations performed outside the DbContext (raw SQL, bulk updates, seeding) are not
  logged.
* Seeded or background writes with no HTTP context log a null user.

## 6. Extension checklist

1. New filter → backend `GetAuditLogsQuery` + controller query parameters, then the
   filter row here (remember to add it to the `queryKey`).
2. Nicer diffs → parse `oldValues`/`newValues` per entity in this page; the backend
   stores plain JSON on purpose.
3. Excluding a noisy entity → filter it in the backend's `GatherPendingAudit`.
