package com.hackathon.workday.timesheet;

/**
 * MVP 1 has no approval step. SUBMITTED means "the worker has finished entering
 * this week", not "a manager approved it". APPROVED/REJECTED belong to a later
 * MVP and are deliberately absent.
 */
public enum TimesheetStatus {
	DRAFT,
	SUBMITTED
}
