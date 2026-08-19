# inventory — Development & Business Flow

*Folder:* `modules/inventory/` ·
*Routes:* `/inventory`, `/inventory/materials`, `/inventory/warehouses`,
`/inventory/stock-in`, `/inventory/issue`, `/inventory/transfer`, `/inventory/levels` ·
*Menu codes:* `MATERIAL_MASTER`, `WAREHOUSES`, `STOCK_IN`, `ISSUE_TO_PROJECT`,
`STOCK_TRANSFER`, `STOCK_LEVELS`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `MaterialMasterPage.tsx` | `/inventory/materials` | Material catalogue + substitution rules |
| `WarehousesPage.tsx` | `/inventory/warehouses` | Storage locations |
| `StockInPage.tsx` | `/inventory/stock-in` | Receive stock (against a work order) |
| `IssueToProjectPage.tsx` | `/inventory/issue` | Issue stock to a project (consumption) |
| `StockTransferPage.tsx` | `/inventory/transfer` | Move stock between warehouses |
| `StockLevelsPage.tsx` | `/inventory` | Company stock per material + low-stock alerts |
| `WarehouseStockLevelsPage.tsx` | `/inventory/levels` | Per-warehouse balances + roll-up |

## 2. Development flow (architecture)

```
MaterialMasterPage  reads  /materials ['materials', search]
                           /material-substitutions ['material-substitutions']
                    writes POST|PUT /materials, POST|DELETE /material-substitutions
                           → invalidate materials, materials-list, material-substitutions

WarehousesPage      reads  /warehouses ['warehouses']
                    writes POST|PUT /warehouses → invalidate warehouses, warehouses-list

StockInPage         reads  /stock-transactions ['stock-in']
                           /materials ['materials-list'], /warehouses?activeOnly ['warehouses-list'],
                           /work-orders ['work-orders-list']
                    writes POST /stock-transactions/in
                           → invalidate stock-in, materials, materials-list

IssueToProjectPage  reads  /stock-transactions ['stock-out']
                           /projects ['projects-list'], /warehouses?activeOnly ['warehouses-list']
                           /stock-transactions/balances ['issue-wh-balances', warehouseId]
                           /cost-estimates/material-budget/{projectId} ['material-budget-v2', projectId]
                    writes POST /stock-transactions/issue
                           → invalidate stock-out, materials, materials-list,
                             cost-estimates, material-budget-v2, material-budget-summary,
                             project-setup-checklist

StockTransferPage   reads  /materials ['materials-list'], /warehouses ['warehouses-list']
                    writes POST /stock-transactions/transfer → invalidate stock-balances

StockLevelsPage           reads /materials ['materials', 'levels', filter]
WarehouseStockLevelsPage  reads /stock-transactions/balances ['stock-balances', warehouseId]
                                /warehouses ['warehouses-list']
```

Note the two different balance views: `StockLevelsPage` reads the **cached company total**
on the material (`Material.CurrentStock`), while `WarehouseStockLevelsPage` reads the
**derived per-warehouse balances** replayed from the movement ledger.

## 3. Backend contract

| Endpoint | Used by | Permission |
| --- | --- | --- |
| `GET/POST/PUT /materials` | Material master, dropdowns | `MATERIAL_MASTER:*` |
| `GET/POST/DELETE /material-substitutions` | Material master | `MATERIAL_MASTER:View/Create/Delete` |
| `GET/POST/PUT /warehouses` | Warehouses, dropdowns | `MATERIAL_MASTER:*` |
| `GET /stock-transactions` | Stock in / issue lists | `MATERIAL_MASTER:View` |
| `POST /stock-transactions/in` | Stock in | `STOCK_IN:Create` |
| `POST /stock-transactions/issue` | Issue | `ISSUE_TO_PROJECT:Create` |
| `POST /stock-transactions/transfer` | Transfer | `ISSUE_TO_PROJECT:Create` |
| `GET /stock-transactions/balances` | Levels, issue guard | `MATERIAL_MASTER:View` |

## 4. Business flow

```
                       ┌── PO line (optional) ── reconciles ReceivedQty, may close the PO
STOCK IN (requires a work order + a budgeted material line on it)
   → +qty, weighted-average cost recalculated
   → DR Materials Inventory / CR Vendor Payable
                       │
TRANSFER  warehouse A → warehouse B      (no ledger, no company-total change)
                       │
ISSUE to project (availability checked per warehouse, else company-wide)
   → −qty valued at average cost
   → DR Construction WIP (project) / CR Materials Inventory
   → BOQ actuals re-apportioned (substitutes count toward the original material)
```

| Rule (server-enforced) | Consequence for the UI |
| --- | --- |
| Stock-in **requires** a work order, the material must be budgeted on it and not already fully received | The work-order select is mandatory; expect refusals when the budget line is exhausted |
| Cannot receive an `Inactive` material | Filter inactive materials out of the receive form |
| Received qty ≤ pending PO qty | Show pending qty per line |
| Issue is blocked when the source warehouse (or the company) lacks stock | The page pre-loads balances to warn before submitting |
| Transfer: `from ≠ to`, source must have the qty, both warehouses active | Disable same-warehouse selections |

Low stock is `CurrentStock <= MinimumStock` — it drives the alerts on the levels pages
and the dashboard counter.

## 5. Gotchas

* Issuing is the single biggest cross-module write: it changes stock, the ledger, BOQ
  actuals, the material budget and the project checklist. `IssueToProjectPage` therefore
  invalidates seven keys — keep that list current when adding dependent views.
* Transfers deliberately do **not** change `Material.CurrentStock`; only per-warehouse
  balances move. A page that mixes the two numbers will look inconsistent.
* Movements without a warehouse roll up under an "Unassigned" bucket in the balances API.

## 6. Extension checklist

1. New movement field → backend request record + `StockCommandValidators`, then the form.
2. New movement **type** → backend `StockBalance.AvailableAsync` must handle it, or it
   will not affect balances.
3. Any new page that shows stock must decide explicitly: cached company total
   (`/materials`) or derived per-warehouse (`/stock-transactions/balances`).
