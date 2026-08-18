package com.hackathon.workday.assignment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * The owning manager is deliberately absent: it is derived from the caller's
 * token (or the team's manager when an admin acts), never accepted as input.
 *
 * @param teamId optional; defaults to the worker's own team. When supplied it
 *        is still validated, so the worker must actually belong to it.
 * @param endDate optional; an open-ended assignment has no end date
 */
public record CreateAssignmentRequest(
		Long teamId,

		@NotNull(message = "workerId is required")
		Long workerId,

		@NotBlank(message = "title is required")
		@Size(max = 200, message = "title must not exceed 200 characters")
		String title,

		@Size(max = 2000, message = "description must not exceed 2000 characters")
		String description,

		@NotNull(message = "startDate is required")
		LocalDate startDate,

		LocalDate endDate) {
}
