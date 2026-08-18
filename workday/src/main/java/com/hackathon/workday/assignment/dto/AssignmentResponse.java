package com.hackathon.workday.assignment.dto;

import com.hackathon.workday.assignment.AssignmentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record AssignmentResponse(
		Long id,
		Long teamId,
		String teamName,
		Long contractId,
		String contractProjectName,
		Long managerId,
		String managerName,
		String title,
		String description,
		LocalDate startDate,
		LocalDate endDate,
		AssignmentStatus status,
		/** MVP 3: the milestone budget the Soft Cap Rule checks against; {@code null} means no cap. */
		BigDecimal allocatedHours,
		Instant createdAt,
		Instant updatedAt) {
}
