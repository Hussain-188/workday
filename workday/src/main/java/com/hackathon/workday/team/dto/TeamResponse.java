package com.hackathon.workday.team.dto;

import com.hackathon.workday.team.TeamStatus;
import java.time.Instant;

public record TeamResponse(
		Long id,
		Long organizationId,
		String name,
		String code,
		String description,
		Long managerId,
		String managerName,
		String managerEmail,
		TeamStatus status,
		Instant createdAt,
		Instant updatedAt) {
}
