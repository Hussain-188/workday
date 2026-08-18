package com.hackathon.workday.timesheet.dto;

import com.hackathon.workday.timesheet.TimesheetStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * @param totalHours always server-calculated from {@code entries}
 * @param billableHours MVP 3: the hours Milestone Billing will charge for —
 *        equal to {@code totalHours} unless a manager capped a NEEDS_REVIEW
 *        week at the assignment's budget
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
		BigDecimal billableHours,
		TimesheetStatus status,
		List<TimesheetEntryResponse> entries,
		Long version,
		Instant createdAt,
		Instant updatedAt) {
}
