package com.hackathon.workday.contract.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * {@code createdByAdminId} is deliberately absent: it is the authenticated
 * caller, never accepted as input.
 *
 * @param managerId a MANAGER-role user in the same organization as the caller
 */
public record CreateContractRequest(
		@NotBlank(message = "projectName is required")
		@Size(max = 200, message = "projectName must not exceed 200 characters")
		String projectName,

		@NotNull(message = "startDate is required")
		LocalDate startDate,

		@NotNull(message = "durationInMonths is required")
		@Min(value = 1, message = "durationInMonths must be at least 1")
		@Max(value = 120, message = "durationInMonths must not exceed 120")
		Integer durationInMonths,

		@NotNull(message = "managerId is required")
		Long managerId) {
}
