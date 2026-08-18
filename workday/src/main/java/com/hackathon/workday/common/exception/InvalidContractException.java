package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/** e.g. a duration or start date that fails the contract's own invariants. */
public class InvalidContractException extends ApiException {

	public InvalidContractException(String message) {
		super(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_CONTRACT", message);
	}
}
