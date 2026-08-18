package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/** One timesheet per assignment per week; this one already exists. */
public class DuplicateTimesheetException extends ApiException {

	public DuplicateTimesheetException(String message) {
		super(HttpStatus.CONFLICT, "DUPLICATE_TIMESHEET", message);
	}
}
