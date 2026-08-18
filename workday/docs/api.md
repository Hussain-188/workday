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
| `role` | `SYSTEM_ADMIN`, `HR_MANAGER`, `MANAGER`, `WORKER` |
| `workerType` | `EMPLOYEE`, `CONTRACTOR`, `TEMPORARY_WORKER` |
| Worker `status` | `ACTIVE`, `INACTIVE`, `OFFBOARDED` |
| Team `status` | `ACTIVE`, `INACTIVE` |
| Assignment `status` | `ACTIVE`, `COMPLETED`, `CANCELLED` |
| Timesheet `status` | `DRAFT`, `SUBMITTED` |

> There is **no** `APPROVED` or `REJECTED` timesheet status in MVP 1.
> `SUBMITTED` means "the worker finished entering this week", not "a manager
> approved it". Approval arrives in a later MVP.

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
| `409` | `CONSTRAINT_VIOLATION` | database constraint hit (rare; a race) |
| `409` | `CONCURRENT_MODIFICATION` | someone else changed it; reload and retry |
| `422` | `INVALID_ASSIGNMENT` | assignment business rule broken |
| `422` | `INVALID_TIMESHEET_ENTRY` | hours or work date rejected |
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

| Endpoint | `SYSTEM_ADMIN` | `HR_MANAGER` | `MANAGER` | `WORKER` |
| --- | :-: | :-: | :-: | :-: |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/workers` | ✅ | ✅ | — | — |
| `GET /api/workers` | ✅ org | ✅ org | ✅ own teams | — |
| `GET /api/workers/me` | — | — | — | ✅ self |
| `GET /api/workers/{id}` | ✅ org | ✅ org | ✅ own teams | ✅ self only |
| `PATCH /api/workers/{id}` | ✅ | ✅ | — | — |
| `POST /api/workers/{id}/offboard` | ✅ | ✅ | — | — |
| `POST /api/teams` | ✅ | — | — | — |
| `GET /api/teams` | ✅ org | ✅ org | ✅ own only | — |
| `GET /api/teams/{id}` | ✅ org | ✅ org | ✅ own only | ✅ own team |
| `GET /api/teams/{id}/workers` | ✅ org | ✅ org | ✅ own only | ✅ own team |
| `POST /api/assignments` | ✅ | — | ✅ own teams | — |
| `GET /api/assignments` | ✅ org | ✅ org | ✅ own teams | — |
| `GET /api/assignments/my` | — | — | — | ✅ self |
| `GET /api/assignments/{id}` | ✅ org | ✅ org | ✅ own teams | ✅ self only |
| `PATCH /api/assignments/{id}/status` | ✅ | — | ✅ own teams | — |
| `POST /api/timesheets` | — | — | — | ✅ self |
| `GET /api/timesheets/my` | — | — | — | ✅ self |
| `GET /api/timesheets/{id}` | ✅ org | ✅ org | ✅ own teams | ✅ self only |
| `PUT /api/timesheets/{id}/entries` | — | — | — | ✅ own draft |
| `POST /api/timesheets/{id}/submit` | — | — | — | ✅ own draft |
| `GET /api/manager/*` | ✅ org | — | ✅ own teams | — |
| `GET /api/hr/workers*` | ✅ | ✅ | — | — |

"org" = everything in the caller's organization. "own teams" = only teams where
the caller is the manager. "self" = derived from the JWT.

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
  "teamId": 1
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
  "status": "INACTIVE"
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
returns `403 FORBIDDEN_OPERATION`. `code` must be unique **within the
organization** (`409 DUPLICATE_RESOURCE`).

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

An assignment is the MVP 1 unit of work: a manager makes a worker responsible
for something, and hours are booked against it. It is **not** a task — finer
task management is a later MVP.

### `POST /api/assignments`

Roles: `MANAGER`, `SYSTEM_ADMIN`.

```json
{
  "teamId": 1,
  "workerId": 3,
  "title": "Website Migration",
  "description": "Migrate the legacy marketing site",
  "startDate": "2026-08-03",
  "endDate": null
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `teamId` | yes | `ACTIVE` team in your organization |
| `workerId` | yes | `ACTIVE` worker **already on that team** |
| `title` | yes | ≤ 200 chars |
| `description` | no | ≤ 2000 chars |
| `startDate` | yes | date |
| `endDate` | no | null = open-ended; otherwise ≥ `startDate` |

There is no `managerId` field. The owning manager is taken from your token (or,
for an admin, the team's manager). A supplied one would be ignored.

**Response `201`** — an `AssignmentResponse`:

```json
{
  "id": 7,
  "teamId": 1,
  "teamName": "Backend Engineering",
  "workerId": 3,
  "workerName": "John Carter",
  "employeeCode": "EMP-1001",
  "managerId": 3,
  "managerName": "David Miller",
  "title": "Website Migration",
  "description": "Migrate the legacy marketing site",
  "startDate": "2026-08-03",
  "endDate": null,
  "status": "ACTIVE",
  "createdAt": "2026-08-18T09:20:00.000Z",
  "updatedAt": "2026-08-18T09:20:00.000Z"
}
```

**Errors**

| Status | `code` | Cause |
| --- | --- | --- |
| `403` | `UNAUTHORIZED_RESOURCE_ACCESS` | you do not manage that team |
| `422` | `INVALID_ASSIGNMENT` | worker not on the team |
| `422` | `INVALID_ASSIGNMENT` | worker is `INACTIVE` or `OFFBOARDED` |
| `422` | `INVALID_ASSIGNMENT` | team is not `ACTIVE` |
| `422` | `INVALID_ASSIGNMENT` | `endDate` before `startDate` |

### `GET /api/assignments`

Roles: `MANAGER`, `SYSTEM_ADMIN`, `HR_MANAGER`. Optional `status` filter.
Paginated `AssignmentResponse`, scoped to the caller's teams or organization.

### `GET /api/assignments/my`

Role: `WORKER`. The caller's own assignments, resolved from the token. Optional
`status` filter — pass `status=ACTIVE` to populate a "log time against" picker.

### `GET /api/assignments/{id}`

Any role, ownership-scoped as in the permission table.

### `PATCH /api/assignments/{id}/status`

Roles: `MANAGER` (own teams only), `SYSTEM_ADMIN`.

```json
{ "status": "COMPLETED" }
```

Only an `ACTIVE` assignment can change status; `COMPLETED` and `CANCELLED` are
terminal (`422 INVALID_ASSIGNMENT`). Sending the status it already has is a
no-op and returns `200`. Closed assignments stay fully readable, and their
existing timesheets are untouched — they simply accept no new weeks.

---

## 8. Timesheets

One timesheet = one worker's week against one assignment.

**Rules that will shape your UI:**

1. `weekStartDate` **must be a Monday**. The server derives `weekEndDate` as
   Monday + 6, so weeks always run Monday–Sunday.
2. One timesheet per assignment per week, enforced by a database unique key.
3. Every `workDate` must fall inside that week, and each date at most once.
4. `hours` is `0`–`24` per day.
5. `totalHours` is **always** computed server-side. Never send it; it is
   ignored if you do.
6. `DRAFT` is editable, `SUBMITTED` is frozen. There is no approval step.

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
then sets `status` to `SUBMITTED`.

Errors: `403 UNAUTHORIZED_RESOURCE_ACCESS`,
`409 INVALID_TIMESHEET_STATE` (already submitted).

### `GET /api/timesheets/my`

Role: `WORKER`. The caller's history, newest week first by default. Optional
`status` filter. Still works after the worker is offboarded.

### `GET /api/timesheets/{id}`

Any role, ownership-scoped: the worker who owns it, the manager of its team, or
an admin/HR user in the organization.

---

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

## 10. CORS

Configured for `http://localhost:3000` and `http://localhost:5173` by default,
with credentials allowed. Wildcards are deliberately not used. If your dev
server runs elsewhere, ask the backend to start with:

```
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

A CORS failure looks like a network error in the browser, not a `4xx` — check
the console before assuming the API is down.

---

## 11. Local test accounts

Available when the backend runs with the `dev` profile. **Every account uses
the password `Password123!`.**

| Email | Name | Role | Notes |
| --- | --- | --- | --- |
| `admin@example.com` | System Admin | `SYSTEM_ADMIN` | creates teams |
| `hr@example.com` | Anita Sharma | `HR_MANAGER` | onboards/offboards |
| `manager@example.com` | David Miller | `MANAGER` | manages Backend Engineering |
| `manager2@example.com` | Sarah Chen | `MANAGER` | manages Frontend Engineering |
| `john@example.com` | John Carter | `WORKER` | `CONTRACTOR`, Backend, `EMP-1001` |
| `david@example.com` | David Kumar | `WORKER` | `EMPLOYEE`, Backend, `EMP-1002` |
| `rahul@example.com` | Rahul Nair | `WORKER` | `EMPLOYEE`, Frontend, `EMP-1003` |

> David Miller (a manager) and David Kumar (a worker) are two different people.
> Emails are unique; names are not.

Seeded data: two teams, three active assignments, and one **submitted** week for
John (week of `2026-08-10`, 40 hours). The week of `2026-08-17` is left free so
you can create it from the UI.

---

## 12. Suggested screen → endpoint map

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
3. `POST /api/assignments` → assign work
4. `GET /api/manager/timesheets?status=SUBMITTED` → weekly review
5. `PATCH /api/assignments/{id}/status` → close finished work

**HR**
1. `GET /api/hr/workers?status=ACTIVE` → roster
2. `POST /api/workers` → onboarding form
3. `PATCH /api/workers/{id}` → edit details
4. `POST /api/workers/{id}/offboard` → offboarding

**Admin**
1. `GET /api/teams` → org structure
2. `POST /api/teams` → new team
3. `GET /api/workers` → org-wide roster

---

## 13. Not in MVP 1

Do not build UI for these; the endpoints do not exist:

- timesheet approval / rejection (there is no approver in MVP 1)
- leave management, task management, work reassignment
- billing, milestones, invoices, invoice approval
- user self-registration, password reset, refresh tokens, logout
- deleting workers, teams, assignments or timesheets (nothing is ever
  hard-deleted; lifecycle is status-based)
