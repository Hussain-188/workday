package com.hackathon.workday.common.response;

import java.time.Instant;
import java.util.List;

/**
 * The single error shape returned by every failing endpoint. Stack traces and
 * internal messages never reach this object.
 *
 * @param code a stable, machine-readable identifier the frontend can branch on
 * @param fieldErrors per-field validation failures; empty for non-validation errors
 */
public record ApiError(
		Instant timestamp,
		int status,
		String error,
		String code,
		String message,
		String path,
		List<FieldError> fieldErrors) {

	public record FieldError(String field, String message) {
	}

	public static ApiError of(int status, String error, String code, String message, String path) {
		return new ApiError(Instant.now(), status, error, code, message, path, List.of());
	}
}
