package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/** The worker's lifecycle status does not permit the requested transition. */
public class InvalidWorkerStateException extends ApiException {

	public InvalidWorkerStateException(String message) {
		super(HttpStatus.CONFLICT, "INVALID_WORKER_STATE", message);
	}
}
