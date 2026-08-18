-- Milestone Billing (T&M): an Assignment moves from "one worker's own work
-- item" to "a piece of billable work owned by a team", linked to the Contract
-- it is billed against. Every worker on that team may now log hours (via a
-- Timesheet) against it, so a Timesheet must carry its own worker_id instead
-- of inheriting one from a single-worker Assignment.
--
-- This is a breaking schema change with no safe backfill for historical
-- assignments.contract_id (contracts did not exist before assignments did),
-- so it must be run against an empty/fresh database. Drop and recreate your
-- local `workday` and `workday_test` schemas before applying it.

-- 1. Workers bill at their own hourly rate.
ALTER TABLE workers
    ADD COLUMN hourly_rate DECIMAL(8, 2) NOT NULL DEFAULT 0.00;

-- 2. Timesheets: attach the worker directly. Backfilled from the
--    (about to be dropped) assignments.worker_id so no existing week loses
--    its owner in the transition.
ALTER TABLE timesheets
    ADD COLUMN worker_id BIGINT NULL;

UPDATE timesheets t
    JOIN assignments a ON a.id = t.assignment_id
    SET t.worker_id = a.worker_id;

ALTER TABLE timesheets
    MODIFY COLUMN worker_id BIGINT NOT NULL;

ALTER TABLE timesheets
    ADD CONSTRAINT fk_timesheets_worker FOREIGN KEY (worker_id) REFERENCES workers (id);

-- One assignment/week pair used to be exactly one worker; now several team
-- members can each log that same assignment/week, so the worker joins the key.
-- The new key is added *before* the old one is dropped: fk_timesheets_assignment
-- needs some index with assignment_id as its leftmost column at all times, and
-- uk_timesheets_assignment_week is currently the only one providing that —
-- MySQL refuses to drop it out from under the live foreign key otherwise
-- (error 1553).
ALTER TABLE timesheets
    ADD CONSTRAINT uk_timesheets_assignment_worker_week UNIQUE (assignment_id, worker_id, week_start_date);

ALTER TABLE timesheets
    DROP INDEX uk_timesheets_assignment_week;

-- Backs "a worker's own timesheets", now a direct column instead of a join
-- through assignments.worker_id.
CREATE INDEX idx_timesheets_worker ON timesheets (worker_id);

-- 3. Assignments: drop single-worker ownership, gain team ownership (team_id
--    already existed) and a link to the contract being billed.
ALTER TABLE assignments
    DROP FOREIGN KEY fk_assignments_worker;

DROP INDEX idx_assignments_worker_status ON assignments;

ALTER TABLE assignments
    DROP COLUMN worker_id;

ALTER TABLE assignments
    ADD COLUMN contract_id BIGINT NOT NULL;

ALTER TABLE assignments
    ADD CONSTRAINT fk_assignments_contract FOREIGN KEY (contract_id) REFERENCES contracts (id);

-- Invoice generation fetches every assignment for a contract.
CREATE INDEX idx_assignments_contract ON assignments (contract_id);
