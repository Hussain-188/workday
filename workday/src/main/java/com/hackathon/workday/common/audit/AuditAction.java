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
	TIMESHEET_SUBMITTED
}
