# tasks — Development & Business Flow

*Folder:* `modules/tasks/` · *Route:* `/tasks` · *Menu code:* not in `MenuCodes`

> **Status: front-end only.** This page calls `/tasks`, which **does not exist** in the
> ConstructERP API. Every request fails until a backend feature is built.

## 1. Pages

| File | Route | Purpose |
| --- | --- | --- |
| `TasksPage.tsx` | `/tasks` | Kanban board: Pending → In Progress → Review → Done |

## 2. Development flow (architecture)

Manual fetch style, with drag-and-drop columns:

```
TasksPage
  load    GET  /tasks?project_id=…        → Task[]  (types/index.ts: Task, TaskStatus, TaskPriority)
  create  POST /tasks                     { title, description, project, assignee, priority, dates }
  move    PUT  /tasks/{id}                { status }   ← called on drop between columns
  form    react-hook-form + zod
  columns pending | in_progress | review | done, each with its own colour tokens
```

Note the **snake_case** parameters (`project_id`) and snake_case-ish task fields — this
page was written against a different API shape from the rest of the app, which uses
camelCase query parameters.

## 3. Backend contract

| Call | Endpoint | Exists? |
| --- | --- | --- |
| List | `GET /tasks` | ❌ no controller |
| Create | `POST /tasks` | ❌ |
| Update status | `PUT /tasks/{id}` | ❌ |

## 4. Business flow (intended)

```
create task (project, assignee, priority, due date)
   └─► Pending ──► In Progress ──► Review ──► Done      (drag between columns)
priority: low | medium | high | critical  → colour-coded badges
```

There is no link to any accounting or inventory flow — tasks are a coordination tool, not
a financial record.

## 5. Gotchas

* The page renders its error state on every load until `/tasks` exists.
* `/tasks` has no `MenuCodes` constant, so there is no permission code to grant. Reaching
  the route also requires a `Menu` row whose `route` is `/tasks` (otherwise the client
  guard redirects to `/dashboard`).
* `DashboardLayout` prefetches `/tasks` in its `PREFETCH_ROUTES` list — that is only a
  router prefetch, not a data call.

## 6. Extension checklist — making it real

1. Backend: `Domain/Entities/ProjectTask.cs`, `Application/Features/Tasks/`
   (DTO, `GetTasksQuery`, `CreateTaskCommand`, `UpdateTaskStatusCommand`),
   `API/Controllers/TasksController.cs` with `[HasPermission(MenuCodes.Tasks, …)]`.
2. Add `MenuCodes.Tasks`, seed the `Menu` row (`route = /tasks`) and grant it in `/roles`.
3. Frontend: align the request shape with the API (camelCase params), and move the page
   onto `useApiData` with `['tasks', projectId]` for consistency with the rest of the app.
