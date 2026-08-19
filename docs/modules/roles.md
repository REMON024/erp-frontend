# roles — Development & Business Flow

*Folder:* `modules/roles/` · *Route:* `/roles` · *Menu code:* `ROLES`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `RolesPage.tsx` | `/roles` | Role CRUD **and** the per-menu permission matrix editor |

## 2. Development flow (architecture)

Manual fetch style (`useState`/`useEffect`), with a small in-component cache of
permission matrices per role (`permsCache`) so reopening a role does not refetch:

```
load        GET /roles                       → role list
expand role GET /permissions/{roleId}        → every menu × { canView, canCreate, canEdit, canDelete }
writes      POST   /roles                    create
            PUT    /roles/{id}               rename / describe
            DELETE /roles/{id}               delete
            PUT    /permissions/{roleId}     { permissions: [ { menuId, canView, … } ] }  ← full matrix
```

## 3. Backend contract

| Endpoint | Permission |
| --- | --- |
| `GET /roles`, `GET /roles/{id}` | `ROLES:View` |
| `POST /roles` | `ROLES:Create` |
| `PUT /roles/{id}` | `ROLES:Edit` |
| `DELETE /roles/{id}` | `ROLES:Delete` |
| `GET /permissions/{roleId}` | `ROLES:View` |
| `PUT /permissions/{roleId}` | `ROLES:Edit` |

## 4. Business flow

```
create role ──► (no access yet) ──► open the matrix ──► tick view/create/edit/delete per menu ──► save
                                                                    │
                        users holding the role get the UNION of all their roles' permissions
```

Things the matrix editor must respect:

* **The permission matrix is the authorization model.** `canView` on a menu is what puts
  the page in the user's sidebar (`/menus/my-menus`) and what lets the API's
  `[HasPermission(code, View)]` succeed.
* **Union across roles, most permissive wins.** Removing a permission from one role does
  nothing if another of the user's roles still grants it.
* **`super_admin` bypasses the matrix entirely** — its rows are irrelevant.
* **Saving replaces the role's whole matrix** — always send every menu row.
* **A new menu starts denied for everyone but `super_admin`** (the backend seeds a row
  per role with `canView = false`), so newly added pages must be granted here.
* The four flags are independent: granting `canCreate` without `canView` yields an API
  that accepts writes for a page the user cannot open. Treat `canView` as the parent in
  the UI.

## 5. Gotchas

* Deleting a role that users still hold silently removes their access — check membership
  on the users page first.
* Permission changes take effect on the API immediately, but a signed-in user's sidebar
  only refreshes on their next login (menus load once per session).
* Seeded role names (`super_admin`, `company_admin`, `operations`, `inventory`,
  `engineer`) are referenced by backend validators; renaming them breaks user creation.

## 6. Extension checklist

1. New permission action → backend `PermissionAction` enum, a column on
   `RoleMenuPermission`, `PermissionService.Allows`, the permission DTOs, then a column
   in this matrix.
2. New menu → create it in `modules/menus` (or seed it), then grant it here.
3. Keep the matrix save as a full replacement; partial updates are not supported by the API.
