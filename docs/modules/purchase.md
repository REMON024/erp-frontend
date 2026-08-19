# purchase — Development & Business Flow

*Folder:* `modules/purchase/` ·
*Routes:* `/purchase`, `/purchase/vendors`, `/purchase/grn` ·
*Menu codes:* `PURCHASE`, `VENDORS`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `PurchasePage.tsx` | `/purchase` | Purchase orders: multi-line create, EPL matching, approve |
| `VendorsPage.tsx` | `/purchase/vendors` | Supplier/contractor master |
| `VendorHistoryModal.tsx` | modal | One vendor's POs and payments |
| `GrnPage.tsx` | `/purchase/grn` | Goods receipt against an approved PO |

## 2. Development flow (architecture)

```
PurchasePage   reads  /purchase-orders ['purchase-orders', search, status]
                      /vendors ['vendors-list'], /materials ['materials-list'],
                      /projects ['projects-list']
                      /cost-estimates?projectId&status=Approved ['approved-epls', projectId]
                      /cost-estimates/material-budget/{projectId} ['material-budget-v2', projectId]
               writes POST /purchase-orders
                      POST /purchase-orders/{id}/approve
                      → invalidate purchase-orders, pos-list,
                        material-budget-v2, material-budget-summary

VendorsPage    reads  /vendors ['vendors', search, type]
               writes POST|PUT /vendors → invalidate vendors, vendors-list
VendorHistoryModal reads /vendors/{id}/history ['vendor-history', vendorId]

GrnPage        reads  /grn ['grn', search]          ← no backend endpoint (see Gotchas)
                      /purchase-orders ['pos-list']
               writes POST /grn                      ← no backend endpoint
                      → invalidate grn, pos-list, purchase-orders, materials,
                        materials-list, stock-transactions
```

The PO form is the most logic-heavy screen in the module: selecting a project loads that
project's **approved EPL lines** and its **material budget**, so each PO line can be
matched to a budget line, and an unmatched line can carry a reason.

## 3. Backend contract

| Endpoint | Used by | Permission |
| --- | --- | --- |
| `GET/POST /purchase-orders`, `POST /purchase-orders/{id}/approve` | PurchasePage | `PURCHASE:*` |
| `GET/POST/PUT /vendors`, `GET /vendors/{id}/history` | Vendors | `VENDORS:*` |
| `GET /cost-estimates?projectId&status=Approved` | PO line matching | `COST_ESTIMATES:View` |
| `GET /cost-estimates/material-budget/{projectId}` | PO budget check | `MATERIAL_BUDGET:View` |
| `POST /stock-transactions/in` | **the real receiving path** | `STOCK_IN:Create` |

## 4. Business flow

```
vendor master ──► PURCHASE ORDER (Draft) ──approve──► Approved ──receive──► Received
                        │                                │                    │
                        │ lines matched to approved EPL  │ committed cost     │ stock + vendor payable
                        └── unmatched → reason (warn) or rejected (block)
```

| Rule (server-enforced) | Effect in the UI |
| --- | --- |
| At least one line; vendor must exist | Form validation mirrors it |
| Delivery date ≥ PO date | Date fields validated |
| No `Inactive` material on any line | The error names every offending material |
| `purchase.eplEnforcement = warn` | Unmatched line accepted **with a reason** |
| `purchase.eplEnforcement = block` | The whole PO is rejected until every line links to an approved EPL item |
| Only a `Draft` PO can be approved | Approve button hidden for other statuses |
| Amounts computed server-side | Client totals are display-only |

Once approved, the PO's lines count as **committed cost** in the material budget (and at
> 80 % of a material's budget they push it into "at risk").

## 5. Gotchas

* **GRN has no backend.** `GrnPage` reads `GET /grn` and posts `POST /grn`; neither
  exists in the API. Receiving is implemented at `POST /stock-transactions/in`
  (`modules/inventory/StockInPage.tsx`), which also requires a **work order** and
  reconciles the PO line. Either port the GRN page onto that endpoint or add a `/grn`
  feature to the backend.
* Receiving through stock-in is what flips the PO to `Received`, updates
  `Material.CurrentStock` and the weighted-average cost, and posts
  `DR Materials Inventory / CR Vendor Payable`.
* Vendor **type** is filtered in the UI only — the API accepts any vendor on a PO.

## 6. Extension checklist

1. New PO line field → backend `PoItemRequest`/`PoItemDto`, then the line grid in
   `PurchasePage.tsx`.
2. New enforcement policy → backend `SettingKeys` + `SettingsFeature`, surfaced in
   `modules/settings/SystemSettingsPage.tsx`, then respected here.
3. After any PO write, invalidate `material-budget-v2` and `material-budget-summary` —
   committed cost changes immediately.
