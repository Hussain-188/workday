package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

public class InvalidAssignmentException extends ApiException {

	public InvalidAssignmentException(String message) {
		super(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_ASSIGNMENT", message);
	}
}
