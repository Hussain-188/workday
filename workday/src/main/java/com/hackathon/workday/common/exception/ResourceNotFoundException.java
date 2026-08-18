package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException {

	public ResourceNotFoundException(String resource, Object identifier) {
		super(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", resource + " not found: " + identifier);
	}

	public ResourceNotFoundException(String message) {
		super(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", message);
	}
}
