package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/** e.g. attempting to edit or resubmit a timesheet that is already SUBMITTED. */
public class InvalidTimesheetStateException extends ApiException {

	public InvalidTimesheetStateException(String message) {
		super(HttpStatus.CONFLICT, "INVALID_TIMESHEET_STATE", message);
	}
}
