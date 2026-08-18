package com.hackathon.workday.worker.dto;

import com.hackathon.workday.worker.WorkerType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Onboarding payload. Creates the login identity and the employment record
 * together, so it carries fields for both.
 *
 * @param teamId optional at onboarding; a worker may be placed on a team later
 */
public record CreateWorkerRequest(
		@NotBlank(message = "name is required")
		@Size(max = 150, message = "name must not exceed 150 characters")
		String name,

		@NotBlank(message = "email is required")
		@Email(message = "email must be a valid address")
		@Size(max = 255, message = "email must not exceed 255 characters")
		String email,

		@NotBlank(message = "password is required")
		@Size(min = 8, max = 72, message = "password must be between 8 and 72 characters")
		String password,

		@NotBlank(message = "employeeCode is required")
		@Size(max = 50, message = "employeeCode must not exceed 50 characters")
		String employeeCode,

		@NotNull(message = "workerType is required")
		WorkerType workerType,

		@NotNull(message = "employmentStartDate is required")
		LocalDate employmentStartDate,

		Long teamId) {
}
