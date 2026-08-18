package com.hackathon.workday.common.exception;

import org.springframework.http.HttpStatus;

/**
 * The caller is authenticated but the requested resource does not belong to
 * their scope. Deliberately distinct from {@link ForbiddenOperationException}:
 * this is resource-level ownership, not role-level permission.
 */
public class UnauthorizedAccessException extends ApiException {

	public UnauthorizedAccessException(String message) {
		super(HttpStatus.FORBIDDEN, "UNAUTHORIZED_RESOURCE_ACCESS", message);
	}
}
