package com.hackathon.workday.contract.dto;

import java.time.Instant;
import java.time.LocalDate;

/** @param endDate derived from startDate + durationInMonths, never stored */
public record ContractResponse(
		Long id,
		String projectName,
		LocalDate startDate,
		LocalDate endDate,
		Integer durationInMonths,
		Long managerId,
		String managerName,
		Long createdByAdminId,
		String createdByAdminName,
		Instant createdAt,
		Instant updatedAt) {
}
