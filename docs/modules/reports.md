# reports — Development & Business Flow

*Folder:* `modules/reports/` ·
*Routes:* `/reports`, `/reports/ar-aging`, `/reports/collection-pipeline`,
`/reports/material-consumption`, `/reports/work-order-progress`,
`/reports/work-order-materials`, `/reports/cost-variance`
(`/reports/trial-balance` is served by `modules/accounting/TrialBalancePage`) ·
*Menu codes:* `REPORTS`, `AR_AGING`, `COLLECTION_PIPELINE`, `MATERIAL_CONSUMPTION`,
`WORK_ORDER_PROGRESS`, `COST_VARIANCE`, `TRIAL_BALANCE`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `ReportsPage.tsx` | `/reports` | Tabbed hub built **client-side** from raw list endpoints |
| `ArAgingPage.tsx` | `/reports/ar-aging` | Outstanding invoices by overdue bucket |
| `CollectionPipelinePage.tsx` | `/reports/collection-pipeline` | Per-booking collected vs outstanding |
| `MaterialConsumptionPage.tsx` | `/reports/material-consumption` | Received vs issued per material |
| `WorkOrderProgressPage.tsx` | `/reports/work-order-progress` | Billed / paid / retention per work order |
| `WorkOrderMaterialBudgetPage.tsx` | `/reports/work-order-materials` | Budget vs received per work-order line |
| `CostVariancePage.tsx` | `/reports/cost-variance` | Estimated vs actual by category |

## 2. Development flow (architecture)

Two distinct shapes live in this folder:

```
A. Server-computed reports (one query each, filters in the URL)
   ArAgingPage                 /reports/ar-aging?asOfDate            ['ar-aging', asOfDate, submitted]
   CollectionPipelinePage      /reports/collection-pipeline?projectId ['collection-pipeline', projectId]
   MaterialConsumptionPage     /reports/material-consumption?projectId&dateFrom&dateTo
                                                                     ['material-consumption', …]
   WorkOrderProgressPage       /reports/work-order-progress?projectId ['work-order-progress'…]
   WorkOrderMaterialBudgetPage /reports/work-order-material-budget?projectId&workOrderId
   CostVariancePage            /reports/cost-variance?projectId       ['cost-variance', projectId]
   (each also reads /projects ['projects-list'] for its filter)

B. Client-computed hub (ReportsPage)
   reads /projects ['rep-projects'], /invoices ['rep-invoices' | 'rep-inv-sales'],
         /customers ['rep-customers'], /purchase-orders ['rep-pos'], /vendors,
         /materials ['rep-mats'], /stock-transactions?type=In|Out ['rep-tx-in'|'rep-tx-out']
   then aggregates in the browser, per tab
```

All pages are read-only; printing uses `utils/printUtils.ts`.

## 3. Backend contract

| Endpoint | Page | Permission |
| --- | --- | --- |
| `GET /reports/ar-aging` | AR aging | `REPORTS:View` |
| `GET /reports/collection-pipeline` | Collection pipeline | `REPORTS:View` |
| `GET /reports/material-consumption` | Material consumption | `REPORTS:View` |
| `GET /reports/work-order-progress` | WO progress | `REPORTS:View` |
| `GET /reports/work-order-material-budget` | WO material budget | `REPORTS:View` |
| `GET /reports/cost-variance` | Cost variance | `REPORTS:View` |
| `GET /reports/trial-balance`, `/reconciliation` | Trial balance page | `PROFIT_LOSS:View` |
| List endpoints (`/projects`, `/invoices`, …) | Reports hub | each module's `View` |

## 4. Business flow

| Report | Definition (as computed by the API) |
| --- | --- |
| AR aging | Outstanding invoices bucketed `Current / 1-30 / 31-60 / 61-90 / 90+` days past due, optional as-of date |
| Collection pipeline | Active bookings: net amount vs collected vs outstanding, paid and overdue installment counts |
| Material consumption | Per material: received (`In`), issued (`Out`), balance and issued value, with project/date filters |
| Work-order progress | Contract vs billed (approved + paid bills) vs paid, retention held, advance given/recovered, % billed |
| Work-order material budget | Per budget line: budgeted qty/amount vs received qty |
| Cost variance | Approved BOQ estimated vs actual by category, variance amount and % |
| Trial balance | Posted journal lines per account; totals must match, plus module-vs-ledger reconciliation checks |

**Ledger-based vs operational.** Trial balance, P&L and reconciliation read only
**posted** vouchers; every other report reads operational tables directly and therefore
shows activity immediately. When the two disagree, the reconciliation banner is the
diagnostic.

## 5. Gotchas

* The hub (`/reports`) pulls several unpaginated lists and aggregates in the browser. It
  is the least scalable page in the app — move a tab to a backend query once its dataset
  grows.
* Each report is permission-guarded by `REPORTS:View` (not by the module it reports on),
  so granting reports access exposes cross-module figures. Grant deliberately.
* `ArAgingPage` keys its query on a `submitted` flag so changing the as-of date does not
  refetch until the user applies it.

## 6. Extension checklist

1. New server report → backend `AccountingReports` query + controller action, then a page
   here reading it with a stable `queryKey`.
2. Reuse `['projects-list']` for project filters — do not create a second projects key.
3. Printing → `utils/printUtils.ts`; keep the shared stylesheet so exports look uniform.
