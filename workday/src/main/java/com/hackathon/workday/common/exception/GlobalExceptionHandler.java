package com.hackathon.workday.common.exception;

import com.hackathon.workday.common.response.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Turns every failure into the single {@link ApiError} shape. Nothing internal
 * (stack traces, SQL, class names) is ever written to a response body.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	/** Every deliberate business error carries its own status and code. */
	@ExceptionHandler(ApiException.class)
	public ResponseEntity<ApiError> handleApiException(ApiException ex, HttpServletRequest request) {
		return build(ex.getStatus(), ex.getCode(), ex.getMessage(), request, List.of());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiError> handleBodyValidation(
			MethodArgumentNotValidException ex, HttpServletRequest request) {
		List<ApiError.FieldError> fields = ex.getBindingResult().getFieldErrors().stream()
				.map(error -> new ApiError.FieldError(error.getField(), error.getDefaultMessage()))
				.toList();
		return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed", request, fields);
	}

	/** Validation on @RequestParam / @PathVariable arguments. */
	@ExceptionHandler(HandlerMethodValidationException.class)
	public ResponseEntity<ApiError> handleParameterValidation(
			HandlerMethodValidationException ex, HttpServletRequest request) {
		return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed", request, List.of());
	}

	@ExceptionHandler(ConstraintViolationException.class)
	public ResponseEntity<ApiError> handleConstraintViolation(
			ConstraintViolationException ex, HttpServletRequest request) {
		List<ApiError.FieldError> fields = ex.getConstraintViolations().stream()
				.map(violation -> new ApiError.FieldError(
						String.valueOf(violation.getPropertyPath()), violation.getMessage()))
				.toList();
		return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed", request, fields);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiError> handleUnreadableBody(
			HttpMessageNotReadableException ex, HttpServletRequest request) {
		return build(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST",
				"Request body is missing or malformed", request, List.of());
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ApiError> handleTypeMismatch(
			MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
		return build(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER",
				"Parameter '" + ex.getName() + "' has an invalid value", request, List.of());
	}

	@ExceptionHandler(AuthenticationException.class)
	public ResponseEntity<ApiError> handleAuthentication(
			AuthenticationException ex, HttpServletRequest request) {
		return build(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
				"Invalid email or password", request, List.of());
	}

	/** Raised by method security when a role check fails. */
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ApiError> handleAccessDenied(
			AccessDeniedException ex, HttpServletRequest request) {
		return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED",
				"You do not have permission to perform this operation", request, List.of());
	}

	/**
	 * The database constraints are the last line of defence. Services check
	 * these rules first, so reaching here usually means a genuine race.
	 */
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ApiError> handleDataIntegrity(
			DataIntegrityViolationException ex, HttpServletRequest request) {
		log.warn("Database constraint violated on {}", request.getRequestURI(), ex);
		return build(HttpStatus.CONFLICT, "CONSTRAINT_VIOLATION",
				"The request conflicts with existing data", request, List.of());
	}

	@ExceptionHandler(ObjectOptimisticLockingFailureException.class)
	public ResponseEntity<ApiError> handleOptimisticLock(
			ObjectOptimisticLockingFailureException ex, HttpServletRequest request) {
		return build(HttpStatus.CONFLICT, "CONCURRENT_MODIFICATION",
				"This record was modified by another request; reload and try again", request, List.of());
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
		log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex);
		return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
				"An unexpected error occurred", request, List.of());
	}

	private ResponseEntity<ApiError> build(HttpStatus status, String code, String message,
			HttpServletRequest request, List<ApiError.FieldError> fieldErrors) {
		ApiError body = new ApiError(
				Instant.now(),
				status.value(),
				status.getReasonPhrase(),
				code,
				message,
				request.getRequestURI(),
				fieldErrors);
		return ResponseEntity.status(status).body(body);
	}
}
