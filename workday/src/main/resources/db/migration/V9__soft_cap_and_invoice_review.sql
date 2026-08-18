-- MVP 3 — Soft Cap Timesheet Review & Automated Invoicing.
--
-- Two column additions, no new tables, per the MVP 3 constraint:
--
-- 1. assignments.allocated_hours: the manager's budget for a milestone, set
--    when the assignment is created. Nullable — an assignment with no budget
--    never triggers the Soft Cap Rule, which keeps every MVP 2 assignment
--    (created before this column existed) behaving exactly as before.
--
-- 2. timesheets.billable_hours: the amount of a timesheet's logged hours that
--    is actually billable. NULL means "same as total_hours" (the normal,
--    unflagged case — most timesheets never touch this column). It is only
--    ever set when a manager resolves a NEEDS_REVIEW week: totalHours if they
--    approve the overage in full, or the assignment's allocated_hours if they
--    cap it. Milestone Billing invoices sum this column instead of
--    total_hours, so a capped overage is never billed.

ALTER TABLE assignments
    ADD COLUMN allocated_hours DECIMAL(6, 2) NULL;

ALTER TABLE timesheets
    ADD COLUMN billable_hours DECIMAL(6, 2) NULL;
