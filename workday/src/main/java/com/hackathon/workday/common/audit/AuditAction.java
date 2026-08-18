package com.hackathon.workday.common.audit;

/** The lifecycle events worth a permanent record in MVP 1. */
public enum AuditAction {
	WORKER_ONBOARDED,
	WORKER_UPDATED,
	WORKER_OFFBOARDED,
	TEAM_CREATED,
	ASSIGNMENT_CREATED,
	ASSIGNMENT_STATUS_CHANGED,
	TIMESHEET_CREATED,
	TIMESHEET_SUBMITTED,
	/** MVP 3 Soft Cap Rule: a submission pushed the team's logged hours past the assignment's budget. */
	TIMESHEET_FLAGGED_FOR_REVIEW,
	/** MVP 3 Soft Cap Rule: a manager approved or capped a NEEDS_REVIEW week. */
	TIMESHEET_REVIEW_RESOLVED,
	CONTRACT_CREATED,
	INVOICE_CREATED,
	INVOICE_SUBMITTED,
	INVOICE_APPROVED,
	INVOICE_REJECTED
}
