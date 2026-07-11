# Auth Contract

Complete specification of the frontend ↔ backend authentication contract for
the Construction ERP.

---

## Base URL

```
NEXT_PUBLIC_API_URL (default: http://localhost:5235/api)
```

All endpoints below are relative to `/auth`.

---

## Endpoints

### 1. Login

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth/login` |
| **Auth required** | No |

**Request body**

```json
{
  "email":    "user@example.com",
  "password": "s3cr3t"
}
```

**Success — 200 OK**

```json
{
  "user": {
    "id":          "uuid",
    "firstName":   "Alice",
    "lastName":    "Smith",
    "fullName":    "Alice Smith",
    "email":       "user@example.com",
    "role":        "super_admin",
    "roleId":      "uuid",
    "roles":       ["super_admin"],
    "roleIds":     ["uuid"],
    "isActive":    true,
    "createdAt":   "2024-01-01T00:00:00Z"
  },
  "accessToken":  "eyJ...",
  "refreshToken": "eyJ..."
}
```

> The frontend also handles a legacy shape where the token field is named `token`
> instead of `accessToken`, and where the user object is the root (no `user` key).

**Error responses**

| Status | Meaning |
|--------|---------|
| 400 | Validation error (missing fields) |
| 401 | Invalid credentials |

---

### 2. Refresh Token

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth/refresh` |
| **Auth required** | No (uses refresh token) |

**Request body**

```json
{ "refreshToken": "eyJ..." }
```

**Success — 200 OK**

```json
{
  "accessToken":  "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

### 3. Change Password

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth/change-password` |
| **Auth required** | Yes (access token required in Authorization header) |

**Request body**

```json
{
  "currentPassword": "old_password",
  "newPassword":     "new_password"
}
```

**Success — 200 OK** (empty body or `{ "message": "Password changed successfully" }`)

**Error responses**

| Status | Meaning |
|--------|---------|
| 400 | Validation error or current password incorrect |
| 401 | Not authenticated |

---

### 4. Forgot Password

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth/forgot-password` |
| **Auth required** | No |

**Request body**

```json
{ "email": "user@example.com" }
```

**Success — 200 OK**

```json
{ "message": "If an account exists for that email, a reset link has been sent." }
```

> The response is intentionally ambiguous — it does not reveal whether an
> account with the given email exists.

**Not-supported — 501 Not Implemented** *(or 404)*

When the backend has not implemented the forgot-password flow, it returns a
`501` (or `404`) response. The frontend displays a user-safe message:

> *"Automated password reset is not currently available. Please contact your system
> administrator to reset your password."*

**Error responses**

| Status | Meaning |
|--------|---------|
| 400 | Validation error (invalid email format) |
| 501 | Feature not implemented on this deployment |

---

### 5. Reset Password

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth/reset-password` |
| **Auth required** | No (authenticated by one-time token from email link) |

The user arrives at `/reset-password?token=<token>` by clicking the link
emailed to them by the forgot-password flow.

**Request body**

```json
{
  "token":       "<one-time-token from URL query string>",
  "newPassword": "new_password"
}
```

**Success — 200 OK** (empty body or `{ "message": "Password reset successfully." }`)

**Error responses**

| Status | Meaning |
|--------|---------|
| 400 | Token invalid, expired, or new password too weak |
| 404 | Token not found |

---

## Error Envelope

All error responses follow a consistent shape:

```json
{
  "title":   "Validation Failed",
  "message": "Human-readable summary",
  "errors":  ["Field-level or operation-level detail"]
}
```

The frontend reads errors in priority order: `errors[0]` → `message` → `title`
→ generic fallback.

---

## Frontend Behavior Summary

| Scenario | Frontend action |
|----------|----------------|
| Login 401 | Show "Invalid email or password." |
| Login other error | Show first `errors[]` / `message` / `title` |
| Any authenticated request 401 | Clear session → redirect to `/login` |
| Forgot-password 200 | Show "Check your email" success panel |
| Forgot-password 501/404 | Show "Self-service reset unavailable — contact admin" |
| Forgot-password other error | Show extracted error message |
| Reset-password missing token | Show "Invalid reset link" with link to `/forgot-password` |
| Reset-password 200 | Show "Password reset" success panel → redirect to `/login` |
| Reset-password error | Show extracted error message |
| Change-password 200 | Show "Password changed successfully" in settings |
| Change-password error | Show extracted error message |

---

## Frontend Routes

| Route | Component |
|-------|-----------|
| `/login` | `LoginForm` |
| `/forgot-password` | `ForgotPasswordForm` |
| `/reset-password?token=<token>` | `ResetPasswordForm` |
| `/settings` → "Change Password" tab | `SettingsPage` → password form |
