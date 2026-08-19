# accounting — Development & Business Flow

*Folder:* `modules/accounting/` ·
*Routes:* `/accounting`, `/accounting/vouchers`, `/accounting/ledger`, `/accounting/pl`,
`/accounting/fiscal-years`, `/reports/trial-balance` ·
*Menu codes:* `CHART_OF_ACCOUNTS`, `VOUCHERS`, `PROJECT_LEDGER`, `PROFIT_LOSS`, `FISCAL_YEARS`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `ChartOfAccountsPage.tsx` | `/accounting` | Account tree: type, level, opening balance, posting vs header |
| `VouchersPage.tsx` | `/accounting/vouchers` | Manual journal entries; balanced multi-line grid; post |
| `ProjectLedgerPage.tsx` | `/accounting/ledger` | One account's posted movements with a running balance |
| `ProfitLossPage.tsx` | `/accounting/pl` | Revenue vs expense → net profit |
| `TrialBalancePage.tsx` | `/reports/trial-balance` | Trial balance + reconciliation banner |
| `FiscalYearsPage.tsx` | `/accounting/fiscal-years` | Define and close accounting periods |

`TrialBalancePage` lives in this module but is mounted under `/reports` — it is the
accounting/reporting bridge.

## 2. Development flow (architecture)

```
ChartOfAccountsPage reads  /accounts ['accounts', search, type]
                    writes POST|PUT /accounts → invalidate accounts, accounts-list

VouchersPage        reads  /vouchers ['vouchers', search, type, status]
                           /accounts ['accounts-list'], /projects ['projects-list']
                    writes POST /vouchers, POST /vouchers/{id}/post → invalidate vouchers

ProjectLedgerPage   reads  /accounts ['accounts-list']
                           /reports/ledger?accountId ['ledger', accountId]

ProfitLossPage      reads  /reports/profit-loss ['report-pl']

TrialBalancePage    reads  /reports/trial-balance ['report-tb']
                           /reports/reconciliation ['report-recon']

FiscalYearsPage     reads  /fiscal-years ['fiscal-years']
                    writes POST /fiscal-years, POST /fiscal-years/{id}/close
                           → invalidate fiscal-years
```

The chart of accounts is returned flat; the page builds the tree from `parentAccountId`.

## 3. Backend contract

| Endpoint | Used by | Permission |
| --- | --- | --- |
| `GET/POST/PUT /accounts` | Chart of accounts, voucher form | `CHART_OF_ACCOUNTS:*` |
| `GET/POST /vouchers`, `POST /vouchers/{id}/post` | Vouchers | `VOUCHERS:*` |
| `GET /reports/ledger?accountId=` | Ledger | `PROJECT_LEDGER:View` |
| `GET /reports/profit-loss`, `/trial-balance`, `/reconciliation`, `/balance-sheet` | P&L, TB | `PROFIT_LOSS:View` |
| `GET/POST /fiscal-years`, `POST /fiscal-years/{id}/close` | Fiscal years | `FISCAL_YEARS:*` |

## 4. Business flow

```
operational modules ──auto-posted vouchers──┐
manual entry (VouchersPage) Draft ──post──► │──► POSTED JOURNAL ──► Ledger
                                            │                     ├─► Trial balance (+ reconciliation)
                                            │                     ├─► Profit & loss / balance sheet
                                            │                     └─► project profit → distributions
FiscalYear gates everything: no OPEN year ⇒ no automatic posting at all
```

Manual voucher rules (server-enforced, mirrored by the form):

| Rule | Message |
| --- | --- |
| ≥ 2 lines | "A voucher needs at least two lines." |
| Total debit > 0 and debits = credits | "Voucher not balanced. Debit X != Credit Y." |
| Only posting (leaf) accounts | names the group-header accounts used |
| `PV` must credit Cash/Bank; `RV` must debit Cash/Bank | explicit message per type |
| Voucher date must fall inside an open fiscal year | "No open fiscal year covers…" / "Cannot post to a closed fiscal year." |

Other things to know:

* **Only posted entries appear in reports.** A draft voucher affects nothing until
  `POST /vouchers/{id}/post` (which re-checks the balance).
* **Automatic vouchers arrive already posted** (`Status = Approved`, `ApprovedBy =
  "System (Auto)"`) — collections, invoices, stock movements, bills, investments and
  distributions all create them.
* **System accounts cannot be edited** and the seeded codes (1001, 1002, 1004…) are what
  automation resolves by code — renaming or removing one silently stops those postings.
* **The reconciliation banner** cross-checks module totals against their control accounts
  and reports a difference per check; it is the first place to look when a number
  disagrees with an operational page.
* Closing a fiscal year is **not reversible** through the API.

## 5. Gotchas

* If the ledger looks empty while operations are happening, check that an **open fiscal
  year** exists and that the chart of accounts contains the seeded codes — the
  auto-journal service skips posting silently in both cases.
* Changing `revenue.basis` mid-period does not restate posted vouchers.
* Ledger/P&L/TB pages have no filters beyond the account selector; date-range reporting
  would need new backend queries.

## 6. Extension checklist

1. New voucher type → backend type guards in `CreateVoucherCommand` + the type options
   in `VouchersPage`.
2. New account field → backend `AccountDto`/`SaveAccountRequest` + the form and tree row.
3. New statement (e.g. cash-flow) → backend `AccountingReports` query + a page here.
4. New well-known account → backend `AccountCodes` **and** the seeder, or postings that
   reference it are skipped.
