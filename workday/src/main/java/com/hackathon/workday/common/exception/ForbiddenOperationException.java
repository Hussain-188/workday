package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/** The caller is authenticated but not permitted to perform this operation. */
public class ForbiddenOperationException extends ApiException {

	public ForbiddenOperationException(String message) {
		super(HttpStatus.FORBIDDEN, "FORBIDDEN_OPERATION", message);
	}
}
