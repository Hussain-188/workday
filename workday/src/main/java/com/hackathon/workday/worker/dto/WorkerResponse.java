package com.hackathon.workday.worker.dto;

import com.hackathon.workday.worker.WorkerStatus;
import com.hackathon.workday.worker.WorkerType;
import java.time.Instant;
import java.time.LocalDate;

/** Flattens the Worker/User pair the frontend thinks of as one person. */
public record WorkerResponse(
		Long id,
		Long userId,
		String name,
		String email,
		String employeeCode,
		WorkerType workerType,
		LocalDate employmentStartDate,
		LocalDate employmentEndDate,
		WorkerStatus status,
		Long teamId,
		String teamName,
		Long organizationId,
		Instant createdAt,
		Instant updatedAt) {
}
