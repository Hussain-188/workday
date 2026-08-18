package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/** Entry hours or work dates that the weekly timesheet rules reject. */
public class InvalidTimesheetEntryException extends ApiException {

	public InvalidTimesheetEntryException(String message) {
		super(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_TIMESHEET_ENTRY", message);
	}
}
