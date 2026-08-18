package com.hackathon.workday.timesheet.dto;

import com.hackathon.workday.timesheet.TimesheetStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * @param totalHours always server-calculated from {@code entries}
 * @param version optimistic-lock token; send nothing back, it is informational
 */
public record TimesheetResponse(
		Long id,
		Long assignmentId,
		String assignmentTitle,
		Long workerId,
		String workerName,
		Long teamId,
		String teamName,
		LocalDate weekStartDate,
		LocalDate weekEndDate,
		BigDecimal totalHours,
		TimesheetStatus status,
		List<TimesheetEntryResponse> entries,
		Long version,
		Instant createdAt,
		Instant updatedAt) {
}
