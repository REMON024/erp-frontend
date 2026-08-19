# investments — Development & Business Flow

*Folder:* `modules/investments/` ·
*Routes:* `/investment/investors`, `/investment/entries`, `/investment/report` ·
*Menu codes:* `INVESTORS`, `INVESTMENTS`, `INVESTMENT_REPORTS`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `InvestorsPage.tsx` | `/investment/investors` | Investor master + total invested |
| `InvestmentsPage.tsx` | `/investment/entries` | Record capital entries; reverse an entry |
| `InvestmentReportPage.tsx` | `/investment/report` | Totals by project / investor + ROI |

## 2. Development flow (architecture)

```
InvestorsPage        reads  /investors ['investors', search]
                     writes POST|PUT /investors → invalidate investors, investors-list

InvestmentsPage      reads  /investments ['investments', investor, project, dateFrom, dateTo]
                            /investors ['investors-list'], /projects ['projects-list']
                     writes POST /investments
                            POST /investments/{id}/reverse { reason }
                            → invalidate investments

InvestmentReportPage reads  /investments/summary ['investment-summary', project, investor, from, to]
                            /profit-distribution/roi ['investor-roi']
                            /investors ['investors-list'], /projects ['projects-list']
```

## 3. Backend contract

| Endpoint | Used by | Permission |
| --- | --- | --- |
| `GET/POST/PUT /investors` | Investors, dropdowns | `INVESTORS:*` |
| `GET/POST /investments` | Entries | `INVESTMENTS:View/Create` |
| `POST /investments/{id}/reverse` | Reverse action | `INVESTMENTS:Edit` |
| `GET /investments/summary` | Report | `INVESTMENT_REPORTS:View` |
| `GET /profit-distribution/roi` | Report (ROI tab) | `PROFIT_DISTRIBUTION:View` |

## 4. Business flow

```
investor (Active) ──► INVESTMENT entry ──► RV voucher: DR Cash/Bank · CR 3003 Investor Capital
                              │
                              └── reverse (reason required) ──► JV voucher: DR 3003 · CR Cash/Bank
                                        the row stays, flagged IsReversed

non-reversed totals ──► contribution share % per project ──► profit distribution + ROI
```

| Rule (server-enforced) | UI consequence |
| --- | --- |
| Investor must be `Active` | Filter inactive investors out of the picker |
| Project must exist; amount > 0 | Standard validation |
| Reversal requires a reason | The reverse dialog demands the text |
| An entry can only be reversed once | The action disappears for reversed rows |

**Reversal is not deletion.** The original entry and its voucher stay visible; every
total, share calculation and reconciliation check filters on `!isReversed`. That is why
the entries list shows reversed rows in a muted style rather than hiding them.

Reversing after a distribution has been declared does **not** change that distribution —
distribution lines snapshot the share at declaration time.

## 5. Gotchas

* Payment mode (`Cash`) decides whether the debit lands in Cash (`1001`) or Bank
  (`1002`) — it is not cosmetic.
* The ROI view is served by the profit-distribution controller, so a user needs
  `PROFIT_DISTRIBUTION:View` for that tab even though it lives on the investment report.
* An investor's "total invested" is computed per request; it is not stored.

## 6. Extension checklist

1. New investor/entry field → backend DTO + request record, then the form and table.
2. New summary dimension → backend `GetInvestmentSummaryQuery` + the report tabs.
3. Keep every aggregate filtered on `!isReversed`.
