# menus — Development & Business Flow

*Folder:* `modules/menus/` · *Route:* `/menus` · *Menu code:* `MENUS`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `MenusPage.tsx` | `/menus` | The navigation tree: create, edit, re-parent, sort, activate, delete |

Drag-and-drop ordering uses `@dnd-kit` (`core`, `sortable`, `utilities`).

## 2. Development flow (architecture)

Manual fetch style, holding both a tree and a flat list in state:

```
load    GET /menus/tree             → tree (admin view: every menu, active or not)
                                      flattened into `flat` for the parent picker
writes  POST   /menus               { name, code, route, icon, parentId, sortOrder }
        PUT    /menus/{id}          same fields + isActive  (also used for drag-sort saves)
        DELETE /menus/{id}
        then load()
```

The sidebar is a **different** read: `store/auth.store.ts` calls `GET /menus/my-menus`,
which returns only the menus the signed-in user may view.

## 3. Backend contract

| Endpoint | Permission |
| --- | --- |
| `GET /menus/tree` | `MENUS:View` |
| `POST /menus` | `MENUS:Create` |
| `PUT /menus/{id}` | `MENUS:Edit` |
| `DELETE /menus/{id}` | `MENUS:Delete` |
| `GET /menus/my-menus` | authenticated (no permission required) |

## 4. Business flow

```
create menu ──► backend seeds a permission row for EVERY role (canView only for super_admin)
      │
      ├─ code   → must match a MenuCodes constant used by the API's [HasPermission]
      ├─ route  → must match the frontend path; this is what the route guard allows
      ├─ icon   → a Lucide name resolved by Sidebar's ICON_MAP (unknown → generic Menu icon)
      └─ parent + sortOrder → sidebar grouping and order
      ▼
grant it in /roles ──► it appears in users' sidebars and their API calls succeed
```

Why this page is load-bearing:

* **`route` is the access key on the client.** `auth.store.isPathAllowed` flattens the
  user's menu routes; a page whose menu is missing, inactive, or has a mismatched route
  bounces the user to `/dashboard` even though the component exists.
* **`code` is the access key on the server.** It must equal the `MenuCodes` constant used
  by the controller attributes, or every request to that area 403s.
* **Deleting a menu deletes its permission rows** — the API stays guarded by a code with
  no rows, i.e. denied for everyone except `super_admin`.
* `isActive = false` removes the menu from `my-menus` (so the client guard blocks the
  route) but does not change the API's own check.
* A menu whose parent the user cannot view is promoted to the sidebar root by the backend
  rather than being hidden.

## 5. Gotchas

* Adding a page in `app/` without adding a menu row makes it unreachable for non-super
  admins — this is the most common "my new page redirects to dashboard" cause.
* Icon names are free text; only names present in `Sidebar.tsx`'s `ICON_MAP` render as
  intended.
* Sort order is per level, not global.

## 6. Extension checklist

1. New page → menu row here (or seeded on the backend) with the exact `route`, plus the
   `MenuCodes` constant used by the controller, then grant it in `/roles`.
2. New icon → import it in `components/layout/Sidebar.tsx` and add it to `ICON_MAP`.
3. Renaming a `code` → update `Domain/Constants/MenuCodes.cs` and every controller
   attribute in the same change.
