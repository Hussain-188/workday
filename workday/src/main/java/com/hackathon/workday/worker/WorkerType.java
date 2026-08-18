package com.hackathon.workday.worker;

/**
 * How the worker is engaged. Contractors and employees authenticate through the
 * same User identity and differ only by this value.
 */
public enum WorkerType {
	EMPLOYEE,
	CONTRACTOR,
	TEMPORARY_WORKER
}
