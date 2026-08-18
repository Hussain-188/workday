package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base for every deliberately thrown business error. Carrying the status and a
 * stable code on the exception keeps the exception handler free of long
 * instanceof chains.
 */
public abstract class ApiException extends RuntimeException {

	private final HttpStatus status;
	private final String code;

	protected ApiException(HttpStatus status, String code, String message) {
		super(message);
		this.status = status;
		this.code = code;
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getCode() {
		return code;
	}
}
