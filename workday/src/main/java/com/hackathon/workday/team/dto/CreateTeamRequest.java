package com.hackathon.workday.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * @param code optional; derived from the name when omitted, so a simple form
 *        need not ask for it. Must be unique within the organization.
 * @param managerId a MANAGER-role user in the same organization; the team's
 *        single owner for MVP 1
 */
public record CreateTeamRequest(
		@NotBlank(message = "name is required")
		@Size(max = 150, message = "name must not exceed 150 characters")
		String name,

		@Size(max = 50, message = "code must not exceed 50 characters")
		String code,

		@Size(max = 500, message = "description must not exceed 500 characters")
		String description,

		@NotNull(message = "managerId is required")
		Long managerId) {
}
