# Local setup

No Docker. You need Java 21+ (JDK 25 is what this was built and tested on),
MySQL 8, and the bundled Maven wrapper.

## 1. Create the databases

Two schemas: one for running the app, one that the integration tests wipe on
every run. Never point the tests at `workday` — they truncate every table.

```sql
CREATE DATABASE workday      CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE workday_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

Optionally, a dedicated account instead of root:

```sql
CREATE USER 'workday_app'@'localhost' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON workday.*      TO 'workday_app'@'localhost';
GRANT ALL PRIVILEGES ON workday_test.* TO 'workday_app'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Configure credentials

Nothing is committed. Every value falls back to a local-dev default and is
overridable by environment variable:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | `workday` | application schema |
| `TEST_DB_NAME` | `workday_test` | schema used by integration tests |
| `DB_USERNAME` | `root` | MySQL user |
| `DB_PASSWORD` | *(empty)* | MySQL password |
| `JWT_SECRET` | dev-only literal | HMAC-SHA key, **min 32 characters** |
| `JWT_EXPIRATION_MINUTES` | `480` | token lifetime |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | React dev origins |

PowerShell, for the current session:

```powershell
$env:DB_USERNAME = "workday_app"
$env:DB_PASSWORD = "choose-a-password"
$env:JWT_SECRET  = "a-local-development-secret-at-least-32-chars"
```

The app refuses to start if `JWT_SECRET` is shorter than 32 characters — that
is deliberate, not a bug. **Never deploy anywhere real with the default
secret.**

## 3. Run the migrations

Flyway runs automatically at startup; there is no separate migrate step.
Hibernate is set to `ddl-auto=validate`, so if the entities and the migrated
schema ever disagree, startup fails loudly instead of silently altering tables.

## 4. Start the backend

```powershell
cd workday
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

The `dev` profile seeds the demo organization on first run (see the accounts
table in [api.md](api.md)). It is idempotent — restarting never duplicates
rows, and it skips entirely if the `ACME` organization already exists.

Without `dev`, you get an empty database and will need to insert a first
`SYSTEM_ADMIN` by hand, since there is no self-registration endpoint.

Server: `http://localhost:8080`.

## 5. Verify

```powershell
curl.exe -s -X POST http://localhost:8080/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"Password123!\"}'
```

Then call a protected endpoint with the token you get back:

```powershell
$token = "<paste accessToken>"
curl.exe -s http://localhost:8080/api/workers -H "Authorization: Bearer $token"
```

## 6. Run the tests

```powershell
.\mvnw.cmd test
```

Integration tests run against `workday_test` using the real migrations, so
unique keys, foreign keys and check constraints are exercised exactly as in
production. Each test truncates every table first, so no test depends on
another's leftovers or on the dev seed data.

To run a single suite:

```powershell
.\mvnw.cmd test "-Dtest=AcceptanceScenarioTest"
```

`TimesheetAggregateTest` needs no database at all — the weekly rules live in
the domain object.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Access denied for user` | `DB_USERNAME`/`DB_PASSWORD` not set in this shell |
| `Unknown database 'workday'` | step 1 not run |
| `Schema-validation: missing table` | pointing at a schema Flyway has not migrated |
| `app.jwt.secret must be at least 32 characters` | `JWT_SECRET` too short |
| Browser shows a network error, not a 4xx | your React origin is not in `CORS_ALLOWED_ORIGINS` |
| `401 UNAUTHENTICATED` on every call | missing `Authorization: Bearer` header, or the token expired |
