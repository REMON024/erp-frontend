# profit-distribution — Development & Business Flow

*Folder:* `modules/profit-distribution/` · *Route:* `/investment/distribution` ·
*Menu code:* `PROFIT_DISTRIBUTION`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `ProfitDistributionPage.tsx` | `/investment/distribution` | Preview, declare and pay out a project's profit |

## 2. Development flow (architecture)

This page uses the **manual fetch** style (`useState` + `useCallback` + `useEffect`)
rather than `useApiData`, because the preview is an explicit user action rather than a
cache-keyed read:

```
ProfitDistributionPage
  load projects        GET /projects?pageSize=200
  load history         GET /profit-distribution?projectId=…        → loadDists()
  preview (on demand)  GET /profit-distribution/preview?projectId=&basis=&rounding=
  declare              POST /profit-distribution/declare  { projectId, basis, rounding,
                                                            allowOverride?, overrides? }
  payout one line      POST /profit-distribution/lines/{lineId}/payout → reload history
```

## 3. Backend contract

| Endpoint | Purpose | Permission |
| --- | --- | --- |
| `GET /profit-distribution` | Declaration history with lines | `PROFIT_DISTRIBUTION:View` |
| `GET /profit-distribution/preview` | Compute without persisting | `PROFIT_DISTRIBUTION:View` |
| `POST /profit-distribution/declare` | Persist + post the journal | `PROFIT_DISTRIBUTION:Create` |
| `POST /profit-distribution/lines/{lineId}/payout` | Mark a line paid, stamp `PV-…` | `PROFIT_DISTRIBUTION:Edit` |
| `GET /profit-distribution/roi` | Used by the investment report | `PROFIT_DISTRIBUTION:View` |

## 4. Business flow

```
pick project ──► choose basis + rounding ──► PREVIEW (nothing is written)
                                              │
                              optionally override shares (super-admin only, must total 100 %)
                                              ▼
                                          DECLARE
                     • lines snapshot each investor's share and name
                     • JV: DR 3004 Profit Distribution / CR 1001 Cash (project-tagged)
                     • Distribution = "Declared", every line = "pending"
                                              │
                                    PAYOUT per line ──► line "paid" + PV-{year}-####
                                              │
                              all lines paid ──► Distribution = "Paid"
```

### The two bases

| Basis | Profit used |
| --- | --- |
| `accounting` | `Revenue − Cost` from **posted**, project-tagged journal lines |
| `distributable` | `max(0, min(accounting profit, collected − cost))` — cash-capped, so you cannot distribute money not yet collected |

### Shares and rounding

* Share % per investor = that investor's non-reversed investments ÷ the project total.
* `Allocate` floors each amount and gives the rounding residual to one line so the lines
  sum **exactly** to the profit. The residual rule is chosen in the UI:
  `largest-share` (default), `first`, or `fractional`.

### Guards (server-enforced)

| Rule | Message |
| --- | --- |
| Project must exist | "Project not found." |
| Profit must be positive | "No positive profit available to distribute." |
| There must be investor contributions | "No investor contributions to distribute to." |
| Overrides must total 100 % | "Override shares must total 100% (got X%)." |
| A line can only be paid once | "This line has already been paid." |

## 5. Gotchas

* **Everything depends on the ledger.** If vouchers are not posted, or journal lines are
  not project-tagged, the computed profit is zero. Check the trial balance first when a
  preview looks wrong.
* Overrides are only honoured with the super-admin gate; a non-super-admin sending
  overrides gets the computed shares.
* Payout currently stamps a voucher **number** on the line but does not post a payment
  journal — the actual cash movement must be recorded as a voucher/payment.
* Declarations are immutable; there is no un-declare endpoint.

## 6. Extension checklist

1. New basis or rounding rule → backend `DistributionMath` (the command passes the
   string through) + the select options here.
2. Posting a real payout journal → `PayoutDistributionLineCommand` via
   `IAutoJournalService`.
3. If this page grows, move it onto `useApiData` with keys
   `['distributions', projectId]` / `['distribution-preview', …]` for consistency.
