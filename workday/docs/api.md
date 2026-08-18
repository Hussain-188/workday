# Workday API — MVP 1

Backend contract for the Workforce Management System. Everything the React
client needs is here; you should not need to read Java to integrate.

- **Base URL (local):** `http://localhost:8080`
- **All paths are prefixed** `/api`
- **Content type:** `application/json` on every request with a body

---

## 1. Conventions

### Dates and numbers

| Concept | Format | Example |
| --- | --- | --- |
| Date (no time) | ISO-8601 `YYYY-MM-DD` | `"2026-08-17"` |
| Timestamp | ISO-8601 UTC instant | `"2026-08-18T09:14:22.418Z"` |
| Hours | JSON number, max 2 decimals, `0`–`24` | `7.5`, `8`, `0.25` |
| Total hours | JSON number, server-calculated | `39.50` |

Hours are held as exact decimals on the server. Send them as plain JSON
numbers; do not send them as strings.

### Pagination

Every collection endpoint accepts:

| Param | Default | Notes |
| --- | --- | --- |
| `page` | `0` | zero-based |
| `size` | `20` | maximum `100` |
| `sort` | varies | e.g. `sort=weekStartDate,desc` |

and returns this envelope:

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 42,
  "totalPages": 3,
  "first": true,
  "last": false
}
```

### Enumerations

| Enum | Values |
| --- | --- |
| `role` | `SYSTEM_ADMIN`, `HR_MANAGER`, `MANAGER`, `PROJECT_MANAGER`, `WORKER` |
| `workerType` | `EMPLOYEE`, `CONTRACTOR`, `TEMPORARY_WORKER` |
| Worker `status` | `ACTIVE`, `INACTIVE`, `OFFBOARDED` |
| Team `status` | `ACTIVE`, `INACTIVE` |
| Assignment `status` | `ACTIVE`, `COMPLETED`, `CANCELLED` |
| Timesheet `status` | `DRAFT`, `SUBMITTED`, `NEEDS_REVIEW` |
| Invoice `status` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED` |

> There is still **no** `APPROVED` or `REJECTED` timesheet status.
> `SUBMITTED` means "the worker finished entering this week", not "a manager
> approved it". `NEEDS_REVIEW` (MVP 3) is a narrow exception — only reached
> when a submission pushes the team over an assignment's `allocatedHours`
> budget — and even that resolves back to `SUBMITTED`, never to a distinct
> approved state. See §8.

---

## 2. Authentication

### `POST /api/auth/login`

The only endpoint that does not require a token.

**Request**

```json
{ "email": "john@example.com", "password": "Password123!" }
```

**Response `200`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresInSeconds": 28800,
  "userId": 5,
  "name": "John Carter",
  "email": "john@example.com",
  "role": "WORKER",
  "organizationId": 1,
  "organizationName": "Acme Corporation",
  "workerId": 3
}
```

`workerId` is populated **only** for `WORKER` accounts and is `null` for every
other role. Treat it as display information: the backend never accepts it back
as proof of identity.

**Errors**

| Status | `code` | When |
| --- | --- | --- |
| `400` | `VALIDATION_FAILED` | missing/malformed email or password |
| `401` | `INVALID_CREDENTIALS` | wrong password **or** unknown email |
| `403` | `FORBIDDEN_OPERATION` | the account status is `INACTIVE` |

Unknown email and wrong password return the identical response, deliberately.

### Sending the token

Attach it to every other request:

```
Authorization: Bearer <accessToken>
```

The token is a signed JWT with these claims — decode it if convenient, but
never trust it client-side for authorization decisions:

```json
{
  "sub": "5",
  "iss": "workday-api",
  "email": "john@example.com",
  "role": "WORKER",
  "organizationId": 1,
  "iat": 1755504862,
  "exp": 1755533662
}
```

Auth is **stateless**: there is no session, no refresh token and no logout
endpoint in MVP 1. When `exp` passes, log in again.

### `GET /api/auth/me`

Confirms a token restored from storage is still valid, and returns who it
belongs to. Call this on app boot before rendering; a `401` is your signal to
clear the stored session and show the login screen.

```json
{
  "userId": 5,
  "name": "John Carter",
  "email": "john@example.com",
  "role": "WORKER",
  "organizationId": 1,
  "organizationName": "Acme Corporation",
  "workerId": 1
}
```

`workerId` is present only for `WORKER` accounts.

---

## 3. Errors

Every failure returns the same shape:

```json
{
  "timestamp": "2026-08-18T09:14:22.418Z",
  "status": 403,
  "error": "Forbidden",
  "code": "UNAUTHORIZED_RESOURCE_ACCESS",
  "message": "You may only view your own timesheets",
  "path": "/api/timesheets/9",
  "fieldErrors": []
}
```

Branch on `code`, not on `message` — messages may be reworded.

| Status | `code` | Meaning |
| --- | --- | --- |
| `400` | `VALIDATION_FAILED` | field validation failed; see `fieldErrors` |
| `400` | `MALFORMED_REQUEST` | body missing or not valid JSON |
| `400` | `INVALID_PARAMETER` | a path/query parameter had the wrong type |
| `401` | `UNAUTHENTICATED` | no token, expired token, or bad signature |
| `401` | `INVALID_CREDENTIALS` | login failed |
| `403` | `ACCESS_DENIED` | your **role** may not call this endpoint |
| `403` | `FORBIDDEN_OPERATION` | the operation is not allowed in this state |
| `403` | `UNAUTHORIZED_RESOURCE_ACCESS` | your role is fine, but this **record** is not yours |
| `404` | `RESOURCE_NOT_FOUND` | no such id |
| `409` | `DUPLICATE_RESOURCE` | email, employee code or team code already taken |
| `409` | `DUPLICATE_TIMESHEET` | that assignment already has that week |
| `409` | `INVALID_WORKER_STATE` | illegal worker lifecycle transition |
| `409` | `INVALID_TIMESHEET_STATE` | e.g. editing a `SUBMITTED` timesheet |
| `409` | `INVALID_INVOICE_STATE` | e.g. approving/rejecting/resubmitting an invoice not `PENDING_APPROVAL` |
| `409` | `CONSTRAINT_VIOLATION` | database constraint hit (rare; a race) |
| `409` | `CONCURRENT_MODIFICATION` | someone else changed it; reload and retry |
| `422` | `INVALID_ASSIGNMENT` | assignment business rule broken |
| `422` | `INVALID_TIMESHEET_ENTRY` | hours or work date rejected |
| `422` | `INVALID_CONTRACT` | contract business rule broken (e.g. non-positive duration) |
| `422` | `NO_BILLABLE_TIMESHEETS` | Milestone Billing generation found no SUBMITTED timesheets to bill |
| `500` | `INTERNAL_ERROR` | unexpected; nothing internal is exposed |

`fieldErrors` is populated only for `VALIDATION_FAILED`:

```json
"fieldErrors": [
  { "field": "email", "message": "email must be a valid address" },
  { "field": "password", "message": "password is required" }
]
```

### 403 with `ACCESS_DENIED` vs `UNAUTHORIZED_RESOURCE_ACCESS`

This distinction matters for your UI:

- `ACCESS_DENIED` — the caller's **role** cannot use this endpoint at all.
  Hide the control entirely.
- `UNAUTHORIZED_RESOURCE_ACCESS` — the role is right, but this specific record
  belongs to another worker, team or organization. Show a "not yours" state.

---

## 4. Who can call what

| Endpoint | `SYSTEM_ADMIN` | `HR_MANAGER` | `MANAGER` | `PROJECT_MANAGER` | `WORKER` |
| --- | :-: | :-: | :-: | :-: | :-: |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/auth/me` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/users` | ✅ org | ✅ org | — | — | — |
| `GET /api/dashboard/summary` | ✅ org | ✅ org | ✅ own teams | ✅ own queue | ✅ self |
| `POST /api/workers` | ✅ | ✅ | — | — | — |
| `GET /api/workers` | ✅ org | ✅ org | ✅ own teams | — | — |
| `GET /api/workers/me` | — | — | — | — | ✅ self |
| `GET /api/workers/{id}` | ✅ org | ✅ org | ✅ own teams | — | ✅ self only |
| `PATCH /api/workers/{id}` | ✅ | ✅ | — | — | — |
| `POST /api/workers/{id}/offboard` | ✅ | ✅ | — | — | — |
| `POST /api/teams` | ✅ | — | — | — | — |
| `GET /api/teams` | ✅ org | ✅ org | ✅ own only | — | — |
| `GET /api/teams/{id}` | ✅ org | ✅ org | ✅ own only | — | ✅ own team |
| `GET /api/teams/{id}/workers` | ✅ org | ✅ org | ✅ own only | — | ✅ own team |
| `POST /api/assignments` | ✅ | — | ✅ own teams | — | — |
| `GET /api/assignments` | ✅ org | ✅ org | ✅ own teams | — | — |
| `GET /api/assignments/my` | — | — | — | — | ✅ self |
| `GET /api/assignments/{id}` | ✅ org | ✅ org | ✅ own teams | — | ✅ self only |
| `PATCH /api/assignments/{id}/status` | ✅ | — | ✅ own teams | — | — |
| `POST /api/timesheets` | — | — | — | — | ✅ self |
| `GET /api/timesheets/my` | — | — | — | — | ✅ self |
| `GET /api/timesheets` | ✅ org | ✅ org | ✅ own teams | — | — |
| `GET /api/timesheets/{id}` | ✅ org | ✅ org | ✅ own teams | — | ✅ self only |
| `PUT /api/timesheets/{id}/entries` | — | — | — | — | ✅ own draft |
| `POST /api/timesheets/{id}/submit` | — | — | — | — | ✅ own draft |
| `POST /api/timesheets/{id}/review` | — | — | ✅ own teams | — | — |
| `POST /api/contracts` | ✅ | — | — | — | — |
| `GET /api/contracts` | ✅ org | ✅ org | ✅ own only | — | — |
| `GET /api/contracts/{id}` | ✅ org | ✅ org | ✅ own only | — | — |
| `POST /api/invoices/generate` | — | — | ✅ own contracts | — | — |
| `POST /api/invoices` | — | — | ✅ own contracts | — | — |
| `GET /api/invoices` | ✅ org | ✅ org | ✅ raised by them | ✅ assigned to them | — |
| `GET /api/invoices/{id}` | ✅ org | ✅ org | ✅ raised by them | ✅ assigned to them | — |
| `GET /api/invoices/{id}/pdf` | ✅ org | ✅ org | ✅ raised by them | ✅ assigned to them | — |
| `POST /api/invoices/{id}/submit` | — | — | ✅ own draft | — | — |
| `POST /api/invoices/{id}/approve` | — | — | — | ✅ assigned to them | — |
| `POST /api/invoices/{id}/reject` | — | — | — | ✅ assigned to them | — |
| `GET /api/manager/*` | ✅ org | — | ✅ own teams | — | — |
| `GET /api/hr/workers*` | ✅ | ✅ | — | — | — |

"org" = everything in the caller's organization. "own teams" = only teams where
the caller is the manager. "self" = derived from the JWT. "own queue" /
"assigned to them" = invoices routed to that project manager.

---

## 5. Workers

### `POST /api/workers` — onboard

Roles: `HR_MANAGER`, `SYSTEM_ADMIN`. Creates the login identity **and** the
employment record in one transaction.

```json
{
  "name": "John Carter",
  "email": "john@example.com",
  "password": "Password123!",
  "employeeCode": "EMP-1001",
  "workerType": "CONTRACTOR",
  "employmentStartDate": "2026-06-01",
  "teamId": 1,
  "hourlyRate": 50.00
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `name` | yes | ≤ 150 chars |
| `email` | yes | valid address, ≤ 255, unique across all users |
| `password` | yes | 8–72 chars |
| `employeeCode` | yes | ≤ 50, unique |
| `workerType` | yes | one of the `workerType` enum |
| `employmentStartDate` | yes | date |
| `teamId` | no | must be an `ACTIVE` team in your organization |
| `hourlyRate` | no | ≥ 0, 2 decimals; defaults to `0.00`. Drives Milestone Billing (§11) — submitted hours against this worker are billed at this rate |

**Response `201`** — a `WorkerResponse`:

```json
{
  "id": 3,
  "userId": 5,
  "name": "John Carter",
  "email": "john@example.com",
  "employeeCode": "EMP-1001",
  "workerType": "CONTRACTOR",
  "employmentStartDate": "2026-06-01",
  "employmentEndDate": null,
  "hourlyRate": 50.00,
  "status": "ACTIVE",
  "teamId": 1,
  "teamName": "Backend Engineering",
  "organizationId": 1,
  "createdAt": "2026-08-18T09:14:22.418Z",
  "updatedAt": "2026-08-18T09:14:22.418Z"
}
```

New workers are `ACTIVE` immediately — there is no separate activation call.

Errors: `400 VALIDATION_FAILED`, `403 ACCESS_DENIED`,
`409 DUPLICATE_RESOURCE` (email or employee code).

### `GET /api/workers` — list

Roles: `HR_MANAGER`, `SYSTEM_ADMIN`, `MANAGER`. Paginated `WorkerResponse`.

Query: `status` (optional, filters by worker status) plus the pagination params.
A manager's results are narrowed to their own teams by the database query, so
there is nothing extra for you to filter client-side.

### `GET /api/workers/me`

Role: `WORKER`. Returns the caller's own `WorkerResponse`, resolved from the
token. Query parameters cannot change whose record comes back.

Errors: `404 RESOURCE_NOT_FOUND` if the account has no employment record.

### `GET /api/workers/{id}`

Any role, but scoped: a worker may only fetch themselves, a manager only
workers on teams they manage.

Errors: `403 UNAUTHORIZED_RESOURCE_ACCESS`, `404 RESOURCE_NOT_FOUND`.

### `PATCH /api/workers/{id}` — update

Roles: `HR_MANAGER`, `SYSTEM_ADMIN`. Every field is optional; omitted fields are
left unchanged.

```json
{
  "name": "John A. Carter",
  "workerType": "EMPLOYEE",
  "employmentStartDate": "2026-06-01",
  "employmentEndDate": null,
  "teamId": 2,
  "status": "INACTIVE",
  "hourlyRate": 55.00
}
```

`status` accepts `ACTIVE` and `INACTIVE` only. Sending `OFFBOARDED` returns
`409 INVALID_WORKER_STATE` — use the offboard endpoint, so the transition is
audited. An already-offboarded worker cannot be edited at all.

Errors: `409 INVALID_WORKER_STATE` (offboarded record, or end date before start
date), `403`, `404`.

### `POST /api/workers/{id}/offboard`

Roles: `HR_MANAGER`, `SYSTEM_ADMIN`. Body is optional; send `{}` to use today.

```json
{ "effectiveDate": "2026-08-31", "reason": "Contract ended" }
```

Sets `status` to `OFFBOARDED` and `employmentEndDate` to `effectiveDate`.
**Nothing is deleted.** The worker's assignments and timesheets remain readable
by everyone who could read them before.

After offboarding:
- new assignments are refused (`422 INVALID_ASSIGNMENT`)
- new timesheets are refused (`409 INVALID_TIMESHEET_STATE`)
- existing timesheets stay readable, including by the worker themselves

Errors: `409 INVALID_WORKER_STATE` (already offboarded, or `effectiveDate`
precedes `employmentStartDate`).

### `GET /api/hr/workers`, `GET /api/hr/workers/{id}`

Roles: `HR_MANAGER`, `SYSTEM_ADMIN`. Identical payloads to `/api/workers` and
`/api/workers/{id}`; a separate path for a cleanly separated HR screen.

---

## 6. Teams

### `POST /api/teams`

Role: `SYSTEM_ADMIN` only.

```json
{
  "name": "Backend Engineering",
  "code": "BACKEND",
  "description": "Server-side platform team",
  "managerId": 3
}
```

`managerId` must be a `MANAGER`-role user in your organization; anything else
returns `403 FORBIDDEN_OPERATION`.

`code` is **optional** — omit it and the server derives a slug from the name
("Mobile Engineering" → `MOBILE-ENGINEERING`), appending `-2`, `-3`… if that
slug is taken, so a form that only asks for a name can never collide. When you
do send one it must be unique within the organization (`409 DUPLICATE_RESOURCE`).

**Response `201`** — a `TeamResponse`:

```json
{
  "id": 1,
  "organizationId": 1,
  "name": "Backend Engineering",
  "code": "BACKEND",
  "description": "Server-side platform team",
  "managerId": 3,
  "managerName": "David Miller",
  "managerEmail": "manager@example.com",
  "status": "ACTIVE",
  "createdAt": "2026-08-18T09:10:00.000Z",
  "updatedAt": "2026-08-18T09:10:00.000Z"
}
```

### `GET /api/teams`

Roles: `SYSTEM_ADMIN`, `HR_MANAGER`, `MANAGER`. Paginated `TeamResponse`. A
manager sees only teams they manage. Workers get `403 FORBIDDEN_OPERATION` —
use `GET /api/teams/{id}` with the `teamId` from `/api/workers/me`.

### `GET /api/teams/{id}`

Any role. A manager may only read teams they manage; a worker only their own
team. Otherwise `403 UNAUTHORIZED_RESOURCE_ACCESS`.

### `GET /api/teams/{id}/workers`

Same access rules as above. Paginated `WorkerResponse`.

---

## 7. Assignments

**MVP 2 — Team Assignment model.** An assignment is owned by a whole `team`
(via `teamId`) and billed against a `contract`, not handed to one named
worker. Any `ACTIVE` worker placed on that team may log hours against it —
there is no `workerId` on this resource any more, and no junction table
between workers and assignments; `team_id` is the sole ownership column. It
is **not** a task — finer task management is a later MVP.

### `POST /api/assignments`

Roles: `MANAGER`, `SYSTEM_ADMIN`.

```json
{
  "teamId": 1,
  "contractId": 1,
  "title": "Website Migration",
  "description": "Migrate the legacy marketing site",
  "startDate": "2026-08-03",
  "endDate": null,
  "allocatedHours": 80.00
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `teamId` | yes | must be `ACTIVE`; a manager must manage it |
| `contractId` | yes | must exist in your organization |
| `title` | yes | ≤ 200 chars |
| `description` | no | ≤ 2000 chars |
| `startDate` | yes | date |
| `endDate` | no | null = open-ended; otherwise ≥ `startDate` |
| `allocatedHours` | no | MVP 3: the milestone budget; positive if provided. `null`/omitted means no budget — the Soft Cap Rule (§8) never fires for this assignment |

There is no `managerId` field. The owning manager is taken from your token (or,
for an admin, the team's manager). A supplied one would be ignored. The
contract's own manager need not be the same person — an assignment's manager
and its billing contract's manager are tracked independently; only the
contract's owner may later generate an invoice from it (§11).

**Response `201`** — an `AssignmentResponse`:

```json
{
  "id": 7,
  "teamId": 1,
  "teamName": "Backend Engineering",
  "contractId": 1,
  "contractProjectName": "Website Migration",
  "managerId": 3,
  "managerName": "David Miller",
  "title": "Website Migration",
  "description": "Migrate the legacy marketing site",
  "startDate": "2026-08-03",
  "endDate": null,
  "status": "ACTIVE",
  "allocatedHours": 80.00,
  "createdAt": "2026-08-18T09:20:00.000Z",
  "updatedAt": "2026-08-18T09:20:00.000Z"
}
```

**Errors**

| Status | `code` | Cause |
| --- | --- | --- |
| `403` | `UNAUTHORIZED_RESOURCE_ACCESS` | you do not manage that team, or the contract belongs to another organization |
| `422` | `INVALID_ASSIGNMENT` | team is not `ACTIVE` |
| `422` | `INVALID_ASSIGNMENT` | `endDate` before `startDate` |

### `GET /api/assignments`

Roles: `MANAGER`, `SYSTEM_ADMIN`, `HR_MANAGER`. Optional `status` filter.
Paginated `AssignmentResponse`, scoped to the caller's teams or organization.

### `GET /api/assignments/my`

Role: `WORKER`. Every assignment on the caller's **own team**, resolved from
the token — MVP 2 has no personal assignment list, since work is team-owned.
Optional `status` filter — pass `status=ACTIVE` to populate a "log time
against" picker.

### `GET /api/assignments/{id}`

Any role, ownership-scoped as in the permission table.

### `PATCH /api/assignments/{id}/status`

Roles: `MANAGER` (own teams only), `SYSTEM_ADMIN`.

```json
{ "status": "COMPLETED", "projectManagerId": 5 }
```

Only an `ACTIVE` assignment can change status; `COMPLETED` and `CANCELLED` are
terminal (`422 INVALID_ASSIGNMENT`). Sending the status it already has is a
no-op and returns `200`. Closed assignments stay fully readable, and their
existing timesheets are untouched — they simply accept no new weeks.

**MVP 3 Automated Handoff.** `projectManagerId` is optional and only read when
`status` is `COMPLETED`. When present, the same call generates a Milestone
Billing invoice for the assignment's contract (§11) and routes it to that
project manager — identical arithmetic to `POST /api/invoices/generate`, just
triggered by completion instead of a separate call. No billable (`SUBMITTED`)
timesheets yet, or `projectManagerId` omitted, and the status change still
succeeds — the invoice is a bonus, never a precondition. The response is still
just the `AssignmentResponse`; fetch `GET /api/invoices` afterward to see what
was raised.

---

## 8. Timesheets

One timesheet = one worker's week against one assignment. Since an assignment
is team-owned (§7), **several teammates can each open their own timesheet
against the same assignment for the same week** — the uniqueness key is
`(assignmentId, workerId, weekStartDate)`, not just `(assignmentId,
weekStartDate)`.

**Rules that will shape your UI:**

1. `weekStartDate` **must be a Monday**. The server derives `weekEndDate` as
   Monday + 6, so weeks always run Monday–Sunday.
2. One timesheet per **worker** per assignment per week, enforced by a
   database unique key — not one per assignment overall.
3. Every `workDate` must fall inside that week, and each date at most once.
4. `hours` is `0`–`24` per day.
5. `totalHours` is **always** computed server-side. Never send it; it is
   ignored if you do.
6. `DRAFT` is editable, `SUBMITTED` is frozen. There is no approval step on a
   normal week — approval happens one level up, on the *invoice* raised from
   these hours (§11).
7. **MVP 3 Soft Cap Rule.** If the assignment carries an `allocatedHours`
   budget (§7), a submission that pushes the *team's* total logged hours on
   it past that budget lands in `NEEDS_REVIEW` instead of `SUBMITTED`. A
   manager resolves it via `POST /api/timesheets/{id}/review` below, which
   returns it to `SUBMITTED`. `NEEDS_REVIEW` is a detour, not a gate — it is
   still not an approval step for the normal case.

### `POST /api/timesheets`

Role: `WORKER`. `entries` is optional — open the week empty and fill it in
later if that suits your UI.

```json
{
  "assignmentId": 7,
  "weekStartDate": "2026-08-17",
  "entries": [
    { "workDate": "2026-08-17", "hours": 8,   "notes": "Content audit" },
    { "workDate": "2026-08-18", "hours": 8 },
    { "workDate": "2026-08-19", "hours": 7.5 },
    { "workDate": "2026-08-20", "hours": 8 },
    { "workDate": "2026-08-21", "hours": 8 },
    { "workDate": "2026-08-22", "hours": 0 },
    { "workDate": "2026-08-23", "hours": 0 }
  ]
}
```

**Response `201`** — a `TimesheetResponse`. `entries` always comes back sorted
by `workDate`:

```json
{
  "id": 9,
  "assignmentId": 7,
  "assignmentTitle": "Website Migration",
  "workerId": 3,
  "workerName": "John Carter",
  "teamId": 1,
  "teamName": "Backend Engineering",
  "weekStartDate": "2026-08-17",
  "weekEndDate": "2026-08-23",
  "totalHours": 39.50,
  "billableHours": 39.50,
  "status": "DRAFT",
  "entries": [
    { "id": 21, "workDate": "2026-08-17", "hours": 8.00, "notes": "Content audit" },
    { "id": 22, "workDate": "2026-08-18", "hours": 8.00, "notes": null },
    { "id": 23, "workDate": "2026-08-19", "hours": 7.50, "notes": null },
    { "id": 24, "workDate": "2026-08-20", "hours": 8.00, "notes": null },
    { "id": 25, "workDate": "2026-08-21", "hours": 8.00, "notes": null },
    { "id": 26, "workDate": "2026-08-22", "hours": 0.00, "notes": null },
    { "id": 27, "workDate": "2026-08-23", "hours": 0.00, "notes": null }
  ],
  "version": 0,
  "createdAt": "2026-08-18T09:30:00.000Z",
  "updatedAt": "2026-08-18T09:30:00.000Z"
}
```

**Errors**

| Status | `code` | Cause |
| --- | --- | --- |
| `400` | `VALIDATION_FAILED` | `hours` outside 0–24, or > 2 decimals |
| `403` | `UNAUTHORIZED_RESOURCE_ACCESS` | that assignment is not yours |
| `409` | `DUPLICATE_TIMESHEET` | that week already exists for the assignment |
| `409` | `INVALID_TIMESHEET_STATE` | assignment not `ACTIVE`, or you are offboarded |
| `422` | `INVALID_TIMESHEET_ENTRY` | `weekStartDate` is not a Monday |
| `422` | `INVALID_TIMESHEET_ENTRY` | a `workDate` is outside the week, or duplicated |

Note the two layers on hours: a value like `25` is caught by field validation
(`400`), while a bad **date** is caught by the timesheet's own week rules
(`422`). Handle both.

### `PUT /api/timesheets/{id}/entries`

Role: `WORKER`, own `DRAFT` only. This is a **full replacement**: days missing
from the list are deleted. To clear the week, send `{"entries": []}`.

```json
{
  "entries": [
    { "workDate": "2026-08-17", "hours": 6 },
    { "workDate": "2026-08-18", "hours": 6.25 }
  ]
}
```

Returns the updated `TimesheetResponse` with a recalculated `totalHours`.

Errors: `403 UNAUTHORIZED_RESOURCE_ACCESS` (not your timesheet),
`409 INVALID_TIMESHEET_STATE` (already submitted),
`422 INVALID_TIMESHEET_ENTRY`.

### `POST /api/timesheets/{id}/submit`

Role: `WORKER`, own `DRAFT` only. No request body. Recalculates the total,
then sets `status` to `SUBMITTED` — or, if the assignment has an
`allocatedHours` budget and this submission pushes the team's total logged
hours on it past that budget, to `NEEDS_REVIEW` instead (the MVP 3 Soft Cap
Rule; see §8 rule 7).

Errors: `403 UNAUTHORIZED_RESOURCE_ACCESS`,
`409 INVALID_TIMESHEET_STATE` (already submitted).

### `POST /api/timesheets/{id}/review` — MVP 3 Soft Cap Rule resolution

Role: `MANAGER`, own team's timesheet, must currently be `NEEDS_REVIEW`.

```json
{ "approveOverage": false }
```

| `approveOverage` | Effect |
| --- | --- |
| `true` | "Approve Total Time (Includes Overtime)" — every logged hour becomes billable |
| `false` | "Approve Allocated Time Only (Cap at Budget)" — billable hours are capped at the assignment's `allocatedHours`; the overage is discarded, never billed |

Either way, `status` returns to `SUBMITTED` so the week is picked up by the
next Milestone Billing invoice (§11) — billed by `billableHours`, not
`totalHours`. Returns the updated `TimesheetResponse`.

Errors: `403 UNAUTHORIZED_RESOURCE_ACCESS` (not a team you manage),
`409 INVALID_TIMESHEET_STATE` (not currently `NEEDS_REVIEW`).

### `GET /api/timesheets`

Roles: `SYSTEM_ADMIN`, `HR_MANAGER`, `MANAGER`. Paginated `TimesheetResponse`,
scoped by role: the whole organization for admin/HR, only their own teams for a
manager. Optional `status` filter. Workers get `403` — they have `/my`.

Use this rather than `/api/manager/timesheets` if the caller may be HR, since
the manager facade is admin/manager only.

### `GET /api/timesheets/my`

Role: `WORKER`. The caller's history, newest week first by default. Optional
`status` filter. Still works after the worker is offboarded.

### `GET /api/timesheets/{id}`

Any role, ownership-scoped: the worker who owns it, the manager of its team, or
an admin/HR user in the organization.

---

## 8b. Users and dashboard

### `GET /api/users?role=MANAGER`

Roles: `SYSTEM_ADMIN`, `HR_MANAGER`. A read-only directory of login identities
in your organization, filtered by `role` when supplied. It exists so an admin
can pick a manager when creating a team; it is not a user-management surface
and never returns a password hash. Returns a plain array, not a page.

```json
[
  { "id": 3, "name": "David Miller", "email": "manager@example.com",
    "role": "MANAGER", "status": "ACTIVE" }
]
```

### `GET /api/dashboard/summary`

Any role. Headline counts for the landing screen, **shaped by who is asking**.
The keys differ per role, so render them generically (iterate the object) rather
than hard-coding field names:

| Role | Keys returned |
| --- | --- |
| `SYSTEM_ADMIN`, `HR_MANAGER` | `total_workers`, `active_workers`, `offboarded_workers`, `teams`, `active_assignments`, `submitted_timesheets`, `contracts` |
| `MANAGER` | `my_teams`, `my_workers`, `active_assignments`, `submitted_timesheets`, `draft_timesheets`, `invoices_pending_approval` |
| `PROJECT_MANAGER` | `invoices_pending_approval` |
| `WORKER` | `active_assignments`, `draft_timesheets`, `submitted_timesheets`, `hours_submitted` |

```json
{ "my_teams": 1, "my_workers": 2, "active_assignments": 2,
  "submitted_timesheets": 1, "draft_timesheets": 0 }
```

Every figure is scoped: a manager's counts cover only teams they manage, and a
worker's only their own records. Keys are snake_case so they render as readable
labels after replacing underscores with spaces.

## 9. Manager endpoints

Roles: `MANAGER`, `SYSTEM_ADMIN`. A convenience surface for manager screens —
same payloads as the endpoints above, always scoped to the teams the caller
manages.

| Endpoint | Returns |
| --- | --- |
| `GET /api/manager/teams` | paginated `TeamResponse` |
| `GET /api/manager/workers` | paginated `WorkerResponse`, `status` filter |
| `GET /api/manager/assignments` | paginated `AssignmentResponse`, `status` filter |
| `GET /api/manager/timesheets` | paginated `TimesheetResponse`, `status` filter |
| `GET /api/manager/timesheets/{id}` | single `TimesheetResponse` |

A manager querying these sees strictly their own teams' data. There is no way
to widen the scope with a query parameter.

---

## 10. Contracts

A contract is the project a set of workers is engaged to deliver. An admin
creates it and assigns the manager who owns delivery; invoices are then raised
against it.

### `POST /api/contracts`

Role: `SYSTEM_ADMIN` only.

```json
{
  "projectName": "Website Migration",
  "startDate": "2026-06-01",
  "durationInMonths": 6,
  "managerId": 3
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `projectName` | yes | ≤ 200 chars |
| `startDate` | yes | date |
| `durationInMonths` | yes | 1–120 |
| `managerId` | yes | a `MANAGER`-role user in your organization |

There is no `createdByAdminId` field — it is taken from your token.

**Response `201`** — a `ContractResponse`. `endDate` is derived
(`startDate` + `durationInMonths`), never stored or accepted as input:

```json
{
  "id": 1,
  "projectName": "Website Migration",
  "startDate": "2026-06-01",
  "endDate": "2026-12-01",
  "durationInMonths": 6,
  "managerId": 3,
  "managerName": "David Miller",
  "createdByAdminId": 1,
  "createdByAdminName": "System Admin",
  "createdAt": "2026-08-18T09:10:00.000Z",
  "updatedAt": "2026-08-18T09:10:00.000Z"
}
```

Errors: `400 VALIDATION_FAILED`, `403 ACCESS_DENIED`,
`404 RESOURCE_NOT_FOUND` (`managerId`), `422 INVALID_CONTRACT` (not a manager,
or a non-positive duration).

### `GET /api/contracts`, `GET /api/contracts/{id}`

Roles: `SYSTEM_ADMIN`, `HR_MANAGER`, `MANAGER`. Paginated `ContractResponse`
for the list. Admin/HR see the organization; a manager sees only contracts
assigned to them. `PROJECT_MANAGER` and `WORKER` cannot browse contracts
directly — a project manager reaches one through the invoice they are
approving, which carries `contractId` and `contractProjectName`.

---

## 11. Invoices

The approval workflow: a manager verifies timesheets against a contract and
raises an invoice, submits it, and the project manager it is routed to makes
one approve-or-reject decision.

```
DRAFT --(submit)--> PENDING_APPROVAL --(approve)--> APPROVED
                                      \-(reject)---> REJECTED
```

Every transition is a single forward step — there is no un-approving,
un-rejecting or resubmitting a decided invoice.

Two ways to raise one:

- **`POST /api/invoices/generate`** — Milestone Billing (Time &amp; Materials):
  the amount is computed for you from submitted timesheets. This is the
  primary path.
- **`POST /api/invoices`** — manual: you supply the period and amount
  yourself, then submit it as a separate step. Useful for a one-off charge
  that isn't a straight sum of logged hours.

### `POST /api/invoices/generate` — Milestone Billing (T&amp;M)

Role: `MANAGER`. Computes the amount from every `SUBMITTED` timesheet logged
against the contract's assignments — **each timesheet's `totalHours` times
the logging worker's own `hourlyRate`, summed** — and creates the invoice
straight into `PENDING_APPROVAL`. There is no manual amount entry and no
separate submit step.

```json
{
  "contractId": 1,
  "projectManagerId": 6
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `contractId` | yes | must be a contract **you** own |
| `projectManagerId` | yes | a `PROJECT_MANAGER`-role user in your organization |

`periodStart`/`periodEnd` on the resulting invoice are derived automatically
— the earliest `weekStartDate` and latest `weekEndDate` among the timesheets
that were billed.

**Response `201`** — an `InvoiceResponse` with `status: "PENDING_APPROVAL"`:

```json
{
  "id": 5,
  "contractId": 1,
  "contractProjectName": "Website Migration",
  "managerId": 3,
  "managerName": "David Miller",
  "projectManagerId": 6,
  "projectManagerName": "Priya Menon",
  "periodStart": "2026-08-10",
  "periodEnd": "2026-08-16",
  "amount": 3400.00,
  "notes": "Auto-generated from 2 submitted timesheet(s)",
  "decisionNotes": null,
  "status": "PENDING_APPROVAL",
  "createdAt": "2026-08-18T09:40:00.000Z",
  "updatedAt": "2026-08-18T09:40:00.000Z"
}
```

> Example math: worker A logs 20h at $50/hr, worker B logs 10h at $75/hr on
> the same contract → (20 × 50) + (10 × 75) = **$1,750.00**. Every step is
> `BigDecimal`, never floating point.

**Errors**

| Status | `code` | Cause |
| --- | --- | --- |
| `400` | `VALIDATION_FAILED` | missing `contractId`/`projectManagerId` |
| `403` | `UNAUTHORIZED_RESOURCE_ACCESS` | not your contract, or the project manager is in another organization |
| `404` | `RESOURCE_NOT_FOUND` | `contractId` or `projectManagerId` |
| `422` | `NO_BILLABLE_TIMESHEETS` | the contract has no assignments, or no `SUBMITTED` timesheets exist against them |

Re-running this endpoint does **not** exclude timesheets already billed on a
previous invoice — there is no "invoiced" flag on a timesheet in this
release, so avoid generating twice for the same period.

### `POST /api/invoices` — manual

Role: `MANAGER`. Starts as `DRAFT`, not yet visible to the project manager.

```json
{
  "contractId": 1,
  "projectManagerId": 6,
  "periodStart": "2026-08-03",
  "periodEnd": "2026-08-09",
  "amount": 6400.00,
  "notes": "August week 1 hours, verified against timesheets"
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `contractId` | yes | must be a contract **you** own |
| `projectManagerId` | yes | a `PROJECT_MANAGER`-role user in your organization |
| `periodStart` / `periodEnd` | yes | dates; `periodEnd` ≥ `periodStart` |
| `amount` | yes | ≥ 0, 2 decimals |
| `notes` | no | ≤ 1000 chars |

**Response `201`** — an `InvoiceResponse`:

```json
{
  "id": 4,
  "contractId": 1,
  "contractProjectName": "Website Migration",
  "managerId": 3,
  "managerName": "David Miller",
  "projectManagerId": 6,
  "projectManagerName": "Priya Menon",
  "periodStart": "2026-08-03",
  "periodEnd": "2026-08-09",
  "amount": 6400.00,
  "notes": "August week 1 hours, verified against timesheets",
  "decisionNotes": null,
  "status": "DRAFT",
  "createdAt": "2026-08-18T09:40:00.000Z",
  "updatedAt": "2026-08-18T09:40:00.000Z"
}
```

Errors: `400 VALIDATION_FAILED`, `403 UNAUTHORIZED_RESOURCE_ACCESS` (not your
contract, or the project manager is in another organization),
`404 RESOURCE_NOT_FOUND` (`contractId` or `projectManagerId`).

### `POST /api/invoices/{id}/submit`

Role: `MANAGER`, own invoice only. No request body. `DRAFT` → `PENDING_APPROVAL`.

Errors: `403 UNAUTHORIZED_RESOURCE_ACCESS`, `409 INVALID_INVOICE_STATE` (not
`DRAFT`).

### `POST /api/invoices/{id}/approve`

Role: `PROJECT_MANAGER`, only when the invoice is assigned to you.
`PENDING_APPROVAL` → `APPROVED`. Body is optional:

```json
{ "notes": "Looks good, approved for payment" }
```

Errors: `403 UNAUTHORIZED_RESOURCE_ACCESS`, `409 INVALID_INVOICE_STATE` (not
`PENDING_APPROVAL`).

### `POST /api/invoices/{id}/reject`

Role: `PROJECT_MANAGER`, only when the invoice is assigned to you.
`PENDING_APPROVAL` → `REJECTED`. `notes` is **required** — it is the reason the
manager sees:

```json
{ "notes": "Hours do not match the submitted timesheets for Aug 5" }
```

Errors: `403 UNAUTHORIZED_RESOURCE_ACCESS`,
`409 INVALID_INVOICE_STATE` (not `PENDING_APPROVAL`, or `notes` blank/missing).

### `GET /api/invoices`, `GET /api/invoices/{id}`

Roles: `SYSTEM_ADMIN`, `HR_MANAGER`, `MANAGER`, `PROJECT_MANAGER`. Paginated
`InvoiceResponse` for the list, with an optional `status` filter. Admin/HR see
the organization; a manager sees invoices they raised; a project manager sees
only invoices routed to them.

### `GET /api/invoices/{id}/pdf` — MVP 3 PDF export

Same roles and visibility rule as `GET /api/invoices/{id}`. Returns
`Content-Type: application/pdf` with a `Content-Disposition: attachment;
filename="invoice-{id}.pdf"` header — a browser `fetch` with
`responseType: 'blob'` (or a plain `<a href>` if the request needs no auth
header) can hand it straight to the user.

The PDF shows the contract, billing period, manager/project-manager, and a
per-line breakdown of assignment / worker / hours billed / rate / line amount,
reconstructed from the same `SUBMITTED` timesheets `POST
/api/invoices/generate` would bill — `billableHours`, not `totalHours`, so a
Soft Cap Rule cap (§8) is reflected here too. An invoice with no matching
timesheets (e.g. raised manually via `POST /api/invoices`) still renders, just
without the breakdown table.

---

## 12. CORS

Configured for `http://localhost:3000` and `http://localhost:5173` by default,
with credentials allowed. Wildcards are deliberately not used. If your dev
server runs elsewhere, ask the backend to start with:

```
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

A CORS failure looks like a network error in the browser, not a `4xx` — check
the console before assuming the API is down.

---

## 13. Local test accounts

Available when the backend runs with the `dev` profile. **Every account uses
the password `Password123!`.** 21 users in total: 1 admin, 2 HR managers, 4
managers (one per team), 2 project managers, and 12 workers.

| Email | Name | Role | Notes |
| --- | --- | --- | --- |
| `admin@example.com` | System Admin | `SYSTEM_ADMIN` | the only admin |
| `hr@example.com` | Anita Sharma | `HR_MANAGER` | onboards/offboards |
| `hr2@example.com` | Marcus Webb | `HR_MANAGER` | onboards/offboards |
| `manager@example.com` | David Miller | `MANAGER` | Backend Engineering — Website Migration, Payments Platform |
| `manager2@example.com` | Sarah Chen | `MANAGER` | Frontend Engineering — Design System Program, Customer Portal Revamp |
| `manager3@example.com` | Michael Torres | `MANAGER` | Data & Analytics — Analytics Warehouse Migration, Realtime Dashboards |
| `manager4@example.com` | Elena Rodriguez | `MANAGER` | Mobile Engineering — Mobile App v2, Offline Sync Module |
| `pm@example.com` | Priya Menon | `PROJECT_MANAGER` | approves David's and Sarah's invoices |
| `pm2@example.com` | James Anderson | `PROJECT_MANAGER` | approved Sarah's Customer Portal invoice (rejected it, see below) |

**Workers** (all password `Password123!`), by team:

| Email | Name | Team | Type | Rate | Status |
| --- | --- | --- | --- | --- | --- |
| `john@example.com` | John Carter | Backend | `CONTRACTOR` | `EMP-1001`, $50.00/hr | `ACTIVE` |
| `david@example.com` | David Kumar | Backend | `EMPLOYEE` | `EMP-1002`, $65.00/hr | `ACTIVE` |
| `kevin@example.com` | Kevin Zhao | Backend | `EMPLOYEE` | `EMP-1004`, $60.00/hr | `ACTIVE`, idle (no timesheets) |
| `rahul@example.com` | Rahul Nair | Frontend | `EMPLOYEE` | `EMP-1003`, $45.00/hr | `ACTIVE` |
| `lisa@example.com` | Lisa Wong | Frontend | `CONTRACTOR` | `EMP-1005`, $55.00/hr | `ACTIVE` |
| `omar@example.com` | Omar Farouk | Frontend | `TEMPORARY_WORKER` | `EMP-1006`, $35.00/hr | `INACTIVE` |
| `nina@example.com` | Nina Patel | Data & Analytics | `EMPLOYEE` | `EMP-1007`, $70.00/hr | `ACTIVE` |
| `carlos@example.com` | Carlos Mendez | Data & Analytics | `CONTRACTOR` | `EMP-1008`, $58.00/hr | `ACTIVE` |
| `grace@example.com` | Grace Kim | Data & Analytics | `EMPLOYEE` | `EMP-1009`, $62.00/hr | `OFFBOARDED` |
| `tom@example.com` | Tom Baker | Mobile | `EMPLOYEE` | `EMP-1010`, $52.00/hr | `ACTIVE` |
| `aisha@example.com` | Aisha Bello | Mobile | `CONTRACTOR` | `EMP-1011`, $48.00/hr | `ACTIVE` |
| `yuki@example.com` | Yuki Tanaka | Mobile | `TEMPORARY_WORKER` | `EMP-1012`, $40.00/hr | `ACTIVE`, no timesheets yet |

> David Miller (a manager) and David Kumar (a worker) are two different people.
> Emails are unique; names are not.

**Seeded structure:** 4 teams, 8 contracts (2 per manager), 8 team-owned
assignments (1 per contract). **Timesheets:** a full **submitted** week
(`2026-08-10`–`2026-08-16`, 40 hours) for John, David Kumar, Rahul, Lisa,
Nina, Carlos and Tom, plus one **DRAFT** (partial, 3 days) for Aisha. John and
David Kumar both logged the *same* Website Migration assignment for the same
week — proof that a Team Assignment accepts hours from every teammate.
Kevin, Omar and Grace deliberately have none. The week of `2026-08-17` is
left free everywhere so you can create it live from the UI.

**Invoices**, one of each status: `DRAFT` (Design System Program, $1,800),
`PENDING_APPROVAL` (Payments Platform, $6,400, in Priya's queue),
`APPROVED` (Payments Platform, $6,400, decided by Priya), `REJECTED`
(Customer Portal Revamp, $4,950, decided by James — "Hours exceed the
approved budget for this sprint"). Website Migration and Analytics Warehouse
Migration are left completely un-invoiced on purpose, so
`POST /api/invoices/generate` has real submitted hours to bill live:

- Website Migration → David Miller's token, `projectManagerId` for Priya →
  40h × $50 (John) + 40h × $65 (David Kumar) = **$4,600.00**
- Analytics Warehouse Migration → Michael Torres's token, `projectManagerId`
  for Priya or James → 40h × $70 (Nina) + 40h × $58 (Carlos) = **$5,120.00**

---

## 14. Suggested screen → endpoint map

**Worker**
1. `POST /api/auth/login` → store `accessToken`, branch on `role`
2. `GET /api/workers/me` → profile header, team name
3. `GET /api/assignments/my?status=ACTIVE` → the assignment picker
4. `POST /api/timesheets` → open a week (remember: Monday)
5. `PUT /api/timesheets/{id}/entries` → save draft as they type
6. `POST /api/timesheets/{id}/submit` → freeze the week
7. `GET /api/timesheets/my` → history table

**Manager**
1. `GET /api/manager/teams` → team switcher
2. `GET /api/manager/workers` → roster
3. `GET /api/contracts` → contracts you own, to bill against
4. `POST /api/assignments` (with `allocatedHours`) → open a team assignment against a contract, with a milestone budget
5. `GET /api/manager/timesheets?status=SUBMITTED` → weekly review
6. `GET /api/manager/timesheets?status=NEEDS_REVIEW` → the Soft Cap Rule queue
7. `POST /api/timesheets/{id}/review` → approve the overage or cap it at budget
8. `PATCH /api/assignments/{id}/status` (with `projectManagerId`) → close finished work, auto-invoicing in the same call
9. `POST /api/invoices/generate` → bill the SUBMITTED hours in one step (Milestone Billing), when not done via completion
10. `GET /api/invoices?status=REJECTED` → see what came back and why

**Project Manager**
1. `GET /api/invoices?status=PENDING_APPROVAL` → approval queue
2. `GET /api/invoices/{id}` → review the contract, period and amount
3. `GET /api/invoices/{id}/pdf` → download a formatted copy
4. `POST /api/invoices/{id}/approve` or `POST /api/invoices/{id}/reject` → decide

**HR**
1. `GET /api/hr/workers?status=ACTIVE` → roster
2. `POST /api/workers` → onboarding form
3. `PATCH /api/workers/{id}` → edit details
4. `POST /api/workers/{id}/offboard` → offboarding

**Admin**
1. `GET /api/teams` → org structure
2. `POST /api/teams` → new team
3. `GET /api/workers` → org-wide roster
4. `POST /api/contracts` → new contract, assign the owning manager

---

## 15. Not in this release

Do not build UI for these; the endpoints do not exist:

- general timesheet approval / rejection (timesheets are worker-submitted
  only; the one exception is the narrow Soft Cap Rule review in §8 — invoice
  approval remains a separate, contract-level workflow — see §11)
- leave management, task management, work reassignment
- tracking which timesheets have already been billed (`POST
  /api/invoices/generate` has no "already invoiced" guard — see §11)
- re-submitting a `REJECTED` invoice as a new draft (the manager must raise a
  new invoice)
- user self-registration, password reset, refresh tokens, logout
- deleting workers, teams, assignments, timesheets, contracts or invoices
  (nothing is ever hard-deleted; lifecycle is status-based)
