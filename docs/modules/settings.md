# settings — Development & Business Flow

*Folder:* `modules/settings/` · *Routes:* `/settings`, `/settings/system` ·
*Menu code:* `SYSTEM_SETTINGS` (the personal page is always allowed)

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `SettingsPage.tsx` | `/settings` | Personal: profile, change password, notification preferences (tabs) |
| `SystemSettingsPage.tsx` | `/settings/system` | Company-wide policy toggles |

## 2. Development flow (architecture)

```
SettingsPage         (manual fetch; reads the current user from auth.store)
   tabs: profile | password | notifications
   writes PUT  /users/{currentUser.id}      { firstName, lastName, phone }
          POST /auth/change-password        { currentPassword, newPassword }
   notifications tab is local UI only — there is no preferences endpoint

SystemSettingsPage   (useApiData)
   reads  GET /settings                     ['settings']  → [{ key, value }]
   writes PUT /settings { key, value }       one key per call → invalidate ['settings']
```

`/settings` is in `ALWAYS_ALLOWED` (`store/auth.store.ts`), so every signed-in user can
open their own settings regardless of their menu set. `/settings/system` is a normal
guarded route.

## 3. Backend contract

| Endpoint | Used by | Permission |
| --- | --- | --- |
| `PUT /users/{id}` | Profile tab | `USERS:Edit` |
| `POST /auth/change-password` | Password tab | authenticated |
| `GET /settings` | System settings | `SYSTEM_SETTINGS:View` |
| `PUT /settings` | System settings | `SYSTEM_SETTINGS:Edit` |

## 4. Business flow

### System settings — the two keys that change behaviour

| Key | Values | Effect |
| --- | --- | --- |
| `revenue.basis` | `cash` (default) / `invoice` | `cash`: a collection credits Sales Revenue. `invoice`: sending an invoice credits Sales Revenue and debits AR, and the collection then only clears AR. |
| `purchase.eplEnforcement` | `warn` (default) / `block` | `warn`: a PO line with no approved BOQ link is accepted with a reason. `block`: such a PO is rejected outright. |

* `GET /settings` returns **defaults for known keys that have no stored row**, so a fresh
  install renders `cash` + `warn` without seeding.
* The backend rejects unknown keys and invalid values, listing the allowed options — the
  UI should offer exactly those options.
* **Changing `revenue.basis` does not restate history.** Already-posted vouchers stay as
  they are; only future postings follow the new basis. Switch at a period boundary and
  check the reconciliation report afterwards.
* `purchase.eplEnforcement` applies at PO creation only; existing POs are unaffected.

### Personal settings

* Profile updates go through the users endpoint, so the signed-in user needs
  `USERS:Edit` — worth knowing when a non-admin cannot save their own name.
* Password change requires the current password and satisfies the Identity policy
  (≥ 8 chars, a digit and an uppercase letter).
* The notifications tab is presentational; nothing is persisted.

## 5. Gotchas

* A settings change is global and immediate — the next request already follows the new
  policy. Coordinate `revenue.basis` changes with accounting.
* The settings list is small and cached under one key; always invalidate `['settings']`
  after a write.

## 6. Extension checklist

1. New system setting → backend `SettingKeys` (constant + default) **and** the validation
   table in `SettingsFeature.cs`, then a control here.
2. Read it in backend handlers via `SettingsReader.GetAsync` — never query `db.Settings`
   inline.
3. Real notification preferences would need a new backend model plus endpoints; the tab
   is a placeholder today.
