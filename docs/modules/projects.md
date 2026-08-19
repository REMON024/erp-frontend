# projects — Development & Business Flow

*Folder:* `modules/projects/` ·
*Routes:* `/projects`, `/projects/blocks`, `/estimates`, `/budget`, `/material-budget` ·
*Menu codes:* `PROJECTS`, `BLOCKS`, `COST_ESTIMATES`, `BUDGET_TRACKER`, `MATERIAL_BUDGET`

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `ProjectsPage.tsx` | `/projects` | Project cards, create/edit, budget-health banners |
| `ProjectSetupChecklist.tsx` | modal | 5-stage onboarding checklist for one project |
| `BlocksPage.tsx` | `/projects/blocks` | Blocks (buildings) inside a project |
| `CostEstimatesPage.tsx` | `/estimates` | BOQ/EPL: line items, approve, reject, import, revise |
| `BudgetTrackerPage.tsx` | `/budget` | Estimated vs actual per project; edit an item's actual |
| `MaterialBudgetPage.tsx` | `/material-budget` | Budget vs committed vs actual per material |

## 2. Development flow (architecture)

```
ProjectsPage            reads  /projects            ['projects', search, status]
                               /cost-estimates      ['projects-estimates']      → over-budget banner
                               /cost-estimates/material-budget-summary ['material-budget-summary']
                        writes POST|PUT /projects  → invalidate projects, projects-list,
                                                     project-setup-checklist
ProjectSetupChecklist   reads  /projects/{id}/setup-checklist ['project-setup-checklist', id]

BlocksPage              reads  /blocks ['blocks', search, projectId] + /projects ['projects-list']
                        writes POST|PUT /blocks → invalidate blocks, blocks-list

CostEstimatesPage       reads  /cost-estimates ['cost-estimates', search, projFilter]
                               /projects ['projects-list'], /materials ['materials-list']
                        writes POST|PUT /cost-estimates
                               POST /cost-estimates/{id}/approve | /reject | /import
                               → invalidate cost-estimates

BudgetTrackerPage       reads  /cost-estimates?projectId ['budget-estimates', projectId]
                        writes PATCH /cost-estimates/{id}/items/{itemId} { actualAmount }
                               → invalidate budget-estimates, cost-estimates

MaterialBudgetPage      reads  /cost-estimates/material-budget/{projectId}
                               ['material-budget-v2', projectId]
```

`['projects-list']` is the shared, unfiltered project dropdown key used by nearly every
other module — invalidate it whenever a project is created or renamed.

## 3. Backend contract

| Endpoint | Used by | Permission |
| --- | --- | --- |
| `GET/POST/PUT /projects` | ProjectsPage | `PROJECTS:View/Create/Edit` |
| `GET /projects/{id}/setup-checklist` | ProjectSetupChecklist | `PROJECTS:View` |
| `GET/POST/PUT /blocks` | BlocksPage | `BLOCKS:*` |
| `GET/POST/PUT/DELETE /cost-estimates` | CostEstimatesPage | `COST_ESTIMATES:*` |
| `POST /cost-estimates/{id}/approve|reject|import|revise` | CostEstimatesPage | `COST_ESTIMATES:Edit` |
| `PATCH /cost-estimates/{id}/items/{itemId}` | BudgetTrackerPage | `BUDGET_TRACKER:Edit` |
| `GET /cost-estimates/material-budget/{projectId}` | MaterialBudgetPage | `MATERIAL_BUDGET:View` |
| `GET /cost-estimates/material-budget-summary` | ProjectsPage banner | `MATERIAL_BUDGET:View` |

## 4. Business flow

```
create project ──► setup checklist ──► blocks ──► units (sales module)
                                   └──► BOQ (draft) ──► approve ──► budget baseline
                                                              │
                purchase orders ──committed──┐                │
                material issues ──actual─────┴──► material budget / budget tracker / cost variance
```

* **A BOQ only counts once approved.** Draft estimates are editable and deletable;
  approved ones are locked, feed committed/actual tracking, and can only be superseded by
  **revise** (which marks the original `Revised` and clones a new draft at version N+1).
* **Material links matter.** A BOQ line without `materialId` never appears in the
  material budget — the checklist's "BOQ created" step deliberately requires at least one
  linked line.
* **Budget health**: a material is *exceeded* when actual > budget and *at risk* when
  committed > 80 % of budget. The projects page shows the company-wide counters; the
  material budget page shows the per-material detail.
* **Engineers see less.** A user whose only granting role is `engineer` sees estimates
  for their assigned projects only (backend filter) — an empty list is expected, not a
  bug.
* The budget tracker writes actuals by hand; material issues write them automatically.
  A manual edit is overwritten the next time an issue re-apportions that line.

## 5. Gotchas

* `ProjectsPage` fetches all cost estimates just to render the over-budget banner —
  watch this if estimate volume grows.
* Import is atomic on the backend: one bad row rejects the whole file, and the error
  lists every offending row (1-based).
* Deleting an approved estimate is refused by the API; the UI should not offer it.

## 6. Extension checklist

1. New project field → `ProjectsPage` zod schema + form + card, and backend
   `ProjectDto`/`SaveProjectRequest`.
2. New checklist step → backend `GetProjectSetupChecklistQuery` (the UI renders whatever
   the API returns, grouped by `stage`).
3. New budget column → backend `MaterialBudgetV2LineDto` **and**
   `GetMaterialBudgetV2Query`, then the table in `MaterialBudgetPage`.
4. Always invalidate `['projects-list']` alongside `['projects']` after a write.
