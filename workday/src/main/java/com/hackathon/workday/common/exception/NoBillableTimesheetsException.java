package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/** Raised when a Milestone Billing invoice is generated but there is nothing to bill. */
public class NoBillableTimesheetsException extends ApiException {

	public NoBillableTimesheetsException(String message) {
		super(HttpStatus.UNPROCESSABLE_CONTENT, "NO_BILLABLE_TIMESHEETS", message);
	}
}
