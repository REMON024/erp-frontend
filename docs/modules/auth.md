# auth — Development & Business Flow

*Folder:* `modules/auth/` · *Routes:* `/login`, `/forgot-password` (route group `app/(auth)`)

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `LoginForm.tsx` | `/login` | Email + password sign-in |
| `ForgotPasswordForm.tsx` | `/forgot-password` | Requests a password reset for an email |

The `(auth)` route group has **no** dashboard shell and no route guard — these are the
only pages reachable without a token.

## 2. Development flow (architecture)

```
app/(auth)/login/page.tsx ──► modules/auth/LoginForm.tsx
   react-hook-form + zod (email, password)
   POST /auth/login  via lib/api.ts
        ↓ 200 { accessToken, refreshToken, expiresAt, user }
   useAuthStore.setAuth(user, accessToken)
        • localStorage.erp_token / erp_user
        • document.cookie erp_token=… (SameSite=Lax)
        • state: isAuthenticated = true, menusLoaded = false
   router.replace('/dashboard')
        ↓
app/(dashboard)/layout.tsx → DashboardLayout
   loadMenus() → GET /menus/my-menus → sidebar + route guard
```

Token plumbing lives outside this module:

| Concern | File |
| --- | --- |
| Attaching `Authorization: Bearer` | `lib/api.ts` request interceptor |
| Global 401 handling (clear + redirect to `/login`) | `lib/api.ts` response interceptor |
| Session state, hydration flag, menu-based access | `store/auth.store.ts` |

## 3. Backend contract

| Call | Endpoint | Notes |
| --- | --- | --- |
| Login | `POST /auth/login` | Anonymous; returns `AuthTokens` + user with `roles[]`/`roleIds[]` |
| Forgot password | `POST /auth/forgot-password` | **No backend endpoint exists** — the request will fail |
| Session bootstrap | `GET /menus/my-menus` | Called by `DashboardLayout`, not by this module |

## 4. Business flow

```
enter credentials ──► POST /auth/login
   ok      → store token + user → /dashboard → menus load → sidebar renders
   400     → show errors[0] ("Invalid credentials.")
```

* The backend returns the **same** message for an unknown email, a wrong password and a
  deactivated account — do not try to distinguish them in the UI.
* `_hasHydrated` guards the first paint: `app/(dashboard)/layout.tsx` renders nothing
  until zustand's `persist` has rehydrated, so a logged-in user is never bounced to
  `/login` on a refresh.
* Only `user`, `token` and `isAuthenticated` are persisted (`partialize`); menus are
  re-fetched every session so permission changes take effect on next login.
* Logout (`Topbar`) clears storage, the cookie and the menu state.

## 5. Gotchas

* Forgot-password is UI-only today. Implement `POST /api/auth/forgot-password` on the
  backend (command + email sender) before advertising it.
* Refresh tokens are returned by login but the frontend does not currently rotate them —
  an expired access token results in a 401 and a redirect to `/login`.
* The cookie is written for potential middleware use; there is no `middleware.ts` in the
  project, so it is currently informational.

## 6. Extension checklist

1. New auth screen → component in `modules/auth/`, route under `app/(auth)/`.
2. New field on the session user → `types/index.ts` `User` **and** the backend `UserDto`.
3. Anything that must survive a reload goes in `auth.store.ts` `partialize`.
