# ERP Frontend — Design Guidelines

The single source of truth for how the `erp-frontend` UI looks and is built.
Design tokens live in [`app/globals.css`](app/globals.css); shared primitives live in
[`components/ui/`](components/ui). **Follow these rules on every new page and PR.**

Stack: Next.js 16 (App Router) · React 19 · TypeScript · **Tailwind CSS v4** (CSS-first,
no `tailwind.config.js`). Dark mode is class-based (`.dark` on `<html>`, toggled by
`store/theme.store`).

---

## 1. Color — always use tokens, never raw palette

Every color comes from a semantic token defined in `globals.css` and exposed as a Tailwind
utility. **Never** use raw Tailwind palette classes (`bg-red-50`, `text-green-600`,
`bg-blue-500`) or hex literals in JSX — they do not adapt to dark mode and cause drift.

| Purpose            | Token utility                                  | Notes                          |
| ------------------ | ---------------------------------------------- | ------------------------------ |
| Brand / primary    | `bg-primary` `text-primary`                    | buttons, links, active state   |
| Secondary accent   | `bg-secondary` `text-secondary`                |                                |
| Success            | `bg-success` `text-success`                    | paid, active, positive         |
| Warning            | `bg-warning` `text-warning`                    | pending, partial               |
| Danger / error     | `bg-danger` `text-danger`                      | overdue, failed, delete        |
| Info               | `bg-info` `text-info`                          | new, informational             |
| Page background    | `bg-bg`                                         | set on `<body>`                |
| Card / panel       | `bg-surface`                                   | cards, tables, modals          |
| Muted surface      | `bg-surface-muted`                             | table headers, hover, chips    |
| Text               | `text-content`                                 | primary text                   |
| Muted text         | `text-content-muted`                           | labels, captions, placeholders |
| Border             | `border-border-default`                        | all borders & dividers         |

**Tinted backgrounds** (e.g. error banners, status chips): use token + alpha, matching
`Badge` tones — `bg-danger/10`, `bg-success/10`, `bg-warning/15`, `bg-primary/10`.

```jsx
// ✅ Do
<p className="text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>
<div className="bg-surface border border-border-default text-content-muted">…</div>

// ❌ Don't
<p className="text-red-600 bg-red-50 border border-red-200">{err}</p>
<div className="bg-white border-gray-200 text-gray-500">…</div>
```

Palette → token quick map: `green→success`, `red→danger`, `orange/yellow→warning`,
`blue→info`/`primary`, `gray→content-muted`/`surface-muted`/`border-default`.

**Chart colors:** don't hardcode hex. Read the CSS variables (`rgb(var(--primary))`, etc.)
or a shared color const so charts follow the theme.

---

## 2. Typography

- Font: `font-sans` (Inter) — set globally, no per-element font needed.
- Page title: `text-2xl font-bold text-content` (use `PageHeader`).
- Section heading: `font-semibold text-content`.
- Body: `text-sm text-content`.
- Label / caption: `text-sm font-medium text-content` or `text-xs text-content-muted`.
- KPI value: `text-2xl font-bold`.
- Codes / IDs: `text-xs font-mono text-content-muted`.

## 3. Spacing, radius, elevation

- Vertical page rhythm: `space-y-6`. Grid gaps: `gap-4` (cards), `gap-6` (panels).
- Radius: `rounded-lg` (inputs, buttons), `rounded-xl` (cards/panels), `rounded-full` (chips/avatars).
- Card padding: `p-4`–`p-5`. Input padding: `px-3 py-2`. Button padding via `Button` `size`.
- Elevation: prefer `border border-border-default` over shadows; `shadow-lg` only for popovers/menus.

---

## 4. Use the shared primitives — don't re-roll

| Need                     | Use                                              |
| ------------------------ | ------------------------------------------------ |
| Button                   | `components/ui/Button` (`variant`, `size`, `loading`, `leftIcon`) |
| Text input               | `components/ui/Input` + `Label` / `Field`        |
| Table                    | `components/ui/Table` (`Table`/`TH`/`TR`/`TD`)    |
| Card / KPI card          | `components/ui/Card` (`Card`, `StatCard`)         |
| Status pill              | `components/ui/Badge` + `statusTone(status)` — never inline pills |
| Modal / drawer           | `components/ui/Modal`, `Drawer`                   |
| Page title + action      | `components/ui/PageHeader`                         |
| Dropdown                 | `components/ui/Select`                             |
| Loading/error/empty      | `components/ui/DataState`                          |

```jsx
// Status pills — one way only
<Badge tone={statusTone(row.status)}>{row.status}</Badge>
```

### Table alignment

- **Left-align** text columns: names, labels, codes, dates, status.
- **Right-align** numeric columns: money (`৳`), quantities, rates, percentages, counts.
- A header's alignment **must match** its column's cell alignment.
- Right-aligned columns are numeric → use `tabular-nums` so digits line up. The `TH`/`TD`
  `align="right"` (or `num`) prop applies both automatically.
- Actions column: right-aligned or centered, with an empty header.

```jsx
// ✅ Do — header + cell both right, digits aligned
<TH num>Amount</TH> …
<TD num>{fmt(row.totalAmount)}</TD>

// ❌ Don't — money left-aligned under a left header
<TD>{fmt(row.totalAmount)}</TD>
```

---

## 5. Dark mode

Class-based (`.dark`). Because all colors use tokens, dark mode "just works" — the same
utility resolves to the right value in each theme. **Any raw palette class breaks this.**
Verify new screens by toggling the theme in the Topbar.

## 6. Accessibility

- Icon-only buttons **must** have an `aria-label` (see `Topbar.tsx`).
- Keep focus rings: `focus:ring-2 focus:ring-primary/40` (built into `Button`/`Input`).
- Never convey status by color alone — pair with text (as `Badge` does).
- Tables scroll horizontally on small screens (`Table` handles this); modals become bottom sheets.
