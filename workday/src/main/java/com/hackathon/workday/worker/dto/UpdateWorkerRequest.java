package com.hackathon.workday.worker.dto;

import com.hackathon.workday.worker.WorkerStatus;
import com.hackathon.workday.worker.WorkerType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * PATCH semantics: every field is optional and a null means "leave unchanged".
 * Offboarding is deliberately not reachable from here — it has its own endpoint
 * so the lifecycle transition and its audit record stay explicit.
 */
public record UpdateWorkerRequest(
		@Size(max = 150, message = "name must not exceed 150 characters")
		String name,

		WorkerType workerType,

		LocalDate employmentStartDate,

		LocalDate employmentEndDate,

		Long teamId,

		WorkerStatus status,

		@DecimalMin(value = "0.0", message = "hourlyRate must not be negative")
		BigDecimal hourlyRate) {
}
