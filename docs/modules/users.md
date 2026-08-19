# users — Development & Business Flow

*Folder:* `modules/users/` · *Route:* `/users` · *Menu code:* `USERS`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `UsersPage.tsx` | `/users` | User list (paginated), create/edit, roles, project scoping, activate/deactivate, password reset, effective-access preview |

## 2. Development flow (architecture)

This page uses the **manual fetch** style — `useState` + `useCallback` + `useEffect`,
not `useApiData`/React Query — because it paginates and refetches after several distinct
mutations:

```
load       GET /users?page&pageSize&search        → users, total
           GET /roles                             → role options
role modal GET /users/{id}/projects               → current project scoping
           GET /projects?pageSize=200             → project options

writes     POST  /users                           create (name, email, password, role)
           PUT   /users/{id}                      { firstName, lastName, phone }
           PUT   /users/{id}/roles                { roleNames: [...] }   ← replaces the set
           PUT   /users/{id}/projects             { projectIds: [...] }  ← replaces the set
           PATCH /users/{id}/toggle-status        activate / deactivate
           PUT   /users/{id}/reset-password       { newPassword }
           then loadUsers()
```

## 3. Backend contract

| Endpoint | Permission |
| --- | --- |
| `GET /users`, `GET /users/{id}` | `USERS:View` |
| `POST /users` | `USERS:Create` |
| `PUT /users/{id}`, `PATCH /users/{id}/toggle-status`, `PATCH /users/{id}/assign-role` | `USERS:Edit` |
| `PUT /users/{id}/roles`, `PUT /users/{id}/reset-password`, `PUT /users/{id}/projects` | `USERS:Edit` |
| `GET /users/{id}/projects` | `USERS:View` |
| `GET /roles` | `ROLES:View` |

## 4. Business flow

```
create user (email, password, one role)
    ↓
assign the full role set        PUT /users/{id}/roles      → permissions are the UNION of all roles
assign projects (engineers)     PUT /users/{id}/projects   → limits which projects' BOQs they see
toggle status                   inactive users cannot log in ("Invalid credentials.")
reset password                  admin action, audited
```

| Rule (server-enforced) | Notes |
| --- | --- |
| Email must be unique | `RequireUniqueEmail` |
| Password ≥ 8 chars with a digit and an uppercase letter | Identity policy; the admin reset additionally checks ≥ 6 in the handler |
| Role names must exist | Validated against the seeded role list |
| Role set replacement is audited | The backend writes an `AuditLog` row with old vs new roles by hand |

**Effective-access preview.** The panel that shows what a role combination can reach is
`utils/permissions.ts` — a coarse, illustrative map. It is **not** the gate: real access
comes from the backend `RoleMenuPermission` matrix (surfaced via `/menus/my-menus` and
enforced on every API call). Keep that distinction when editing the panel.

**Project scoping** only bites for a user whose sole granting role is `engineer`;
`operations`/`company_admin`/`super_admin` see every project regardless.

## 5. Gotchas

* Roles and projects are **replace-the-whole-set** operations — send the complete array,
  not a delta.
* A user whose roles change keeps their old menus until they log in again (the menu tree
  is loaded once per session).
* Deactivating a user does not revoke an already-issued JWT until it expires.

## 6. Extension checklist

1. New user field → backend `UserDto` + `IdentityService.ToDto`, then `types/index.ts`
   `User` and this page's form.
2. New membership concept (e.g. per-warehouse scoping) → new backend command + a panel
   here, following the roles/projects pattern.
3. If this page moves to React Query, key it `['users', page, search]` and invalidate on
   every mutation.
