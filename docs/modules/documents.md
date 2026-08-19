# documents — Development & Business Flow

*Folder:* `modules/documents/` · *Route:* **not mounted** ·
*Menu code:* not in `MenuCodes`

> **Status: front-end only, and unreachable.** There is no `app/(dashboard)/documents`
> route re-exporting this component, and the `/documents` endpoints it calls do not exist
> in the ConstructERP API.

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `DocumentsPage.tsx` | — | Document library: upload, filter by module, search, download, delete |

## 2. Development flow (architecture)

Manual fetch style with a multipart upload:

```
DocumentsPage
  load    GET    /documents?module_name=&search=      → Document[] (types/index.ts)
  upload  POST   /documents/upload  (FormData, Content-Type: multipart/form-data)
  delete  DELETE /documents/{id}                       optimistic removal from local state
  form    react-hook-form + zod; modules: general, projects, procurement, safety,
          finance, contracts, compliance
  helper  fmtSize() renders B / KB / MB
```

It reads the signed-in user from `store/auth.store` for the uploader label.

## 3. Backend contract

| Call | Endpoint | Exists? |
| --- | --- | --- |
| List | `GET /documents` | ❌ no controller |
| Upload | `POST /documents/upload` (multipart) | ❌ |
| Delete | `DELETE /documents/{id}` | ❌ |

The API also has **no file storage layer** today — every other module is pure relational
data, and `lib/api.ts` sets a JSON content type by default (this page overrides it per
request).

## 4. Business flow (intended)

```
upload a file, tagged to a module (and implicitly a project) ──► searchable library
      └─► download / delete
```

## 5. Gotchas

* Because no route re-exports it, the component is dead code in the current build —
  keep that in mind before "fixing" bugs reported against it.
* Uploading needs more than an endpoint: storage (disk/blob), size and type limits,
  virus scanning and an access-control decision (per project? per module? per role?).
* `DashboardLayout` prefetches `/documents`, which currently 404s at the router level.

## 6. Extension checklist — making it real

1. Backend: a `Document` entity (name, module, project, size, content type, storage key,
   uploader), `Application/Features/Documents/`, a storage abstraction in Infrastructure,
   and a controller with `[HasPermission(MenuCodes.Documents, …)]`.
2. Add `MenuCodes.Documents`, seed the `Menu` row and grant it in `/roles`.
3. Frontend: add `app/(dashboard)/documents/page.tsx` re-exporting `DocumentsPage`, align
   the parameter names with the API, and move reads onto `useApiData`.
