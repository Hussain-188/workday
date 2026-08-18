package com.hackathon.workday.assignment.dto;

import com.hackathon.workday.assignment.AssignmentStatus;
import java.time.Instant;
import java.time.LocalDate;

public record AssignmentResponse(
		Long id,
		Long teamId,
		String teamName,
		Long workerId,
		String workerName,
		String employeeCode,
		Long managerId,
		String managerName,
		String title,
		String description,
		LocalDate startDate,
		LocalDate endDate,
		AssignmentStatus status,
		Instant createdAt,
		Instant updatedAt) {
}
