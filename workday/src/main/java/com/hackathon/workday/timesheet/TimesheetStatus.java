package com.hackathon.workday.timesheet;

/**
 * MVP 1 has no approval step: SUBMITTED means "the worker has finished
 * entering this week", not "a manager approved it".
 *
 * <p>MVP 3 adds one exception to that rule — the Soft Cap Rule. A submission
 * that pushes the team's total logged hours on an assignment past its
 * {@code allocated_hours} budget lands in {@link #NEEDS_REVIEW} instead of
 * {@link #SUBMITTED}. A manager resolves it (approve the overage, or cap
 * billable hours at the budget), which returns it to SUBMITTED so it is
 * picked up by the next Milestone Billing invoice. There is still no
 * APPROVED/REJECTED terminal state — NEEDS_REVIEW is a detour, not a gate.
 */
public enum TimesheetStatus {
	DRAFT,
	SUBMITTED,
	NEEDS_REVIEW
}
