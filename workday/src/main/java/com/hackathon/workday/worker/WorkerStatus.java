package com.hackathon.workday.worker;

/**
 * Lifecycle position. Workers are never physically deleted: offboarding moves
 * them to OFFBOARDED and their historical timesheets stay readable.
 */
public enum WorkerStatus {
	ACTIVE,
	INACTIVE,
	OFFBOARDED
}
