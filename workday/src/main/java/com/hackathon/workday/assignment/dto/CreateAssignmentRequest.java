package com.hackathon.workday.assignment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * The owning manager is deliberately absent: it is derived from the caller's
 * token (or the team's manager when an admin acts), never accepted as input.
 *
 * <p>MVP 2: an assignment is owned by a whole {@code team}, not a single
 * worker — any active worker on that team may later log hours against it.
 * There is no {@code workerId} here any more.
 *
 * @param teamId the team this work is assigned to; every active member may
 *        log hours against it once created
 * @param contractId the contract this work bills against
 * @param endDate optional; an open-ended assignment has no end date
 * @param allocatedHours MVP 3: optional milestone budget. When set, the Soft
 *        Cap Rule flags a submission that pushes the team's total logged
 *        hours past it for the manager's review instead of billing it outright.
 */
public record CreateAssignmentRequest(
		@NotNull(message = "teamId is required")
		Long teamId,

		@NotNull(message = "contractId is required")
		Long contractId,

		@NotBlank(message = "title is required")
		@Size(max = 200, message = "title must not exceed 200 characters")
		String title,

		@Size(max = 2000, message = "description must not exceed 2000 characters")
		String description,

		@NotNull(message = "startDate is required")
		LocalDate startDate,

		LocalDate endDate,

		@DecimalMin(value = "0.01", message = "allocatedHours must be positive when provided")
		BigDecimal allocatedHours) {
}
